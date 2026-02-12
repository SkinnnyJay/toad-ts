import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import { HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";
import { getRulesState } from "@/rules/rules-service";
import type { ConnectionStatus } from "@/types/domain";
import type {
  AuthenticateRequest,
  AuthenticateResponse,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SessionNotification,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";
import { PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

export type CursorCliHarnessAdapterEvents = HarnessRuntimeEvents;

export interface CursorCliHarnessAdapterOptions {
  connection?: CursorCliConnection;
  translator?: CursorToAcpTranslator;
  hookIpcServer?: HookIpcServer;
  hooksConfigGenerator?: HooksConfigGenerator;
  config?: HarnessConfig;
}

export class CursorCliHarnessAdapter
  extends EventEmitter<CursorCliHarnessAdapterEvents>
  implements HarnessRuntime
{
  private connectionStatusValue: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private readonly connection: CursorCliConnection;
  private readonly translator: CursorToAcpTranslator;
  private readonly hookIpcServer: HookIpcServer;
  private readonly hooksConfigGenerator: HooksConfigGenerator;
  private readonly sessionModelById = new Map<string, string>();
  private restoreHooks: (() => Promise<void>) | null = null;
  private promptInFlight = false;

  public constructor(options: CursorCliHarnessAdapterOptions = {}) {
    super();
    this.connection =
      options.connection ??
      new CursorCliConnection({
        command: options.config?.command,
        args: options.config?.args,
        cwd: options.config?.cwd,
        env: options.config?.env,
      });
    this.translator = options.translator ?? new CursorToAcpTranslator();
    this.hookIpcServer = options.hookIpcServer ?? new HookIpcServer();
    this.hooksConfigGenerator =
      options.hooksConfigGenerator ??
      new HooksConfigGenerator({
        projectRoot: options.config?.cwd ?? process.cwd(),
      });

    this.connection.on("streamEvent", (event) => this.translator.handleEvent(event));
    this.connection.on("parseError", ({ reason }) => {
      this.emit("error", new Error(`Cursor parse error: ${reason}`));
    });
    this.connection.on("processExit", ({ code }) => {
      if (code !== 0) {
        this.emit("error", new Error(`Cursor process exited with code ${code}`));
      }
    });

    this.translator.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.translator.on("error", (error) => this.emit("error", error));
  }

  public get connectionStatus(): ConnectionStatus {
    return this.connectionStatusValue;
  }

  public async connect(): Promise<void> {
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    const installInfo = await this.connection.verifyInstallation();
    if (!installInfo.installed) {
      this.setConnectionStatus(CONNECTION_STATUS.ERROR);
      throw new Error(
        `Cursor CLI binary '${installInfo.binaryName}' not found. Install cursor-agent or set ${ENV_KEY.TOADSTOOL_CURSOR_COMMAND}.`
      );
    }

    this.hookIpcServer.setHandlers({
      permissionRequest: async () => ({ decision: PERMISSION.ALLOW }),
      contextInjection: async () => {
        const rules = getRulesState().rules;
        if (rules.length === 0) {
          return {};
        }
        const additionalContext = rules.map((rule) => rule.content).join("\n\n");
        return { additional_context: additionalContext };
      },
      continuation: async () => ({}),
    });

    const endpoint = await this.hookIpcServer.start();
    const hookEnv = this.hooksConfigGenerator.createHookEnv(endpoint);
    this.connection.setEnv(hookEnv);
    const installResult = await this.hooksConfigGenerator.install(endpoint);
    this.restoreHooks = installResult.restore;
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTED);
  }

  public async disconnect(): Promise<void> {
    await this.connection.disconnect();
    await this.hookIpcServer.stop();
    if (this.restoreHooks) {
      await this.restoreHooks();
      this.restoreHooks = null;
    }
    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  public async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return {
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  public async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    const sessionId = await this.connection.createChat();
    return { sessionId };
  }

  public async setSessionMode(_params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    return {};
  }

  public async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    this.sessionModelById.set(params.sessionId, params.modelId);
    return {};
  }

  public async prompt(params: PromptRequest): Promise<PromptResponse> {
    if (this.promptInFlight) {
      throw new Error("Cursor prompt already in progress for this harness instance.");
    }
    this.promptInFlight = true;
    try {
      const promptText = this.extractPromptText(params);
      const model = this.sessionModelById.get(params.sessionId);
      const result = await this.connection.runPrompt({
        message: promptText,
        sessionId: params.sessionId,
        model,
      });
      if (result.sessionId && result.sessionId !== params.sessionId) {
        this.emit("sessionUpdate", {
          sessionId: result.sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.SESSION_INFO_UPDATE,
          },
        });
      }
      return {
        stopReason: "end_turn",
      };
    } finally {
      this.promptInFlight = false;
    }
  }

  public async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    const authStatus = await this.connection.verifyAuth();
    if (!authStatus.authenticated) {
      throw new Error(
        `Cursor authentication required. Run 'cursor-agent login' or set ${ENV_KEY.CURSOR_API_KEY}.`
      );
    }
    return {};
  }

  public async sessionUpdate(_params: SessionNotification): Promise<void> {
    // Cursor CLI is source-of-truth for session updates; no-op.
  }

  private extractPromptText(params: PromptRequest): string {
    const textBlock = params.prompt.find((block) => block.type === "text");
    if (!textBlock) {
      return "";
    }
    return textBlock.text;
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatusValue = status;
    this.emit("state", status);
  }
}

export const createCursorCliHarnessRuntime = (config: HarnessConfig): HarnessRuntime => {
  return new CursorCliHarnessAdapter({ config });
};

export const cursorCliHarnessAdapter: HarnessAdapter = {
  id: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
  configSchema: harnessConfigSchema,
  createHarness: (config) => createCursorCliHarnessRuntime(config),
};

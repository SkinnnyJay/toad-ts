import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import { createCliHarnessAdapter } from "@/core/cli-agent/create-cli-harness-adapter";
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
import type { CursorHookInput } from "@/types/cursor-hooks.types";
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

export type CursorCliHarnessAdapterEvents = HarnessRuntimeEvents;

export interface CursorCliHarnessAdapterOptions {
  connection?: CursorCliConnection;
  translator?: CursorToAcpTranslator;
  hookIpcServer?: HookIpcServer;
  hooksConfigGenerator?: HooksConfigGenerator;
  config?: HarnessConfig;
}

export class CursorCliHarnessAdapter extends CliAgentBase implements HarnessRuntime {
  private readonly connection: CursorCliConnection;
  private readonly translator: CursorToAcpTranslator;
  private readonly hookIpcServer: HookIpcServer;
  private readonly hooksConfigGenerator: HooksConfigGenerator;
  private readonly sessionModelById = new Map<string, string>();
  private restoreHooks: (() => Promise<void>) | null = null;

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
      routeHandlers: {
        [CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT]: async ({ payload }) =>
          this.handleAfterAgentThought(payload),
        [CURSOR_HOOK_EVENT.AFTER_FILE_EDIT]: async ({ payload }) =>
          this.handleAfterFileEdit(payload),
      },
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
    return this.withPromptGuard(async () => {
      const promptText = this.extractPromptText(params);
      const model = this.sessionModelById.get(params.sessionId);
      const result = await this.connection.runPrompt({
        message: promptText,
        sessionId: params.sessionId,
        model,
        force: false,
        streaming: true,
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
    });
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

  private resolveHookSessionId(payload: CursorHookInput): string {
    return payload.session_id ?? payload.conversation_id;
  }

  private async handleAfterAgentThought(
    payload: CursorHookInput
  ): Promise<Record<string, unknown>> {
    if (payload.hook_event_name !== CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT) {
      return {};
    }

    const thought = this.getStringField(payload, "thought")?.trim();
    if (!thought) {
      return {};
    }

    this.emit("sessionUpdate", {
      sessionId: this.resolveHookSessionId(payload),
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK,
        content: {
          type: CONTENT_BLOCK_TYPE.TEXT,
          text: thought,
        },
      },
    });
    return {};
  }

  private async handleAfterFileEdit(payload: CursorHookInput): Promise<Record<string, unknown>> {
    if (payload.hook_event_name !== CURSOR_HOOK_EVENT.AFTER_FILE_EDIT) {
      return {};
    }

    const sessionId = this.resolveHookSessionId(payload);
    const edits = this.getRecordArrayField(payload, "edits");
    for (const [index, edit] of edits.entries()) {
      const callId = `cursor-after-file-edit-${payload.generation_id}-${index}`;
      const record = this.parseEditRecord(edit);
      if (!record) {
        continue;
      }
      const title = record.path ? `edit_file:${record.path}` : "edit_file";
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
          toolCallId: callId,
          title,
          rawInput: record,
          status: "in_progress",
        },
      });
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
          toolCallId: callId,
          rawOutput: {
            source: "afterFileEdit",
            path: record.path ?? this.getStringField(payload, "path"),
          },
          status: "completed",
        },
      });
    }
    return {};
  }

  private parseEditRecord(
    edit: unknown
  ): { path?: string; old_string?: string; new_string?: string } | null {
    if (!edit || typeof edit !== "object" || Array.isArray(edit)) {
      return null;
    }
    const entries = Object.entries(edit);
    const record: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      record[key] = value;
    }
    const path = typeof record.path === "string" ? record.path : undefined;
    const oldString = typeof record.old_string === "string" ? record.old_string : undefined;
    const newString = typeof record.new_string === "string" ? record.new_string : undefined;
    return {
      ...(path ? { path } : {}),
      ...(oldString !== undefined ? { old_string: oldString } : {}),
      ...(newString !== undefined ? { new_string: newString } : {}),
    };
  }

  private getStringField(payload: CursorHookInput, key: string): string | undefined {
    const record = this.toRecord(payload);
    if (!record) {
      return undefined;
    }
    const value = record[key];
    return typeof value === "string" ? value : undefined;
  }

  private getRecordArrayField(payload: CursorHookInput, key: string): Record<string, unknown>[] {
    const record = this.toRecord(payload);
    if (!record) {
      return [];
    }
    const value = record[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) => this.toRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      record[key] = entry;
    }
    return record;
  }
}

export const createCursorCliHarnessRuntime = (config: HarnessConfig): HarnessRuntime => {
  return new CursorCliHarnessAdapter({ config });
};

export const cursorCliHarnessAdapter: HarnessAdapter = createCliHarnessAdapter({
  id: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
  configSchema: harnessConfigSchema,
  createRuntime: (config) => createCursorCliHarnessRuntime(config),
});

import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { ALLOW_ONCE, REJECT_ONCE } from "@/constants/permission-option-kinds";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { SIGNAL } from "@/constants/signals";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import {
  type CliHarnessAdapter,
  createCliHarnessAdapter,
} from "@/core/cli-agent/create-cli-harness-adapter";
import { CursorCliAgentPort } from "@/core/cursor/cursor-cli-agent-port";
import {
  CursorCliConnection,
  type CursorPromptRequest,
  type CursorPromptResult,
} from "@/core/cursor/cursor-cli-connection";
import {
  asNonEmptyString,
  mapCursorPermissionRequestMetadata,
  normalizeCursorFileEdits,
} from "@/core/cursor/cursor-hook-utils";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import type {
  CursorHookIpcAddress,
  CursorHookPermissionRequest,
} from "@/core/cursor/hook-ipc-server";
import { CursorHookIpcServer } from "@/core/cursor/hook-ipc-server";
import {
  type CursorHookInstallation,
  cleanupCursorHooks,
  injectHookSocketEnv,
  installCursorHooks,
} from "@/core/cursor/hooks-config-generator";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { AgentManagementSession } from "@/types/agent-management.types";
import type { CursorHookInput } from "@/types/cursor-hooks.types";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
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
import type { EventEmitter } from "eventemitter3";

interface CursorCliConnectionLike
  extends EventEmitter<{
    event: (event: Parameters<CursorToAcpTranslator["translate"]>[0]) => void;
    stderr: (chunk: string) => void;
    error: (error: Error) => void;
    exit: (info: { code: number | null; signal: NodeJS.Signals | null }) => void;
  }> {
  verifyInstallation(): Promise<{ installed: boolean; version?: string }>;
  verifyAuth(): Promise<{ authenticated: boolean }>;
  listModels(): Promise<{ models: Array<{ id: string; name: string }>; defaultModel?: string }>;
  listSessions(): Promise<string[]>;
  createChat(): Promise<string>;
  spawnPrompt(request: CursorPromptRequest): Promise<CursorPromptResult>;
  runManagementCommand(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  disconnect(): Promise<void>;
}

interface CursorHookIpcServerLike {
  start(): Promise<CursorHookIpcAddress>;
  stop(): Promise<void>;
  on(event: "error", fn: (error: Error) => void): this;
  on(event: "hookEvent", fn: (event: CursorHookInput) => void): this;
  on(event: "permissionRequest", fn: (request: CursorHookPermissionRequest) => void): this;
}

type InstallHooksFn = (
  options: Parameters<typeof installCursorHooks>[0]
) => Promise<CursorHookInstallation>;
type CleanupHooksFn = (installation: CursorHookInstallation) => Promise<void>;

const CURSOR_AUTH_REQUIRED_ERROR =
  "Cursor CLI is not authenticated. Run `cursor-agent login` or set CURSOR_API_KEY.";

export type CursorCliHarnessAdapterEvents = HarnessRuntimeEvents;

export interface CursorCliHarnessAdapterOptions {
  connection?: CursorCliConnectionLike;
  translator?: CursorToAcpTranslator;
  hookServer?: CursorHookIpcServerLike;
  installHooksFn?: InstallHooksFn;
  cleanupHooksFn?: CleanupHooksFn;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export class CursorCliHarnessAdapter extends CliAgentBase implements HarnessRuntime {
  private readonly logger = createClassLogger("CursorCliHarnessAdapter");
  private readonly connection: CursorCliConnectionLike;
  private readonly translator: CursorToAcpTranslator;
  private readonly hookServer: CursorHookIpcServerLike;
  private readonly installHooksFn: InstallHooksFn;
  private readonly cleanupHooksFn: CleanupHooksFn;
  private readonly coreHarness: CliHarnessAdapter;
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private hookAddress: CursorHookIpcAddress | null = null;
  private hookInstallation: CursorHookInstallation | null = null;
  private signalHandlersInstalled = false;
  private readonly hookToolCallByKey = new Map<string, string>();

  constructor(options: CursorCliHarnessAdapterOptions = {}) {
    super();
    this.cwd = options.cwd ?? process.cwd();
    this.env = { ...EnvManager.getInstance().getSnapshot(), ...options.env };
    this.connection =
      options.connection ??
      new CursorCliConnection({
        command: options.command ?? HARNESS_DEFAULT.CURSOR_COMMAND,
        baseArgs: options.args ?? [],
        cwd: this.cwd,
        env: this.env,
      });
    this.translator = options.translator ?? new CursorToAcpTranslator();
    this.hookServer =
      options.hookServer ??
      new CursorHookIpcServer({
        permissionTimeoutDecision: "allow",
      });
    this.coreHarness = createCliHarnessAdapter({
      cliAgent: new CursorCliAgentPort({
        connection: this.connection,
        getPromptEnvOverrides: () => this.getHookSocketEnvOverrides(),
        isApiKeyConfigured: () => Boolean(this.env[ENV_KEY.CURSOR_API_KEY]),
      }),
      unauthenticatedErrorMessage: CURSOR_AUTH_REQUIRED_ERROR,
    });
    this.installHooksFn = options.installHooksFn ?? installCursorHooks;
    this.cleanupHooksFn = options.cleanupHooksFn ?? cleanupCursorHooks;

    this.connection.on("event", (event) => this.translator.translate(event));
    this.connection.on("stderr", (chunk) => {
      if (chunk.trim().length > 0) {
        this.logger.debug("Cursor CLI stderr", { chunk });
      }
    });
    this.connection.on("error", (error) => this.emit("error", error));
    this.connection.on("exit", ({ code, signal }) => {
      if (code !== null && code !== 0) {
        this.emit(
          "error",
          new Error(`Cursor CLI exited with code ${code}${signal ? ` (${signal})` : ""}`)
        );
      }
    });

    this.translator.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.translator.on("error", (error) => this.emit("error", error));

    this.coreHarness.on("error", (error) => this.emit("error", error));
    this.coreHarness.on("permissionRequest", (request) => this.emit("permissionRequest", request));

    this.hookServer.on("error", (error) => this.emit("error", error));
    this.hookServer.on("hookEvent", (event) => this.handleHookEvent(event));
    this.hookServer.on("permissionRequest", (request) => this.handlePermissionRequest(request));
  }

  async connect(): Promise<void> {
    if (
      this.connectionStatus === CONNECTION_STATUS.CONNECTED ||
      this.connectionStatus === CONNECTION_STATUS.CONNECTING
    ) {
      return;
    }
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    try {
      await this.coreHarness.connect();

      this.hookAddress = await this.hookServer.start();
      const hookSocketTarget = this.hookAddress.url ?? this.hookAddress.socketPath;
      if (!hookSocketTarget) {
        throw new Error("Hook IPC server started without a socket target.");
      }
      this.hookInstallation = await this.installHooksFn({
        scope: "project",
        cwd: this.cwd,
        socketTarget: hookSocketTarget,
        useBashShim: this.hookAddress.transport === "http",
      });

      this.installSignalHandlers();
      this.setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    } catch (error) {
      await this.coreHarness.disconnect().catch(() => undefined);
      this.removeSignalHandlers();
      if (this.hookInstallation) {
        await this.cleanupHooksFn(this.hookInstallation).catch(() => undefined);
        this.hookInstallation = null;
      }
      if (this.hookAddress) {
        await this.hookServer.stop().catch(() => undefined);
        this.hookAddress = null;
      }
      this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.coreHarness.disconnect();
    } finally {
      try {
        await this.hookServer.stop();
      } finally {
        if (this.hookInstallation) {
          await this.cleanupHooksFn(this.hookInstallation);
          this.hookInstallation = null;
        }
        this.hookAddress = null;
        this.removeSignalHandlers();
        this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      }
    }
  }

  async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return {
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    return this.coreHarness.newSession(_params);
  }

  async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return this.coreHarness.authenticate(_params);
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.coreHarness.prompt(params);
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {
    // Cursor runtime is source-of-truth for session updates; incoming updates are ignored.
  }

  async runAgentCommand(args: string[]): Promise<AgentManagementCommandResult> {
    return this.coreHarness.runAgentCommand(args);
  }

  async listAgentSessions(): Promise<AgentManagementSession[]> {
    return this.coreHarness.listAgentSessions();
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    return this.coreHarness.setSessionMode(params);
  }

  async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    return this.coreHarness.setSessionModel(params);
  }

  private installSignalHandlers(): void {
    if (this.signalHandlersInstalled) {
      return;
    }
    process.on(SIGNAL.SIGTERM, this.handleShutdownSignal);
    process.on(SIGNAL.SIGINT, this.handleShutdownSignal);
    this.signalHandlersInstalled = true;
  }

  private removeSignalHandlers(): void {
    if (!this.signalHandlersInstalled) {
      return;
    }
    process.off(SIGNAL.SIGTERM, this.handleShutdownSignal);
    process.off(SIGNAL.SIGINT, this.handleShutdownSignal);
    this.signalHandlersInstalled = false;
  }

  private readonly handleShutdownSignal = (): void => {
    void this.disconnect().catch((error) => {
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
    });
  };

  private handleHookEvent(event: CursorHookInput): void {
    const sessionId = event.conversation_id;
    switch (event.hook_event_name) {
      case CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT: {
        const thought = asNonEmptyString(event.thought);
        if (!thought) {
          return;
        }
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK,
            content: { type: CONTENT_BLOCK_TYPE.TEXT, text: thought },
          },
        });
        return;
      }
      case CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION: {
        const command = asNonEmptyString(event.command);
        if (!command) {
          return;
        }
        const toolCallId = this.getOrCreateHookToolCallId(sessionId, `shell:${command}`);
        const status = event.exit_code === 0 ? "completed" : "failed";
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId,
            title: `Shell: ${command}`,
            rawOutput: {
              exitCode: event.exit_code,
              stdout: event.stdout,
              stderr: event.stderr,
            },
            status,
          },
        });
        return;
      }
      case CURSOR_HOOK_EVENT.AFTER_MCP_EXECUTION: {
        const serverName = asNonEmptyString(event.server_name) ?? "mcp";
        const toolName = asNonEmptyString(event.tool_name) ?? "tool";
        const toolCallId = this.getOrCreateHookToolCallId(
          sessionId,
          `mcp:${serverName}:${toolName}`
        );
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId,
            title: `MCP: ${serverName}/${toolName}`,
            rawOutput: event.tool_output,
            status: "completed",
          },
        });
        return;
      }
      case CURSOR_HOOK_EVENT.POST_TOOL_USE: {
        const toolName = asNonEmptyString(event.tool_name) ?? "tool";
        const toolCallId = this.getOrCreateHookToolCallId(sessionId, `tool:${toolName}`);
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId,
            title: toolName,
            rawOutput: event.tool_output,
            status: "completed",
          },
        });
        return;
      }
      case CURSOR_HOOK_EVENT.POST_TOOL_USE_FAILURE: {
        const toolName = asNonEmptyString(event.tool_name) ?? "tool";
        const toolCallId = this.getOrCreateHookToolCallId(sessionId, `tool:${toolName}`);
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId,
            title: toolName,
            rawOutput: {
              error: asNonEmptyString(event.error),
            },
            status: "failed",
          },
        });
        return;
      }
      case CURSOR_HOOK_EVENT.AFTER_FILE_EDIT: {
        const pathLabel = asNonEmptyString(event.path) ?? "unknown";
        const toolCallId = this.getOrCreateHookToolCallId(sessionId, `edit:${pathLabel}`);
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId,
            title: `File edit: ${pathLabel}`,
            rawOutput: {
              path: asNonEmptyString(event.path),
              edits: normalizeCursorFileEdits(event.edits, asNonEmptyString(event.path)),
            },
            status: "completed",
          },
        });
        return;
      }
      default:
        return;
    }
  }

  private handlePermissionRequest(request: CursorHookPermissionRequest): void {
    const sessionId = request.event.conversation_id;
    const permissionMetadata = mapCursorPermissionRequestMetadata(request.event);
    const toolCallId = this.getOrCreateHookToolCallId(sessionId, permissionMetadata.toolCallKey);

    this.emit("sessionUpdate", {
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
        toolCallId,
        title: permissionMetadata.title,
        rawInput: permissionMetadata.input,
      },
    });

    this.emit("permissionRequest", {
      sessionId,
      toolCall: {
        toolCallId,
        kind: permissionMetadata.kind,
      },
      options: [
        { optionId: ALLOW_ONCE, kind: ALLOW_ONCE, name: "Allow once" },
        { optionId: REJECT_ONCE, kind: REJECT_ONCE, name: "Reject once" },
      ],
    });
  }

  private getOrCreateHookToolCallId(sessionId: string, key: string): string {
    const cacheKey = `${sessionId}:${key}`;
    const existing = this.hookToolCallByKey.get(cacheKey);
    if (existing) {
      return existing;
    }
    const created = `hook-${sessionId}-${this.hookToolCallByKey.size + 1}`;
    this.hookToolCallByKey.set(cacheKey, created);
    return created;
  }

  private getHookSocketEnvOverrides(): NodeJS.ProcessEnv | undefined {
    const hookSocketTarget = this.hookAddress?.url ?? this.hookAddress?.socketPath;
    if (!hookSocketTarget) {
      return undefined;
    }
    return injectHookSocketEnv({}, hookSocketTarget);
  }
}

export const createCursorCliHarnessRuntime = (config: HarnessConfig): HarnessRuntime => {
  const env = { ...EnvManager.getInstance().getSnapshot(), ...config.env };
  return new CursorCliHarnessAdapter({
    command: config.command,
    args: config.args,
    cwd: config.cwd,
    env,
  });
};

export const cursorCliHarnessAdapter: HarnessAdapter = {
  id: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
  configSchema: harnessConfigSchema,
  createHarness: (config) => createCursorCliHarnessRuntime(config),
};

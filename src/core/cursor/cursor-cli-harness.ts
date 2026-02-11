import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { SIGNAL } from "@/constants/signals";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import {
  CursorCliConnection,
  type CursorPromptRequest,
  type CursorPromptResult,
} from "@/core/cursor/cursor-cli-connection";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import type { CursorHookIpcAddress } from "@/core/cursor/hook-ipc-server";
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
}

type InstallHooksFn = (
  options: Parameters<typeof installCursorHooks>[0]
) => Promise<CursorHookInstallation>;
type CleanupHooksFn = (installation: CursorHookInstallation) => Promise<void>;

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

    this.hookServer.on("error", (error) => this.emit("error", error));
    this.hookServer.on("hookEvent", (event) => this.handleHookEvent(event));
  }

  async connect(): Promise<void> {
    if (
      this.connectionStatus === CONNECTION_STATUS.CONNECTED ||
      this.connectionStatus === CONNECTION_STATUS.CONNECTING
    ) {
      return;
    }
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING);

    const installInfo = await this.connection.verifyInstallation();
    if (!installInfo.installed) {
      throw new Error("Cursor CLI is not installed. Install cursor-agent before connecting.");
    }

    const authStatus = await this.connection.verifyAuth();
    this.cacheAuthStatus(authStatus.authenticated);
    if (!authStatus.authenticated && !this.env[ENV_KEY.CURSOR_API_KEY]) {
      throw new Error(
        "Cursor CLI is not authenticated. Run `cursor-agent login` or set CURSOR_API_KEY."
      );
    }

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
  }

  async disconnect(): Promise<void> {
    try {
      await this.connection.disconnect();
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
    const sessionId = await this.connection.createChat();
    return { sessionId };
  }

  async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    const cachedAuth = this.getCachedAuthStatus();
    if (cachedAuth === true || this.env[ENV_KEY.CURSOR_API_KEY]) {
      return {};
    }
    const authStatus = await this.connection.verifyAuth();
    this.cacheAuthStatus(authStatus.authenticated);
    if (!authStatus.authenticated && !this.env[ENV_KEY.CURSOR_API_KEY]) {
      throw new Error("Cursor CLI authentication is required.");
    }
    return {};
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.runPromptGuarded(async () => {
      const hookSocketTarget = this.hookAddress?.url ?? this.hookAddress?.socketPath;
      const request: CursorPromptRequest = {
        prompt: this.buildPromptText(params),
        sessionId: params.sessionId,
        mode: this.getSessionPromptMode(params.sessionId),
        model: this.getSessionModelValue(params.sessionId),
        streamPartialOutput: true,
        envOverrides: hookSocketTarget ? injectHookSocketEnv({}, hookSocketTarget) : undefined,
      };

      const result = await this.connection.spawnPrompt(request);
      if (result.exitCode !== null && result.exitCode !== 0 && result.resultText === null) {
        throw new Error(`Cursor prompt failed${result.signal ? ` (${result.signal})` : ""}`);
      }

      return {
        stopReason: "end_turn",
      };
    });
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {
    // Cursor runtime is source-of-truth for session updates; incoming updates are ignored.
  }

  async runAgentCommand(args: string[]): Promise<AgentManagementCommandResult> {
    return this.connection.runManagementCommand(args);
  }

  async login(): Promise<AgentManagementCommandResult> {
    return this.runAgentCommand(["login"]);
  }

  async logout(): Promise<AgentManagementCommandResult> {
    return this.runAgentCommand(["logout"]);
  }

  async getStatus(): Promise<AgentManagementCommandResult> {
    return this.runAgentCommand(["status"]);
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    this.setSessionModeValue(params);
    return {};
  }

  async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    this.setSessionModelValue(params);
    return {};
  }

  private buildPromptText(params: PromptRequest): string {
    return params.prompt
      .filter((entry) => entry.type === CONTENT_BLOCK_TYPE.TEXT)
      .map((entry) => entry.text)
      .join("\n");
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
        const thought = this.asNonEmptyString(event.thought);
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
      case CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION: {
        const command = this.asNonEmptyString(event.command);
        if (!command) {
          return;
        }
        const toolCallId = this.getOrCreateHookToolCallId(sessionId, `shell:${command}`);
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
            toolCallId,
            title: `Shell: ${command}`,
            rawInput: { command },
            status: "in_progress",
          },
        });
        return;
      }
      case CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION: {
        const command = this.asNonEmptyString(event.command);
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
      case CURSOR_HOOK_EVENT.AFTER_FILE_EDIT: {
        const pathLabel = this.asNonEmptyString(event.path) ?? "unknown";
        const toolCallId = this.getOrCreateHookToolCallId(sessionId, `edit:${pathLabel}`);
        this.emit("sessionUpdate", {
          sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
            toolCallId,
            title: `File edit: ${pathLabel}`,
            rawOutput: {
              path: this.asNonEmptyString(event.path),
              edits: this.normalizeFileEdits(event.edits, this.asNonEmptyString(event.path)),
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

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeFileEdits(
    edits: unknown,
    fallbackPath: string | null
  ): Array<{ path?: string; old_string?: string; new_string?: string }> {
    if (!Array.isArray(edits)) {
      return [];
    }
    return edits.map((edit) => {
      if (!edit || typeof edit !== "object") {
        return {
          path: fallbackPath ?? undefined,
        };
      }
      const typedEdit = edit as {
        path?: unknown;
        old_string?: unknown;
        new_string?: unknown;
      };
      return {
        path: this.asNonEmptyString(typedEdit.path) ?? fallbackPath ?? undefined,
        old_string: this.asNonEmptyString(typedEdit.old_string) ?? undefined,
        new_string: this.asNonEmptyString(typedEdit.new_string) ?? undefined,
      };
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

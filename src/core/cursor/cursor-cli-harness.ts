/**
 * Cursor CLI Harness Adapter.
 *
 * Implements the AgentPort interface for the Cursor CLI, combining:
 * - Channel 1 (NDJSON Stream): Streaming text, tool calls, results
 * - Channel 2 (Hooks IPC): Permission control, context injection, thinking display
 *
 * This allows TOADSTOOL to use the Cursor CLI as a first-class AI agent,
 * alongside the existing ACP-based agents (Claude, Gemini, Codex).
 *
 * @see PLAN2.md — "Milestone 7: Cursor CLI Harness Adapter"
 */

import { nanoid } from "nanoid";
import { EventEmitter } from "eventemitter3";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENV_KEY } from "@/constants/env-keys";
import type { AgentPort, AgentPortEvents } from "@/core/agent-port";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";
import type { ConnectionStatus } from "@/types/domain";
import {
  CursorCliConnection,
  type CursorCliConnectionOptions,
} from "@/core/cursor/cursor-cli-connection";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import {
  HookIpcServer,
  type HookIpcServerOptions,
} from "@/core/cursor/hook-ipc-server";
import {
  HooksConfigGenerator,
  type HooksConfigGeneratorOptions,
} from "@/core/cursor/hooks-config-generator";
import { STREAM_EVENT_TYPE, type StreamEvent } from "@/types/cli-agent.types";
import type { CliAgentPromptInput } from "@/types/cli-agent.types";
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
  RequestPermissionRequest,
  SessionNotification,
} from "@agentclientprotocol/sdk";

const logger = createClassLogger("CursorCliHarnessAdapter");

// ── Options ──────────────────────────────────────────────────

export interface CursorCliHarnessAdapterOptions {
  /** Override the cursor-agent binary name/path */
  command?: string;
  /** Additional base args */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
  /** Hook IPC server options */
  hookOptions?: Partial<HookIpcServerOptions>;
  /** Whether to enable hooks (Channel 2) */
  enableHooks?: boolean;
  /** Model to use */
  model?: string;
  /** Agent mode (agent/plan/ask) */
  mode?: "agent" | "plan" | "ask";
  /** Force auto-approve (bypasses permission prompts) */
  force?: boolean;
  /** Connection factory for testing */
  connectionFactory?: (options: CursorCliConnectionOptions) => CursorCliConnection;
}

export type CursorCliHarnessAdapterEvents = HarnessRuntimeEvents;

// ── Adapter ──────────────────────────────────────────────────

export class CursorCliHarnessAdapter
  extends EventEmitter<CursorCliHarnessAdapterEvents>
  implements HarnessRuntime
{
  private readonly connection: CursorCliConnection;
  private hookServer: HookIpcServer | null = null;
  private hooksGenerator: HooksConfigGenerator | null = null;
  private translator: CursorToAcpTranslator | null = null;
  private translatorCleanup: (() => void) | null = null;
  private readonly enableHooks: boolean;
  private readonly hookOptions: Partial<HookIpcServerOptions>;
  private readonly cwd: string;
  private readonly options: CursorCliHarnessAdapterOptions;
  private _connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private currentModel: string | undefined;
  private currentMode: "agent" | "plan" | "ask" | undefined;

  constructor(options: CursorCliHarnessAdapterOptions = {}) {
    super();
    this.options = options;
    this.enableHooks = options.enableHooks ?? true;
    this.hookOptions = options.hookOptions ?? {};
    this.cwd = options.cwd ?? process.cwd();
    this.currentModel = options.model;
    this.currentMode = options.mode;

    const connectionOptions: CursorCliConnectionOptions = {
      command: options.command,
      args: options.args,
      cwd: this.cwd,
      env: options.env,
    };

    this.connection = options.connectionFactory
      ? options.connectionFactory(connectionOptions)
      : new CursorCliConnection(connectionOptions);

    // Forward connection state and error events
    this.connection.on("state", (status) => {
      this._connectionStatus = status;
      this.emit("state", status);
    });
    this.connection.on("error", (error) => this.emit("error", error));
  }

  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  // ── AgentPort Lifecycle ────────────────────────────────────

  async connect(): Promise<void> {
    this._connectionStatus = CONNECTION_STATUS.CONNECTING;
    this.emit("state", CONNECTION_STATUS.CONNECTING);

    try {
      // 1. Verify binary and auth (Channel 1)
      await this.connection.connect();

      // 2. Start Hook IPC server (Channel 2)
      if (this.enableHooks) {
        await this.startHookServer();
      }

      this._connectionStatus = CONNECTION_STATUS.CONNECTED;
      this.emit("state", CONNECTION_STATUS.CONNECTED);
      logger.info("Cursor CLI harness connected");
    } catch (error) {
      this._connectionStatus = CONNECTION_STATUS.ERROR;
      this.emit("state", CONNECTION_STATUS.ERROR);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // 1. Kill active prompt process
    this.connection.killActiveProcess();

    // 2. Clean up translator
    if (this.translatorCleanup) {
      this.translatorCleanup();
      this.translatorCleanup = null;
    }
    this.translator = null;

    // 3. Uninstall hooks and stop IPC server
    if (this.hooksGenerator) {
      this.hooksGenerator.uninstall();
      this.hooksGenerator = null;
    }
    if (this.hookServer) {
      await this.hookServer.stop();
      this.hookServer = null;
    }

    // 4. Disconnect connection
    await this.connection.disconnect();

    this._connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.emit("state", CONNECTION_STATUS.DISCONNECTED);
    logger.info("Cursor CLI harness disconnected");
  }

  async initialize(
    _params?: Partial<InitializeRequest>,
  ): Promise<InitializeResponse> {
    // Query available models
    try {
      const modelsResponse = await this.connection.listModels();
      logger.info("Available models", {
        count: modelsResponse.models.length,
        default: modelsResponse.defaultModel,
      });
    } catch (error) {
      logger.warn("Failed to list models", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      serverInfo: {
        name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
        version: "1.0.0",
      },
      capabilities: {},
      instructions: "Cursor CLI agent — streaming via NDJSON, hooks for permissions",
    } as InitializeResponse;
  }

  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    try {
      const sessionId = await this.connection.createSession();
      return {
        sessionId,
      } as NewSessionResponse;
    } catch (error) {
      // Fall back to generating a local session ID
      // The real session_id will come from system.init
      const localSessionId = `cursor-${nanoid()}`;
      logger.warn("create-chat failed, using local session ID", {
        error: error instanceof Error ? error.message : String(error),
        localSessionId,
      });
      return {
        sessionId: localSessionId,
      } as NewSessionResponse;
    }
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    if (this.connection.isPromptActive) {
      throw new Error("A prompt is already active");
    }

    // Build prompt input
    const promptInput: CliAgentPromptInput = {
      message: this.extractPromptText(params),
      sessionId: this.connection.sessionId ?? undefined,
      model: this.currentModel,
      mode: this.currentMode,
      force: this.options.force,
      workspacePath: this.cwd,
    };

    // Create fresh translator for this prompt
    const translator = new CursorToAcpTranslator();
    this.translator = translator;

    // Wire translator events to AgentPort events
    translator.on("sessionUpdate", (update) => {
      this.emit("sessionUpdate", update);
    });
    translator.on("state", (status) => {
      this._connectionStatus = status;
      this.emit("state", status);
    });
    translator.on("error", (error) => {
      this.emit("error", error);
    });

    // Spawn process and attach translator to parser
    const { process: childProcess, parser } = this.connection.spawnPrompt(promptInput);
    this.translatorCleanup = translator.attach(parser);

    // Wait for result event
    return new Promise<PromptResponse>((resolve, reject) => {
      translator.on("promptResult", (result) => {
        resolve({
          content: [{ type: "text", text: result.text }],
          metadata: {
            durationMs: result.durationMs,
            toolCallCount: translator.totalToolCalls,
            sessionId: result.sessionId,
          },
        } as unknown as PromptResponse);
      });

      childProcess.on("exit", (code) => {
        // If we didn't get a result event, the process may have crashed
        if (code !== 0 && code !== null) {
          reject(
            new Error(`cursor-agent exited with code ${code}`),
          );
        }
      });

      childProcess.on("error", (error) => {
        reject(error);
      });
    });
  }

  async authenticate(
    _params: AuthenticateRequest,
  ): Promise<AuthenticateResponse> {
    const authStatus = await this.connection.verifyAuth();
    if (authStatus.authenticated) {
      return {
        status: "authenticated",
        message: `Logged in as ${authStatus.email ?? "unknown"}`,
      } as unknown as AuthenticateResponse;
    }
    return {
      status: "unauthenticated",
      message: "Run: cursor-agent login",
    } as unknown as AuthenticateResponse;
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {
    // No-op — Cursor manages sessions internally
  }

  // ── Mode/Model switching ───────────────────────────────────

  async setSessionMode?(params: { mode: string }): Promise<{ mode: string }> {
    const validModes = ["agent", "plan", "ask"];
    if (validModes.includes(params.mode)) {
      this.currentMode = params.mode as "agent" | "plan" | "ask";
    }
    return { mode: this.currentMode ?? "agent" };
  }

  async setSessionModel?(params: { model: string }): Promise<{ model: string }> {
    this.currentModel = params.model;
    return { model: this.currentModel };
  }

  // ── Internal ───────────────────────────────────────────────

  private async startHookServer(): Promise<void> {
    this.hookServer = new HookIpcServer(this.hookOptions);

    // Wire hook events to AgentPort events
    this.hookServer.on("permissionRequest", (request) => {
      // Translate hook permission request to AgentPort permissionRequest
      this.emit("permissionRequest", {
        id: request.requestId,
        toolName: request.toolName,
        input: request.toolInput,
        // Provide the resolve function through metadata
        _resolve: request.resolve,
      } as unknown as RequestPermissionRequest);
    });

    this.hookServer.on("agentThought", (thought) => {
      // Emit thinking as a session update
      this.emit("sessionUpdate", {
        sessionId: this.connection.sessionId ?? "unknown",
        update: {
          sessionUpdate: "agent_thought_chunk",
          contentBlock: {
            blockType: "text",
            text: thought,
          },
          metadata: {},
        },
      } as unknown as SessionNotification);
    });

    this.hookServer.on("fileEdit", (edit) => {
      logger.debug("File edit received from hook", {
        path: edit.path,
        editCount: edit.edits.length,
      });
    });

    this.hookServer.on("error", (error) => {
      logger.error("Hook IPC server error", { error: error.message });
    });

    await this.hookServer.start();

    // Install hooks.json
    this.hooksGenerator = new HooksConfigGenerator({
      projectRoot: this.cwd,
      socketPath: this.hookServer.path,
    });
    const { env: hookEnv } = this.hooksGenerator.install();

    // Inject hook socket path into connection's env
    // (This would need to be done before spawning, so we store it)
    logger.info("Hook server started and hooks installed", {
      socketPath: this.hookServer.path,
    });
  }

  private extractPromptText(params: PromptRequest): string {
    // Extract text from the ACP PromptRequest format
    const request = params as unknown as Record<string, unknown>;
    const content = request["content"];

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content
        .filter(
          (block: unknown): block is { type: string; text: string } =>
            typeof block === "object" &&
            block !== null &&
            "text" in block &&
            typeof (block as Record<string, unknown>)["text"] === "string",
        )
        .map((block) => block.text)
        .join("\n");
    }

    // Fallback: try prompt field
    const prompt = request["prompt"];
    if (typeof prompt === "string") return prompt;

    // Last resort: try message field
    const message = request["message"];
    if (typeof message === "string") return message;

    return String(content ?? "");
  }
}

// ── Harness Adapter Export ───────────────────────────────────

export const cursorCliHarnessAdapter: HarnessAdapter = {
  id: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
  configSchema: harnessConfigSchema,
  createHarness(config: HarnessConfig): HarnessRuntime {
    const env = { ...EnvManager.getInstance().getSnapshot(), ...config.env };
    return new CursorCliHarnessAdapter({
      command: config.command,
      args: config.args,
      cwd: config.cwd,
      env,
    });
  },
};

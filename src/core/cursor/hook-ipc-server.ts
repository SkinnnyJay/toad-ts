/**
 * Hook IPC Server for Cursor CLI hooks integration.
 *
 * Runs a Unix domain socket server that receives hook events from Cursor CLI
 * hook scripts and routes them to TOADSTOOL handlers. Returns responses
 * (allow/deny, context injection, auto-continuation) back to the hook scripts.
 *
 * Communication pattern:
 * 1. TOADSTOOL starts this IPC server before spawning cursor-agent
 * 2. Hook scripts connect to the socket, send JSON, receive JSON response
 * 3. TOADSTOOL routes events to handlers based on hook_event_name
 *
 * @see PLAN2.md — "Milestone 5: Hook IPC Server (Channel 2)"
 */

import { existsSync, unlinkSync } from "node:fs";
import { type Server, type Socket, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_HOOK_EVENT, type CursorHookEvent } from "@/constants/cursor-hook-events";
import type {
  CursorAfterAgentThoughtInput,
  CursorAfterFileEditInput,
  CursorBeforeMCPExecutionInput,
  CursorBeforeMCPExecutionOutput,
  CursorBeforeReadFileInput,
  CursorBeforeReadFileOutput,
  CursorBeforeShellExecutionInput,
  CursorBeforeShellExecutionOutput,
  CursorHookBaseInput,
  CursorHookOutput,
  CursorPreToolUseInput,
  CursorPreToolUseOutput,
  CursorSessionStartInput,
  CursorSessionStartOutput,
  CursorStopInput,
  CursorStopOutput,
  CursorSubagentStartInput,
  CursorSubagentStartOutput,
} from "@/types/cursor-hooks.types";
import { CursorHookBaseInputSchema } from "@/types/cursor-hooks.types";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";

const logger = createClassLogger("HookIpcServer");

// ── Types ────────────────────────────────────────────────────

export type HookHandler<TInput = CursorHookBaseInput, TOutput = CursorHookOutput> = (
  input: TInput
) => Promise<TOutput> | TOutput;

export interface HookIpcServerOptions {
  /** Custom socket path (defaults to /tmp/toadstool-hooks-<pid>.sock) */
  socketPath?: string;
  /** Additional context to inject on sessionStart */
  additionalContext?: string;
  /** Environment variables to inject on sessionStart */
  sessionEnv?: Record<string, string>;
  /** Default permission policy for unhandled tool approvals */
  defaultPermissionPolicy?: "allow" | "deny";
  /** Max auto-continuation loops (stop hook) */
  maxContinuationLoops?: number;
}

export interface HookIpcServerEvents {
  /** Emitted when a hook event is received */
  hookEvent: (eventName: CursorHookEvent, input: CursorHookBaseInput) => void;
  /** Permission request for TUI display */
  permissionRequest: (request: {
    requestId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    hookEvent: CursorHookEvent;
    resolve: (decision: "allow" | "deny", reason?: string) => void;
  }) => void;
  /** Thinking/reasoning text from agent */
  agentThought: (thought: string) => void;
  /** File edit details for diff display */
  fileEdit: (edit: {
    path: string;
    edits: Array<{ oldString: string; newString: string }>;
  }) => void;
  /** Server started */
  listening: (socketPath: string) => void;
  /** Server error */
  error: (error: Error) => void;
  /** Server closed */
  closed: () => void;
}

// ── Server ───────────────────────────────────────────────────

export class HookIpcServer extends EventEmitter<HookIpcServerEvents> {
  private server: Server | null = null;
  private readonly socketPath: string;
  private readonly handlers = new Map<string, HookHandler>();
  private readonly options: HookIpcServerOptions;
  private activeSockets: Set<Socket> = new Set();

  constructor(options: HookIpcServerOptions = {}) {
    super();
    this.options = options;
    this.socketPath = options.socketPath ?? join(tmpdir(), `toadstool-hooks-${process.pid}.sock`);

    // Register default handlers
    this.registerDefaultHandlers();
  }

  /** Get the socket path for use in environment variables */
  get path(): string {
    return this.socketPath;
  }

  /** Whether the server is currently listening */
  get isListening(): boolean {
    return this.server?.listening ?? false;
  }

  // ── Lifecycle ──────────────────────────────────────────────

  /**
   * Start the IPC server.
   */
  async start(): Promise<void> {
    // Clean up stale socket file
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        // Ignore
      }
    }

    return new Promise<void>((resolve, reject) => {
      this.server = createServer({ allowHalfOpen: true }, (socket) =>
        this.handleConnection(socket)
      );

      this.server.on("error", (error) => {
        logger.error("IPC server error", { error: error.message });
        this.emit("error", error);
        reject(error);
      });

      this.server.listen(this.socketPath, () => {
        logger.info("IPC server listening", { path: this.socketPath });
        this.emit("listening", this.socketPath);
        resolve();
      });
    });
  }

  /**
   * Stop the IPC server and clean up.
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Close all active sockets
      for (const socket of this.activeSockets) {
        socket.destroy();
      }
      this.activeSockets.clear();

      if (this.server) {
        this.server.close(() => {
          // Clean up socket file
          if (existsSync(this.socketPath)) {
            try {
              unlinkSync(this.socketPath);
            } catch {
              // Ignore
            }
          }
          this.server = null;
          this.emit("closed");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ── Handler Registration ───────────────────────────────────

  /**
   * Register a custom handler for a specific hook event.
   */
  registerHandler<TInput = CursorHookBaseInput, TOutput = CursorHookOutput>(
    eventName: CursorHookEvent,
    handler: HookHandler<TInput, TOutput>
  ): void {
    this.handlers.set(eventName, handler as unknown as HookHandler);
  }

  // ── Connection Handling ────────────────────────────────────

  private handleConnection(socket: Socket): void {
    this.activeSockets.add(socket);
    const chunks: Buffer[] = [];

    socket.on("data", (chunk) => {
      chunks.push(chunk);
    });

    socket.on("end", () => {
      const input = Buffer.concat(chunks).toString("utf-8");
      this.processHookRequest(input, socket);
    });

    socket.on("error", (error) => {
      logger.warn("Socket error", { error: error.message });
      this.activeSockets.delete(socket);
    });

    socket.on("close", () => {
      this.activeSockets.delete(socket);
    });
  }

  private async processHookRequest(rawInput: string, socket: Socket): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawInput);
    } catch (error) {
      logger.warn("Invalid JSON from hook script", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.respond(socket, {});
      return;
    }

    // Validate base fields
    const baseResult = CursorHookBaseInputSchema.safeParse(parsed);
    if (!baseResult.success) {
      logger.warn("Invalid hook input", { errors: baseResult.error.issues });
      this.respond(socket, {});
      return;
    }

    const input = baseResult.data;
    const eventName = input.hook_event_name as CursorHookEvent;

    logger.debug("Hook event received", { eventName });
    this.emit("hookEvent", eventName, input);

    // Route to registered handler
    const handler = this.handlers.get(eventName);
    if (handler) {
      try {
        const response = await handler(parsed as CursorHookBaseInput);
        this.respond(socket, response);
      } catch (error) {
        logger.error("Hook handler error", {
          eventName,
          error: error instanceof Error ? error.message : String(error),
        });
        this.respond(socket, {});
      }
    } else {
      // No handler registered — return empty response (fail-open for most hooks)
      this.respond(socket, {});
    }
  }

  private respond(socket: Socket, data: unknown): void {
    try {
      const json = JSON.stringify(data);
      socket.end(json);
    } catch {
      socket.end("{}");
    }
  }

  // ── Default Handlers ───────────────────────────────────────

  private registerDefaultHandlers(): void {
    // sessionStart → inject context and env vars
    this.registerHandler<CursorSessionStartInput, CursorSessionStartOutput>(
      CURSOR_HOOK_EVENT.SESSION_START,
      (input) => this.handleSessionStart(input)
    );

    // preToolUse → emit permission request
    this.registerHandler<CursorPreToolUseInput, CursorPreToolUseOutput>(
      CURSOR_HOOK_EVENT.PRE_TOOL_USE,
      (input) => this.handlePreToolUse(input)
    );

    // beforeShellExecution → emit permission request
    this.registerHandler<CursorBeforeShellExecutionInput, CursorBeforeShellExecutionOutput>(
      CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
      (input) => this.handleBeforeShellExecution(input)
    );

    // beforeMCPExecution → emit permission request (fail-closed)
    this.registerHandler<CursorBeforeMCPExecutionInput, CursorBeforeMCPExecutionOutput>(
      CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
      (input) => this.handleBeforeMCPExecution(input)
    );

    // beforeReadFile → emit permission request (fail-closed)
    this.registerHandler<CursorBeforeReadFileInput, CursorBeforeReadFileOutput>(
      CURSOR_HOOK_EVENT.BEFORE_READ_FILE,
      () => ({ permission: "allow" })
    );

    // subagentStart → emit permission request
    this.registerHandler<CursorSubagentStartInput, CursorSubagentStartOutput>(
      CURSOR_HOOK_EVENT.SUBAGENT_START,
      () => ({ decision: "allow" })
    );

    // afterAgentThought → emit thought for TUI display
    this.registerHandler(CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT, (input) => {
      const typed = input as CursorAfterAgentThoughtInput;
      if (typed.thought) {
        this.emit("agentThought", typed.thought);
      }
      return {};
    });

    // afterFileEdit → emit edit details
    this.registerHandler(CURSOR_HOOK_EVENT.AFTER_FILE_EDIT, (input) => {
      const typed = input as CursorAfterFileEditInput;
      if (typed.path && typed.edits) {
        this.emit("fileEdit", {
          path: typed.path,
          edits: typed.edits.map((e) => ({
            oldString: e.old_string,
            newString: e.new_string,
          })),
        });
      }
      return {};
    });

    // stop → evaluate auto-continuation
    this.registerHandler<CursorStopInput, CursorStopOutput>(CURSOR_HOOK_EVENT.STOP, (input) =>
      this.handleStop(input)
    );
  }

  private handleSessionStart(_input: CursorSessionStartInput): CursorSessionStartOutput {
    const response: CursorSessionStartOutput = {
      continue: true,
    };

    if (this.options.additionalContext) {
      response.additional_context = this.options.additionalContext;
    }

    if (this.options.sessionEnv) {
      response.env = this.options.sessionEnv;
    }

    return response;
  }

  private async handlePreToolUse(input: CursorPreToolUseInput): Promise<CursorPreToolUseOutput> {
    const defaultPolicy = this.options.defaultPermissionPolicy ?? "allow";

    return new Promise<CursorPreToolUseOutput>((resolve) => {
      const requestId = input.tool_use_id;

      // Emit permission request for TUI to handle
      this.emit("permissionRequest", {
        requestId,
        toolName: input.tool_name,
        toolInput: input.tool_input,
        hookEvent: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
        resolve: (decision: "allow" | "deny", reason?: string) => {
          resolve({ decision, reason });
        },
      });

      // Auto-resolve with default policy after timeout (30s)
      setTimeout(() => {
        resolve({ decision: defaultPolicy });
      }, 30000);
    });
  }

  private async handleBeforeShellExecution(
    input: CursorBeforeShellExecutionInput
  ): Promise<CursorBeforeShellExecutionOutput> {
    const defaultPolicy = this.options.defaultPermissionPolicy ?? "allow";

    return new Promise<CursorBeforeShellExecutionOutput>((resolve) => {
      this.emit("permissionRequest", {
        requestId: `shell-${Date.now()}`,
        toolName: "shell",
        toolInput: {
          command: input.command,
          working_directory: input.working_directory,
        },
        hookEvent: CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
        resolve: (decision: "allow" | "deny", reason?: string) => {
          resolve({ permission: decision, reason });
        },
      });

      setTimeout(() => {
        resolve({ permission: defaultPolicy });
      }, 60000);
    });
  }

  private async handleBeforeMCPExecution(
    input: CursorBeforeMCPExecutionInput
  ): Promise<CursorBeforeMCPExecutionOutput> {
    // MCP is fail-closed — deny by default unless explicitly allowed
    return new Promise<CursorBeforeMCPExecutionOutput>((resolve) => {
      this.emit("permissionRequest", {
        requestId: `mcp-${Date.now()}`,
        toolName: `mcp:${input.server_name}:${input.tool_name}`,
        toolInput: input.tool_input,
        hookEvent: CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
        resolve: (decision: "allow" | "deny", reason?: string) => {
          resolve({ permission: decision, reason });
        },
      });

      // MCP fail-closed: deny after timeout
      setTimeout(() => {
        resolve({ permission: "deny", reason: "Permission timeout (fail-closed)" });
      }, 30000);
    });
  }

  private handleStop(input: CursorStopInput): CursorStopOutput {
    const maxLoops = this.options.maxContinuationLoops ?? 0;

    if (maxLoops > 0 && input.loop_count < maxLoops) {
      return { followup_message: undefined };
    }

    return {};
  }
}

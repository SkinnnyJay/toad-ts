/**
 * Cursor CLI connection manager.
 *
 * Manages the lifecycle of `cursor-agent` child processes:
 * - Binary verification and auth checking
 * - Process spawning with correct flags (stdin piped, NDJSON output)
 * - Session tracking via session_id from system.init events
 * - --resume support for multi-turn conversations
 * - Model listing and session creation
 * - Process group tracking and graceful shutdown
 *
 * @see PLAN2.md — "Milestone 3: Cursor CLI Connection (Channel 1)"
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import type {
  CliAgentAuthStatus,
  CliAgentInstallInfo,
  CliAgentModelsResponse,
  CliAgentPromptInput,
} from "@/types/cli-agent.types";
import { parseCursorModelsOutput, parseCursorStatusOutput } from "@/types/cursor-cli.types";
import type { ConnectionStatus } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";

const logger = createClassLogger("CursorCliConnection");

// ── Configuration ────────────────────────────────────────────

export interface CursorCliConnectionOptions {
  /** Override the cursor-agent binary name/path */
  command?: string;
  /** Additional base args (rarely needed) */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables for child processes */
  env?: NodeJS.ProcessEnv;
  /** Factory to spawn processes (for testing) */
  spawnFn?: typeof spawn;
  /** Factory to create parser (for testing) */
  parserFactory?: () => CursorStreamParser;
}

export interface CursorCliConnectionEvents {
  state: (status: ConnectionStatus) => void;
  error: (error: Error) => void;
}

export interface ActivePrompt {
  process: ChildProcess;
  parser: CursorStreamParser;
  sessionId: string | undefined;
}

// ── Connection ───────────────────────────────────────────────

export class CursorCliConnection extends EventEmitter<CursorCliConnectionEvents> {
  private readonly command: string;
  private readonly baseArgs: string[];
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly spawnFn: typeof spawn;
  private readonly parserFactory: () => CursorStreamParser;
  private activePrompt: ActivePrompt | null = null;
  private activePids: Set<number> = new Set();
  private _connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private currentSessionId: string | null = null;
  /** Whether the connection has been verified (binary + auth) */
  public isVerified = false;
  /** Additional env vars merged at spawn time (e.g. TOADSTOOL_HOOK_SOCKET) */
  private additionalEnv: Record<string, string> = {};

  constructor(options: CursorCliConnectionOptions = {}) {
    super();
    const envDefaults = EnvManager.getInstance().getSnapshot();
    const commandFromEnv = envDefaults[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const argsFromEnv = envDefaults[ENV_KEY.TOADSTOOL_CURSOR_ARGS];

    this.command = options.command ?? commandFromEnv ?? HARNESS_DEFAULT.CURSOR_COMMAND;
    this.baseArgs = options.args ?? (argsFromEnv ? argsFromEnv.split(/\s+/).filter(Boolean) : []);
    this.cwd = options.cwd ?? process.cwd();
    this.env = this.buildEnv(options.env ?? envDefaults);
    this.spawnFn = options.spawnFn ?? spawn;
    this.parserFactory = options.parserFactory ?? (() => new CursorStreamParser());
  }

  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  get sessionId(): string | null {
    return this.currentSessionId;
  }

  get isPromptActive(): boolean {
    return this.activePrompt !== null;
  }

  /**
   * Merge additional env vars into the spawn environment.
   * Used to inject TOADSTOOL_HOOK_SOCKET after the IPC server starts.
   */
  mergeEnv(env: Record<string, string>): void {
    Object.assign(this.additionalEnv, env);
  }

  // ── Lifecycle ──────────────────────────────────────────────

  /**
   * Verify that the cursor-agent binary is installed and accessible.
   */
  async verifyInstallation(): Promise<CliAgentInstallInfo> {
    try {
      const result = await this.execCommand(["--version"]);
      const version = result.stdout.trim();
      return {
        binaryName: this.command,
        binaryPath: this.command,
        version,
        installed: true,
      };
    } catch {
      return {
        binaryName: this.command,
        installed: false,
        installCommand: "curl -fsSL https://cursor.com/install | bash",
      };
    }
  }

  /**
   * Verify auth status with the Cursor service.
   */
  async verifyAuth(): Promise<CliAgentAuthStatus> {
    try {
      const result = await this.execCommand(["status"]);
      const parsed = parseCursorStatusOutput(result.stdout);
      return {
        authenticated: parsed.authenticated,
        method: parsed.authenticated ? "browser_login" : "none",
        email: parsed.email,
      };
    } catch {
      return {
        authenticated: false,
        method: "none",
      };
    }
  }

  /**
   * List available models from the Cursor service.
   */
  async listModels(): Promise<CliAgentModelsResponse> {
    const result = await this.execCommand(["models"]);
    const parsed = parseCursorModelsOutput(result.stdout);
    return {
      models: parsed.models.map((m) => ({
        id: m.id,
        name: m.name,
        isDefault: m.isDefault,
        isCurrent: m.isCurrent,
        supportsThinking: m.name.toLowerCase().includes("thinking"),
      })),
      defaultModel: parsed.defaultModel,
      currentModel: parsed.currentModel,
    };
  }

  /**
   * Create a new chat session (returns session ID).
   */
  async createSession(): Promise<string> {
    const result = await this.execCommand(["create-chat"]);
    const sessionId = result.stdout.trim();
    if (!sessionId) {
      throw new Error("create-chat returned empty session ID");
    }
    this.currentSessionId = sessionId;
    return sessionId;
  }

  /**
   * Connect: verify binary and auth.
   */
  async connect(): Promise<void> {
    this.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const installInfo = await this.verifyInstallation();
      if (!installInfo.installed) {
        throw new Error(
          `Cursor CLI not found. Install with: ${installInfo.installCommand ?? "See https://cursor.com/install"}`
        );
      }
      logger.info("Cursor CLI found", { version: installInfo.version });

      const authStatus = await this.verifyAuth();
      if (!authStatus.authenticated) {
        throw new Error("Cursor CLI not authenticated. Run: cursor-agent login");
      }
      logger.info("Cursor CLI authenticated", { email: authStatus.email });

      this.isVerified = true;
      this.setStatus(CONNECTION_STATUS.CONNECTED);
    } catch (error) {
      this.setStatus(CONNECTION_STATUS.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect: kill active process, cleanup.
   */
  async disconnect(): Promise<void> {
    this.killActiveProcess();
    this.isVerified = false;
    this.currentSessionId = null;
    this.setStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  // ── Prompting ──────────────────────────────────────────────

  /**
   * Spawn a `cursor-agent -p` process for a prompt.
   * Returns the parser and process for external consumption.
   *
   * CRITICAL: Prompts are piped via stdin, NOT as positional args.
   * The cursor-agent -p mode hangs when prompt is a positional arg.
   */
  spawnPrompt(input: CliAgentPromptInput): {
    process: ChildProcess;
    parser: CursorStreamParser;
  } {
    if (this.activePrompt) {
      throw new Error("A prompt is already active. Wait for it to complete.");
    }

    const args = this.buildPromptArgs(input);
    const parser = this.parserFactory();

    logger.debug("Spawning cursor-agent", {
      command: this.command,
      args,
      cwd: this.cwd,
    });

    const spawnEnv = { ...this.env, ...this.additionalEnv };
    const child = this.spawnFn(this.command, args, {
      cwd: this.cwd,
      env: spawnEnv,
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    });

    if (child.pid !== undefined) {
      this.activePids.add(child.pid);
    }

    // Wire stdout to parser
    child.stdout?.on("data", (chunk: Buffer) => {
      parser.feed(chunk);
    });

    // Capture stderr
    const stderrChunks: Buffer[] = [];
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    // Write prompt to stdin and close it
    if (child.stdin) {
      child.stdin.write(input.message);
      child.stdin.end();
    }

    // Track session ID from system.init
    parser.on("systemInit", (event) => {
      this.currentSessionId = event.session_id;
      if (this.activePrompt) {
        this.activePrompt.sessionId = event.session_id;
      }
    });

    // Handle process exit
    child.on("exit", (code, signal) => {
      if (child.pid !== undefined) {
        this.activePids.delete(child.pid);
      }

      // Flush any remaining buffered data
      parser.flush();

      if (code !== 0 && code !== null) {
        const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
        logger.warn("cursor-agent exited with non-zero code", {
          code,
          signal,
          stderr: stderr.slice(0, 500),
        });
      }

      this.activePrompt = null;
    });

    child.on("error", (error) => {
      if (child.pid !== undefined) {
        this.activePids.delete(child.pid);
      }
      this.activePrompt = null;
      logger.error("cursor-agent process error", { error: error.message });
      this.emit("error", error);
    });

    this.activePrompt = {
      process: child,
      parser,
      sessionId: input.sessionId ?? this.currentSessionId ?? undefined,
    };

    return { process: child, parser };
  }

  /**
   * Kill the currently active prompt process.
   */
  killActiveProcess(): void {
    if (this.activePrompt?.process) {
      const { process: proc } = this.activePrompt;
      if (proc.pid !== undefined && !proc.killed) {
        try {
          proc.kill("SIGTERM");
        } catch {
          // Process may have already exited
        }
      }
      this.activePrompt = null;
    }

    // Kill any remaining tracked processes
    for (const pid of this.activePids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process may have already exited
      }
    }
    this.activePids.clear();
  }

  // ── Internal ───────────────────────────────────────────────

  private buildPromptArgs(input: CliAgentPromptInput): string[] {
    const args: string[] = [
      ...this.baseArgs,
      "-p",
      "--output-format",
      "stream-json",
      "--stream-partial-output",
    ];

    const resumeId = input.sessionId ?? this.currentSessionId;
    if (resumeId) {
      args.push("--resume", resumeId);
    }

    if (input.model) {
      args.push("--model", input.model);
    }

    if (input.mode) {
      args.push("--mode", input.mode);
    }

    if (input.force) {
      args.push("--force");
    }

    if (input.workspacePath) {
      args.push("--workspace", input.workspacePath);
    }

    // Additional flags from config
    if (input.additionalFlags) {
      for (const [key, value] of Object.entries(input.additionalFlags)) {
        args.push(`--${key}`, value);
      }
    }

    return args;
  }

  private buildEnv(baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const env = { ...baseEnv };

    // Add local node_modules/.bin to PATH for workspace tools
    const localBin = join(this.cwd, "node_modules", ".bin");
    if (existsSync(localBin)) {
      const currentPath = env.PATH ?? "";
      const segments = currentPath.split(delimiter).filter(Boolean);
      if (!segments.includes(localBin)) {
        env.PATH = `${localBin}${delimiter}${currentPath}`;
      }
    }

    return env;
  }

  private setStatus(status: ConnectionStatus): void {
    this._connectionStatus = status;
    this.emit("state", status);
  }

  /**
   * Execute a one-shot command and return stdout/stderr.
   */
  private execCommand(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = this.spawnFn(this.command, args, {
        cwd: this.cwd,
        env: this.env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

      child.on("exit", (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
        const stderr = Buffer.concat(stderrChunks).toString("utf-8");
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      child.on("error", (error) => {
        reject(error);
      });

      // Close stdin for non-interactive commands
      child.stdin?.end();
    });
  }
}

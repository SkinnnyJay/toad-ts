import {
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
  spawn,
} from "node:child_process";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { type CliAgentAuthStatus, CliAgentAuthStatusSchema } from "@/types/cli-agent.types";
import {
  type CliAgentInstallInfo,
  CliAgentInstallInfoSchema,
  CliAgentModelSchema,
  type CliAgentModelsResponse,
  CliAgentModelsResponseSchema,
  type CliAgentPromptInput,
  CliAgentPromptInputSchema,
  type CliAgentSession,
  CliAgentSessionSchema,
} from "@/types/cli-agent.types";
import type { CursorStreamEvent } from "@/types/cursor-cli.types";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";
import { CursorStreamParser, type CursorStreamParserOptions } from "./cursor-stream-parser";

const CURSOR_CLI_ARG = {
  PRINT: "-p",
  OUTPUT_FORMAT: "--output-format",
  STREAM_JSON: "stream-json",
  STREAM_PARTIAL_OUTPUT: "--stream-partial-output",
  RESUME: "--resume",
  MODEL: "--model",
  MODE: "--mode",
  WORKSPACE: "--workspace",
  FORCE: "--force",
  API_KEY: "--api-key",
  VERSION: "--version",
  STATUS: "status",
  MODELS: "models",
  LIST_SESSIONS: "ls",
  CREATE_CHAT: "create-chat",
} as const;

const CURSOR_MODEL_TAG = {
  CURRENT: "current",
  DEFAULT: "default",
} as const;

const CURSOR_REGEX = {
  MODEL_LINE: /^(\S+)\s+-\s+(.+?)(?:\s{2,}\((.+)\))?$/,
  CHAT_ID: /^[0-9a-fA-F-]{36}$/,
  AUTH_EMAIL: /Logged in as\s+([^\s]+)/,
  WHITESPACE: /\s+/,
} as const;

export interface CursorPromptExecutionResult {
  events: CursorStreamEvent[];
  sessionId?: string;
  resultText?: string;
  stderr: string;
  exitCode: number | null;
}

export interface CursorCliConnectionEvents {
  streamEvent: (event: CursorStreamEvent) => void;
  parseError: (payload: { line: string; reason: string }) => void;
  processExit: (payload: { code: number | null; signal: NodeJS.Signals | null }) => void;
}

export interface CursorCliConnectionOptions extends CursorStreamParserOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnFn?: CursorSpawnFunction;
}

export interface CursorCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface CursorCommandOptions {
  stdinText?: string;
  timeoutMs?: number;
}

type CursorSpawnFunction = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => ChildProcessWithoutNullStreams;

const parseArgs = (rawValue: string): string[] => {
  return rawValue
    .split(CURSOR_REGEX.WHITESPACE)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const toLines = (value: string): string[] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

export class CursorCliConnection extends EventEmitter<CursorCliConnectionEvents> {
  private readonly logger = createClassLogger("CursorCliConnection");
  private readonly command: string;
  private readonly args: string[];
  private readonly cwd?: string;
  private env: NodeJS.ProcessEnv;
  private readonly spawnFn: CursorSpawnFunction;
  private readonly parserOptions: CursorStreamParserOptions;

  private activeChild: ChildProcessWithoutNullStreams | null = null;
  private trackedPids = new Set<number>();
  private signalHandlersAttached = false;
  private latestSessionId: string | undefined;

  public constructor(options: CursorCliConnectionOptions = {}) {
    super();
    const baseEnv = { ...EnvManager.getInstance().getSnapshot(), ...options.env };
    const commandFromEnv = baseEnv[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const argsFromEnv = baseEnv[ENV_KEY.TOADSTOOL_CURSOR_ARGS];

    this.command = options.command ?? commandFromEnv ?? HARNESS_DEFAULT.CURSOR_COMMAND;
    this.args =
      options.args ?? (argsFromEnv ? parseArgs(argsFromEnv) : [...HARNESS_DEFAULT.CURSOR_ARGS]);
    this.cwd = options.cwd;
    this.env = baseEnv;
    this.spawnFn = options.spawnFn ?? spawn;
    this.parserOptions = {
      maxAccumulatedOutputBytes: options.maxAccumulatedOutputBytes,
      maxPendingEvents: options.maxPendingEvents,
      resumePendingEvents: options.resumePendingEvents,
    };
  }

  public getLastSessionId(): string | undefined {
    return this.latestSessionId;
  }

  public setEnv(overrides: Record<string, string>): void {
    this.env = {
      ...this.env,
      ...overrides,
    };
  }

  public async disconnect(): Promise<void> {
    await this.terminateActiveProcess("SIGTERM");
    this.detachSignalHandlers();
  }

  public async verifyInstallation(): Promise<CliAgentInstallInfo> {
    try {
      const result = await this.runCommand([CURSOR_CLI_ARG.VERSION]);
      const version = toLines(result.stdout)[0];
      return CliAgentInstallInfoSchema.parse({
        binaryName: this.command,
        version,
        installed: result.exitCode === 0,
      });
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return CliAgentInstallInfoSchema.parse({
          binaryName: this.command,
          installed: false,
        });
      }
      throw error;
    }
  }

  public async verifyAuth(): Promise<CliAgentAuthStatus> {
    const result = await this.runCommand([CURSOR_CLI_ARG.STATUS]);
    const combined = `${result.stdout}\n${result.stderr}`;
    const emailMatch = combined.match(CURSOR_REGEX.AUTH_EMAIL);
    const envApiKey = this.env[ENV_KEY.CURSOR_API_KEY];
    const authenticated = emailMatch !== null || Boolean(envApiKey);

    return CliAgentAuthStatusSchema.parse({
      authenticated,
      method: emailMatch ? "browser_login" : envApiKey ? "api_key" : "none",
      email: emailMatch?.[1],
    });
  }

  public async createChat(): Promise<string> {
    const result = await this.runCommand([CURSOR_CLI_ARG.CREATE_CHAT]);
    const id = toLines(result.stdout)[0];
    if (!id || !CURSOR_REGEX.CHAT_ID.test(id)) {
      throw new Error(`Unable to parse chat id from output: ${result.stdout}`);
    }
    return id;
  }

  public async listModels(): Promise<CliAgentModelsResponse> {
    const result = await this.runCommand([CURSOR_CLI_ARG.MODELS]);
    const lines = toLines(result.stdout);
    const models = lines
      .filter((line) => !line.startsWith("Available models"))
      .filter((line) => !line.startsWith("Tip:"))
      .map((line) => this.parseModelLine(line))
      .filter((model): model is NonNullable<typeof model> => model !== null);

    const defaultModel = models.find((model) => model.isDefault)?.id;
    const currentModel = models.find((model) => model.isCurrent)?.id;

    return CliAgentModelsResponseSchema.parse({
      models,
      defaultModel,
      currentModel,
    });
  }

  public async listSessions(): Promise<CliAgentSession[]> {
    const result = await this.runCommand([CURSOR_CLI_ARG.LIST_SESSIONS]);
    const lines = toLines(result.stdout);
    if (lines.some((line) => line.includes("Requires TTY"))) {
      return [];
    }

    const sessions = lines
      .map((line) => this.parseSessionLine(line))
      .filter((session): session is CliAgentSession => session !== null);
    return sessions;
  }

  public async runPrompt(
    input: CliAgentPromptInput,
    options: { apiKey?: string } = {}
  ): Promise<CursorPromptExecutionResult> {
    const payload = CliAgentPromptInputSchema.parse(input);
    const args = this.buildPromptArgs(payload, options.apiKey);
    const parser = new CursorStreamParser(this.parserOptions);
    const events: CursorStreamEvent[] = [];
    const stderrChunks: string[] = [];
    let resultText: string | undefined;
    let observedSessionId = payload.sessionId ?? this.latestSessionId;

    this.attachSignalHandlers();

    return new Promise<CursorPromptExecutionResult>((resolve, reject) => {
      const child = this.spawn(args);
      this.activeChild = child;

      parser.on("event", (event) => {
        events.push(event);
        parser.drain(1);
        this.emit("streamEvent", event);
        if (event.type === "system") {
          observedSessionId = event.session_id;
          this.latestSessionId = event.session_id;
        }
        if (event.type === "result" && "result" in event && typeof event.result === "string") {
          resultText = event.result;
        }
      });

      parser.on("parseError", (payload) => this.emit("parseError", payload));

      child.stdout.on("data", (chunk: Buffer | string) => {
        parser.write(chunk);
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(chunk.toString());
      });

      child.on("error", (error) => {
        this.cleanupTrackedChild(child);
        reject(error);
      });

      child.on("close", (code, signal) => {
        parser.flush();
        parser.drain();
        this.emit("processExit", { code, signal });
        const stderr = stderrChunks.join("");
        this.cleanupTrackedChild(child);

        if (code !== 0) {
          reject(new Error(`Cursor process exited with code ${code}: ${stderr}`));
          return;
        }

        resolve({
          events,
          sessionId: observedSessionId,
          resultText,
          stderr,
          exitCode: code,
        });
      });

      child.stdin.write(`${payload.message}\n`);
      child.stdin.end();
    });
  }

  private parseModelLine(line: string): ReturnType<typeof CliAgentModelSchema.parse> | null {
    const match = line.match(CURSOR_REGEX.MODEL_LINE);
    if (!match) {
      return null;
    }

    const id = match[1];
    const name = match[2];
    const tagsRaw = match[3];
    if (!id || !name) {
      return null;
    }

    const tags = (tagsRaw ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);

    const isCurrent = tags.includes(CURSOR_MODEL_TAG.CURRENT);
    const isDefault = tags.includes(CURSOR_MODEL_TAG.DEFAULT);

    return CliAgentModelSchema.parse({
      id,
      name,
      isCurrent,
      isDefault,
    });
  }

  private parseSessionLine(line: string): CliAgentSession | null {
    const words = line.split(CURSOR_REGEX.WHITESPACE);
    const id = words[0];
    if (!id || !CURSOR_REGEX.CHAT_ID.test(id)) {
      return null;
    }

    const title = line.slice(id.length).trim();
    return CliAgentSessionSchema.parse({
      id,
      title: title.length > 0 ? title : undefined,
    });
  }

  private buildPromptArgs(input: CliAgentPromptInput, apiKeyOverride?: string): string[] {
    const args = [
      ...this.args,
      CURSOR_CLI_ARG.PRINT,
      CURSOR_CLI_ARG.OUTPUT_FORMAT,
      CURSOR_CLI_ARG.STREAM_JSON,
      CURSOR_CLI_ARG.STREAM_PARTIAL_OUTPUT,
    ];

    const resumeSessionId = input.sessionId ?? this.latestSessionId;
    if (resumeSessionId) {
      args.push(CURSOR_CLI_ARG.RESUME, resumeSessionId);
    }
    if (input.model) {
      args.push(CURSOR_CLI_ARG.MODEL, input.model);
    }
    if (input.mode && input.mode !== "agent") {
      args.push(CURSOR_CLI_ARG.MODE, input.mode);
    }
    if (input.workspacePath) {
      args.push(CURSOR_CLI_ARG.WORKSPACE, input.workspacePath);
    }
    if (input.force) {
      args.push(CURSOR_CLI_ARG.FORCE);
    }

    const apiKey = apiKeyOverride ?? this.env[ENV_KEY.CURSOR_API_KEY];
    if (apiKey) {
      args.push(CURSOR_CLI_ARG.API_KEY, apiKey);
    }

    return args;
  }

  private async runCommand(
    args: string[],
    options: CursorCommandOptions = {}
  ): Promise<CursorCommandResult> {
    const timeoutMs = options.timeoutMs ?? CURSOR_LIMIT.COMMAND_RESULT_TIMEOUT_MS;
    const stdinText = options.stdinText ?? "";

    return new Promise<CursorCommandResult>((resolve, reject) => {
      const child = this.spawn(args);
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      let completed = false;

      const timeout = setTimeout(() => {
        if (completed) {
          return;
        }
        completed = true;
        void this.forceKillChild(child);
        reject(new Error(`Cursor command timed out after ${timeoutMs}ms: ${args.join(" ")}`));
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdoutChunks.push(chunk.toString());
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(chunk.toString());
      });

      child.on("error", (error) => {
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(timeout);
        this.cleanupTrackedChild(child);
        reject(error);
      });

      child.on("close", (exitCode) => {
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(timeout);
        this.cleanupTrackedChild(child);
        resolve({
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join(""),
          exitCode,
        });
      });

      if (stdinText.length > 0) {
        child.stdin.write(stdinText);
      }
      child.stdin.end();
    });
  }

  private spawn(args: string[]): ChildProcessWithoutNullStreams {
    this.logger.debug("Spawning cursor command", { command: this.command, args });

    const child = this.spawnFn(this.command, args, {
      cwd: this.cwd,
      env: this.env,
      detached: process.platform !== "win32",
      stdio: "pipe",
    });

    if (child.pid !== undefined) {
      this.trackedPids.add(child.pid);
    }

    return child;
  }

  private async terminateActiveProcess(signal: NodeJS.Signals): Promise<void> {
    if (!this.activeChild) {
      return;
    }
    const child = this.activeChild;
    this.activeChild = null;
    await this.killChild(child, signal);
  }

  private async forceKillChild(child: ChildProcessWithoutNullStreams): Promise<void> {
    await this.killChild(child, "SIGKILL");
  }

  private async killChild(
    child: ChildProcessWithoutNullStreams,
    signal: NodeJS.Signals
  ): Promise<void> {
    const pid = child.pid;
    if (!pid) {
      return;
    }

    try {
      if (process.platform !== "win32") {
        process.kill(-pid, signal);
      } else {
        child.kill(signal);
      }
    } catch (_error) {
      child.kill(signal);
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      }, CURSOR_LIMIT.COMMAND_FORCE_KILL_TIMEOUT_MS);

      child.once("close", () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve();
      });
    });

    this.cleanupTrackedChild(child);
  }

  private cleanupTrackedChild(child: ChildProcessWithoutNullStreams): void {
    if (child.pid !== undefined) {
      this.trackedPids.delete(child.pid);
    }
    if (this.activeChild === child) {
      this.activeChild = null;
    }
  }

  private attachSignalHandlers(): void {
    if (this.signalHandlersAttached) {
      return;
    }
    process.on("SIGINT", this.handleSigint);
    process.on("SIGTERM", this.handleSigterm);
    this.signalHandlersAttached = true;
  }

  private detachSignalHandlers(): void {
    if (!this.signalHandlersAttached) {
      return;
    }
    process.off("SIGINT", this.handleSigint);
    process.off("SIGTERM", this.handleSigterm);
    this.signalHandlersAttached = false;
  }

  private readonly handleSigint = (): void => {
    void this.terminateActiveProcess("SIGINT");
  };

  private readonly handleSigterm = (): void => {
    void this.terminateActiveProcess("SIGTERM");
  };
}

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { TIMEOUT } from "@/config/timeouts";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SIGNAL } from "@/constants/signals";
import {
  extractFirstUuid,
  parseAuthStatusOutput,
  parseModelsOutput,
  parseUuidLines,
} from "@/core/agent-management/cli-output-parser";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import type { CliAgentAuthStatus, CliAgentModelsResponse } from "@/types/cli-agent.types";
import type { CursorStreamEvent } from "@/types/cursor-cli.types";
import { EnvManager } from "@/utils/env/env.utils";
import { EventEmitter } from "eventemitter3";
import { execa } from "execa";

interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

type SpawnFn = (
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    detached?: boolean;
  }
) => ChildProcessWithoutNullStreams;

type CommandRunner = (
  command: string,
  args: string[],
  options: CommandOptions
) => Promise<CommandResult>;

type KillFn = (pid: number, signal: NodeJS.Signals) => void;

export interface CursorPromptRequest {
  prompt: string;
  sessionId?: string;
  model?: string;
  mode?: "agent" | "plan" | "ask";
  force?: boolean;
  streamPartialOutput?: boolean;
  apiKey?: string;
  envOverrides?: NodeJS.ProcessEnv;
  extraArgs?: string[];
}

export interface CursorPromptResult {
  sessionId: string | null;
  resultText: string | null;
  events: CursorStreamEvent[];
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export interface CursorCliConnectionEvents {
  event: (event: CursorStreamEvent) => void;
  stderr: (chunk: string) => void;
  error: (error: Error) => void;
  exit: (info: { code: number | null; signal: NodeJS.Signals | null }) => void;
}

export interface CursorCliConnectionOptions {
  command?: string;
  baseArgs?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnFn?: SpawnFn;
  commandRunner?: CommandRunner;
  killFn?: KillFn;
}

const DEFAULT_COMMAND_TIMEOUT_MS = 10_000;
const EXIT_CODE_FAILURE = 1;

const defaultCommandRunner: CommandRunner = async (command, args, options) => {
  const result = await execa(command, args, {
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeoutMs,
    reject: false,
    encoding: ENCODING.UTF8,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? EXIT_CODE_FAILURE,
  };
};

export class CursorCliConnection extends EventEmitter<CursorCliConnectionEvents> {
  private readonly command: string;
  private readonly baseArgs: string[];
  private readonly cwd?: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly spawnFn: SpawnFn;
  private readonly commandRunner: CommandRunner;
  private readonly killFn: KillFn;
  private child: ChildProcessWithoutNullStreams | null = null;
  private activeProcessGroupId: number | null = null;
  private activePrompt: Promise<CursorPromptResult> | null = null;
  private sessionId: string | null = null;
  private signalHandlersInstalled = false;

  constructor(options: CursorCliConnectionOptions = {}) {
    super();
    this.command = options.command ?? HARNESS_DEFAULT.CURSOR_COMMAND;
    this.baseArgs = options.baseArgs ?? [];
    this.cwd = options.cwd;
    this.env = { ...EnvManager.getInstance().getSnapshot(), ...options.env };
    this.spawnFn = options.spawnFn ?? spawn;
    this.commandRunner = options.commandRunner ?? defaultCommandRunner;
    this.killFn = options.killFn ?? process.kill;
  }

  getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  async verifyInstallation(): Promise<{ installed: boolean; version?: string }> {
    const result = await this.runCommand(["--version"]);
    if (result.exitCode !== 0) {
      return { installed: false };
    }

    const version = result.stdout.trim();
    return {
      installed: version.length > 0,
      version: version.length > 0 ? version : undefined,
    };
  }

  async verifyAuth(): Promise<CliAgentAuthStatus> {
    const result = await this.runCommand(["status"]);
    return parseAuthStatusOutput(`${result.stdout}\n${result.stderr}`);
  }

  async listModels(): Promise<CliAgentModelsResponse> {
    const result = await this.runCommand(["models"]);
    return parseModelsOutput(result.stdout);
  }

  async listSessions(): Promise<string[]> {
    const result = await this.runCommand(["ls"]);
    const stdout = `${result.stdout}\n${result.stderr}`;
    if (/requires tty/i.test(stdout)) {
      return [];
    }

    return parseUuidLines(stdout);
  }

  async createChat(): Promise<string> {
    const result = await this.runCommand(["create-chat"]);
    const sessionId = extractFirstUuid(`${result.stdout}\n${result.stderr}`);
    if (!sessionId) {
      throw new Error("Unable to parse session id from `agent create-chat` output.");
    }
    this.sessionId = sessionId;
    return sessionId;
  }

  async spawnPrompt(request: CursorPromptRequest): Promise<CursorPromptResult> {
    if (this.activePrompt) {
      throw new Error("A prompt is already active.");
    }

    const promptPromise = this.runPrompt(request).finally(() => {
      this.activePrompt = null;
    });
    this.activePrompt = promptPromise;
    return promptPromise;
  }

  async disconnect(): Promise<void> {
    if (!this.child) {
      this.removeSignalHandlers();
      return;
    }

    this.killActiveProcessGroup(SIGNAL.SIGTERM);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.killActiveProcessGroup(SIGNAL.SIGKILL);
        resolve();
      }, TIMEOUT.DISCONNECT_FORCE_MS);
      timer.unref();

      this.child?.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.removeSignalHandlers();
  }

  private async runPrompt(request: CursorPromptRequest): Promise<CursorPromptResult> {
    const parser = new CursorStreamParser();
    const events: CursorStreamEvent[] = [];
    const stderrChunks: string[] = [];
    let resultText: string | null = null;
    let promptSessionId: string | null = null;

    const args = this.buildPromptArgs(request);
    const child = this.spawnFn(this.command, args, {
      cwd: this.cwd,
      env: this.buildPromptEnv(request),
      detached: true,
    });

    this.child = child;
    this.activeProcessGroupId = child.pid ?? null;
    this.installSignalHandlers();

    child.stdout.setEncoding(ENCODING.UTF8);
    child.stderr.setEncoding(ENCODING.UTF8);

    child.stdout.on("data", (chunk: string) => {
      const parseResult = parser.pushChunk(chunk);
      if (parseResult.shouldPause) {
        child.stdout.pause();
      }
      const parsedEvents = parser.drainEvents();
      for (const event of parsedEvents) {
        events.push(event);
        this.emit("event", event);
        if (event.type === "system") {
          promptSessionId = event.session_id;
          this.sessionId = event.session_id;
        }
        if (event.type === "result") {
          resultText = event.result;
        }
      }
      if (child.stdout.isPaused() && !parser.isBackpressured()) {
        child.stdout.resume();
      }
    });

    child.stderr.on("data", (chunk: string) => {
      stderrChunks.push(chunk);
      this.emit("stderr", chunk);
    });

    child.on("error", (error) => {
      this.emit("error", error);
    });

    child.stdin.write(request.prompt);
    child.stdin.end();

    return new Promise<CursorPromptResult>((resolve) => {
      child.once("close", (code, signal) => {
        const finalParse = parser.end();
        if (finalParse.invalidEventCount > 0 || finalParse.malformedLineCount > 0) {
          this.emit(
            "error",
            new Error(
              `Cursor stream had parse issues: malformed=${finalParse.malformedLineCount}, invalid=${finalParse.invalidEventCount}`
            )
          );
        }
        events.push(...parser.drainEvents());
        this.emit("exit", { code, signal });
        this.child = null;
        this.activeProcessGroupId = null;
        this.removeSignalHandlers();
        resolve({
          sessionId: promptSessionId ?? this.sessionId,
          resultText,
          events,
          stderr: stderrChunks.join(""),
          exitCode: code,
          signal,
        });
      });
    });
  }

  private buildPromptArgs(request: CursorPromptRequest): string[] {
    const args = [...this.baseArgs, "-p", "--output-format", "stream-json"];
    if (request.streamPartialOutput ?? true) {
      args.push("--stream-partial-output");
    }
    if (request.sessionId ?? this.sessionId) {
      args.push("--resume", request.sessionId ?? this.sessionId ?? "");
    }
    if (request.model) {
      args.push("--model", request.model);
    }
    if (request.mode) {
      args.push("--mode", request.mode);
    }
    if (request.force) {
      args.push("--force");
    }
    const apiKey = request.apiKey ?? this.env[ENV_KEY.CURSOR_API_KEY];
    if (apiKey) {
      args.push("--api-key", apiKey);
    }
    if (request.extraArgs && request.extraArgs.length > 0) {
      args.push(...request.extraArgs);
    }
    return args;
  }

  private buildPromptEnv(request: CursorPromptRequest): NodeJS.ProcessEnv {
    const env = { ...this.env, ...request.envOverrides };
    const apiKey = request.apiKey ?? env[ENV_KEY.CURSOR_API_KEY];
    if (apiKey) {
      env[ENV_KEY.CURSOR_API_KEY] = apiKey;
    }
    return env;
  }

  private async runCommand(args: string[]): Promise<CommandResult> {
    return this.commandRunner(this.command, args, {
      cwd: this.cwd,
      env: this.env,
      timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
    });
  }

  private killActiveProcessGroup(signal: NodeJS.Signals): void {
    if (!this.activeProcessGroupId) {
      return;
    }
    try {
      this.killFn(-this.activeProcessGroupId, signal);
    } catch {
      try {
        this.killFn(this.activeProcessGroupId, signal);
      } catch {
        // no-op
      }
    }
  }

  private installSignalHandlers(): void {
    if (this.signalHandlersInstalled) {
      return;
    }
    process.on(SIGNAL.SIGINT, this.handleShutdownSignal);
    process.on(SIGNAL.SIGTERM, this.handleShutdownSignal);
    this.signalHandlersInstalled = true;
  }

  private removeSignalHandlers(): void {
    if (!this.signalHandlersInstalled) {
      return;
    }
    process.off(SIGNAL.SIGINT, this.handleShutdownSignal);
    process.off(SIGNAL.SIGTERM, this.handleShutdownSignal);
    this.signalHandlersInstalled = false;
  }

  private readonly handleShutdownSignal = (): void => {
    this.killActiveProcessGroup(SIGNAL.SIGTERM);
  };
}

import {
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
  spawn,
} from "node:child_process";
import { PLATFORM } from "@/constants/platform";
import { createClassLogger } from "@/utils/logging/logger.utils";

export interface CliAgentCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface CliAgentStreamingResult {
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export interface CliAgentRunCommandOptions {
  stdinText?: string;
  timeoutMs?: number;
}

export interface CliAgentRunStreamingCommandOptions {
  stdinText?: string;
  onStdout?: (chunk: Buffer | string) => void;
  onStderr?: (chunk: Buffer | string) => void;
}

export interface CliAgentProcessRunnerOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnFn?: CliAgentSpawnFunction;
  defaultCommandTimeoutMs: number;
  forceKillTimeoutMs: number;
  loggerName: string;
}

type CliAgentSpawnFunction = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => ChildProcessWithoutNullStreams;

export class CliAgentProcessRunner {
  private readonly logger: ReturnType<typeof createClassLogger>;
  private readonly command: string;
  private readonly args: string[];
  private readonly cwd?: string;
  private env: NodeJS.ProcessEnv;
  private readonly spawnFn: CliAgentSpawnFunction;
  private readonly defaultCommandTimeoutMs: number;
  private readonly forceKillTimeoutMs: number;

  private activeChild: ChildProcessWithoutNullStreams | null = null;
  private signalHandlersAttached = false;

  public constructor(options: CliAgentProcessRunnerOptions) {
    this.command = options.command;
    this.args = options.args ?? [];
    this.cwd = options.cwd;
    this.env = options.env ?? {};
    this.spawnFn = options.spawnFn ?? spawn;
    this.defaultCommandTimeoutMs = options.defaultCommandTimeoutMs;
    this.forceKillTimeoutMs = options.forceKillTimeoutMs;
    this.logger = createClassLogger(options.loggerName);
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

  public async runCommand(
    args: string[],
    options: CliAgentRunCommandOptions = {}
  ): Promise<CliAgentCommandResult> {
    const timeoutMs = options.timeoutMs ?? this.defaultCommandTimeoutMs;
    const stdinText = options.stdinText ?? "";

    return new Promise<CliAgentCommandResult>((resolve, reject) => {
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
        reject(new Error(`CLI command timed out after ${timeoutMs}ms: ${args.join(" ")}`));
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
        this.cleanupChild(child);
        reject(error);
      });

      child.on("close", (exitCode) => {
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(timeout);
        this.cleanupChild(child);
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

  public async runStreamingCommand(
    args: string[],
    options: CliAgentRunStreamingCommandOptions = {}
  ): Promise<CliAgentStreamingResult> {
    const stderrChunks: string[] = [];
    this.attachSignalHandlers();

    return new Promise<CliAgentStreamingResult>((resolve, reject) => {
      const child = this.spawn(args);
      this.activeChild = child;

      child.stdout.on("data", (chunk: Buffer | string) => {
        options.onStdout?.(chunk);
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(chunk.toString());
        options.onStderr?.(chunk);
      });

      child.on("error", (error) => {
        this.cleanupChild(child);
        reject(error);
      });

      child.on("close", (exitCode, signal) => {
        this.cleanupChild(child);
        resolve({
          stderr: stderrChunks.join(""),
          exitCode,
          signal,
        });
      });

      if (options.stdinText && options.stdinText.length > 0) {
        child.stdin.write(options.stdinText);
      }
      child.stdin.end();
    });
  }

  private spawn(args: string[]): ChildProcessWithoutNullStreams {
    const commandArgs = [...this.args, ...args];
    this.logger.debug("Spawning cli command", { command: this.command, args: commandArgs });

    return this.spawnFn(this.command, commandArgs, {
      cwd: this.cwd,
      env: this.env,
      detached: process.platform !== PLATFORM.WIN32,
      stdio: "pipe",
    });
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
      if (process.platform !== PLATFORM.WIN32) {
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
      }, this.forceKillTimeoutMs);

      child.once("close", () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve();
      });
    });

    this.cleanupChild(child);
  }

  private cleanupChild(child: ChildProcessWithoutNullStreams): void {
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

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { resolve } from "node:path";

import { LIMIT } from "@/config/limits";
import { TRUTHY_STRINGS } from "@/constants/boolean-strings";
import { ENV_KEY } from "@/constants/env-keys";
import { ENV_VALUE } from "@/constants/env-values";
import { PLATFORM } from "@/constants/platform";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import { isPathWithinBase } from "@/utils/pathContainment.utils";
import { quoteWindowsCommandValue } from "@/utils/windows-command.utils";
import { nanoid } from "nanoid";

export interface ShellCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface ShellCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export interface ShellSessionOptions {
  baseDir?: string;
  env?: NodeJS.ProcessEnv;
  allowEscape?: boolean;
  spawnFn?: (
    command: string,
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean }
  ) => ChildProcessWithoutNullStreams;
}

interface PendingCommand {
  id: string;
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  resolve: (value: ShellCommandResult) => void;
  reject: (error: Error) => void;
}

const SHELL_CONTROL = {
  DEFAULT_POSIX_COMMAND: "bash",
  DEFAULT_WINDOWS_COMMAND: "cmd.exe",
  DEFAULT_POSIX_ARGS: ["-s"],
  SENTINEL_PREFIX: "__TOADSTOOL_CMD_END__",
  DISPOSE_ERROR_MESSAGE: "Shell session disposed.",
} as const;

const shouldAllowEscape = (env?: NodeJS.ProcessEnv, override?: boolean): boolean => {
  if (override !== undefined) return override;
  const source = env ?? EnvManager.getInstance().getSnapshot();
  const raw = source[ENV_KEY.TOADSTOOL_ALLOW_ESCAPE];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return TRUTHY_STRINGS.has(normalized);
};

const resolveCwd = (candidate: string, base: string, allowEscape: boolean): string => {
  const normalizedBase = resolve(base);
  const resolved = resolve(normalizedBase, candidate);
  if (allowEscape) return resolved;
  if (!isPathWithinBase(resolved, normalizedBase)) {
    throw new Error(`Cwd escapes base directory: ${candidate}`);
  }
  return resolved;
};

const resolveShellCommand = (): {
  command: string;
  args: string[];
  usesShell: boolean;
  isWindows: boolean;
} => {
  if (process.platform === PLATFORM.WIN32) {
    return {
      command: SHELL_CONTROL.DEFAULT_WINDOWS_COMMAND,
      args: ["/D", "/Q", "/K"],
      usesShell: true,
      isWindows: true,
    };
  }
  const envShell = EnvManager.getInstance().getSnapshot()[ENV_KEY.SHELL];
  return {
    command: envShell ?? SHELL_CONTROL.DEFAULT_POSIX_COMMAND,
    args: [...SHELL_CONTROL.DEFAULT_POSIX_ARGS],
    usesShell: false,
    isWindows: false,
  };
};

class ShellSession {
  private readonly baseDir: string;
  private readonly allowEscape: boolean;
  private readonly spawnFn: (
    command: string,
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean }
  ) => ChildProcessWithoutNullStreams;
  private readonly command: string;
  private readonly args: string[];
  private readonly usesShell: boolean;
  private readonly isWindows: boolean;
  private readonly baseEnv: NodeJS.ProcessEnv;
  private child?: ChildProcessWithoutNullStreams;
  private readonly queue: PendingCommand[] = [];
  private active: PendingCommand | null = null;
  private stdoutBuffer = "";
  private stderrBuffer = "";
  private stdoutCarry = "";
  private timer?: NodeJS.Timeout;

  constructor(options: ShellSessionOptions) {
    this.baseDir = options.baseDir ?? process.cwd();
    this.allowEscape = shouldAllowEscape(options.env, options.allowEscape);
    this.spawnFn = options.spawnFn ?? spawn;
    this.baseEnv = options.env ?? {};
    const shell = resolveShellCommand();
    this.command = shell.command;
    this.args = shell.args;
    this.usesShell = shell.usesShell;
    this.isWindows = shell.isWindows;
  }

  execute(command: string, options: ShellCommandOptions = {}): Promise<ShellCommandResult> {
    return new Promise((resolvePromise, reject) => {
      this.queue.push({
        id: nanoid(LIMIT.NANOID_LENGTH),
        command,
        cwd: options.cwd,
        env: options.env,
        timeoutMs: options.timeoutMs,
        resolve: resolvePromise,
        reject,
      });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.active || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();
    if (!next) return;
    this.active = next;
    this.stdoutBuffer = this.stdoutCarry;
    this.stderrBuffer = "";
    this.stdoutCarry = "";

    const env = { ...EnvManager.getInstance().getSnapshot(), ...this.baseEnv, ...next.env };
    this.ensureProcess(this.baseDir, env);
    this.writeCommand(next);
  }

  private ensureProcess(cwd: string, env: NodeJS.ProcessEnv): void {
    if (this.child) {
      return;
    }

    this.child = this.spawnFn(this.command, this.args, {
      cwd,
      env,
      shell: this.usesShell,
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");

    this.child.stdout.on("data", (chunk: string) => {
      this.stdoutBuffer += chunk;
      this.checkForCompletion();
    });
    this.child.stderr.on("data", (chunk: string) => {
      this.stderrBuffer += chunk;
    });

    this.child.on("error", (error) => {
      if (this.active) {
        this.active.reject(error);
        this.active = null;
      }
      this.child = undefined;
      this.processQueue();
    });

    this.child.on("exit", (code, signal) => {
      if (this.active) {
        this.finishActive(code, signal);
      }
      this.child = undefined;
    });
  }

  private writeCommand(command: PendingCommand): void {
    if (!this.child || !this.child.stdin.writable) {
      command.reject(new Error("Shell session unavailable"));
      this.active = null;
      this.processQueue();
      return;
    }

    let cdPrefix = "";
    try {
      const targetCwd = resolveCwd(command.cwd ?? this.baseDir, this.baseDir, this.allowEscape);
      cdPrefix = this.isWindows
        ? `cd /d ${quoteWindowsCommandValue(targetCwd)}\n`
        : `cd "${targetCwd.replace(/"/g, '\\"')}"\n`;
    } catch (error) {
      command.reject(error instanceof Error ? error : new Error(String(error)));
      this.active = null;
      this.processQueue();
      return;
    }
    const sentinel = `${SHELL_CONTROL.SENTINEL_PREFIX}${command.id}`;
    const exitProbe = this.isWindows
      ? `echo ${sentinel}:%errorlevel%`
      : `printf "${sentinel}:%s\\n" $?`;
    const payload = `${cdPrefix}${command.command}\n${exitProbe}\n`;
    this.child.stdin.write(payload);

    if (command.timeoutMs) {
      this.timer = setTimeout(() => {
        if (this.child) {
          this.terminateChildProcess(this.child);
          this.finishActive(null, SIGNAL.SIGTERM);
        }
      }, command.timeoutMs);
    }
  }

  private checkForCompletion(): void {
    if (!this.active) return;
    const sentinel = `${SHELL_CONTROL.SENTINEL_PREFIX}${this.active.id}`;
    const markerIndex = this.stdoutBuffer.indexOf(sentinel);
    if (markerIndex < 0) return;

    const afterMarker = this.stdoutBuffer.slice(markerIndex + sentinel.length);
    const lineBreakIndex = afterMarker.indexOf("\n");
    if (lineBreakIndex < 0) return;

    const exitToken = afterMarker.slice(1, lineBreakIndex).trim();
    const parsedExit = Number.parseInt(exitToken, 10);
    const exitCode = Number.isNaN(parsedExit) ? null : parsedExit;
    const stdout = this.stdoutBuffer.slice(0, markerIndex);
    this.stdoutCarry = afterMarker.slice(lineBreakIndex + 1);
    this.finishActive(exitCode, null, stdout);
  }

  private finishActive(
    exitCode: number | null,
    signal: NodeJS.Signals | null,
    stdoutOverride?: string
  ): void {
    if (!this.active) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    const stdout = stdoutOverride ?? this.stdoutBuffer;
    const result: ShellCommandResult = {
      stdout: stdout.trimEnd(),
      stderr: this.stderrBuffer.trimEnd(),
      exitCode,
      signal,
    };
    this.active.resolve(result);
    this.active = null;
    this.processQueue();
  }

  private rejectPendingCommands(message: string): void {
    const active = this.active;
    this.active = null;
    if (active) {
      active.reject(new Error(message));
    }

    while (this.queue.length > 0) {
      const pending = this.queue.shift();
      if (!pending) {
        continue;
      }
      pending.reject(new Error(message));
    }
  }

  private terminateChildProcess(child: ChildProcessWithoutNullStreams): void {
    if (!child.killed) {
      child.kill(SIGNAL.SIGTERM);
    }
    if (this.isWindows) {
      child.kill(SIGNAL.SIGKILL);
    }
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.rejectPendingCommands(SHELL_CONTROL.DISPOSE_ERROR_MESSAGE);
    if (this.child) {
      this.terminateChildProcess(this.child);
    }
    this.child = undefined;
  }
}

export class ShellSessionManager {
  private session?: ShellSession;

  constructor(private readonly options: ShellSessionOptions = {}) {}

  async execute(command: string, options: ShellCommandOptions = {}): Promise<ShellCommandResult> {
    if (EnvManager.getInstance().getEnvironment() === ENV_VALUE.TEST) {
      const session = new ShellSession(this.options);
      try {
        return await session.execute(command, options);
      } finally {
        session.dispose();
      }
    }

    if (!this.session) {
      this.session = new ShellSession(this.options);
    }
    return this.session.execute(command, options);
  }

  async complete(prefix: string): Promise<string[]> {
    if (!prefix) return [];
    if (process.platform === PLATFORM.WIN32) return [];

    const escaped = prefix.replace(/(["\\$`])/g, "\\$1");
    const completionCommand = `compgen -cdf -- "${escaped}"`;
    const result = await this.execute(completionCommand);
    const lines = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return lines.slice(0, LIMIT.SHELL_COMPLETION_MAX_RESULTS);
  }

  dispose(): void {
    this.session?.dispose();
    this.session = undefined;
  }
}

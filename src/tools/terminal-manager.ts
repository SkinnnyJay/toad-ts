import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { resolve } from "node:path";

import { LIMIT } from "@/config/limits";
import { ENV_KEY } from "@/constants/env-keys";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import { nanoid } from "nanoid";

export interface TerminalSessionOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  outputByteLimit?: number;
}

export interface TerminalSessionOutput {
  output: string;
  truncated: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export interface TerminalManagerOptions {
  baseDir?: string;
  allowEscape?: boolean;
  env?: NodeJS.ProcessEnv;
}

const shouldAllowEscape = (env?: NodeJS.ProcessEnv, override?: boolean): boolean => {
  if (override !== undefined) return override;
  const source = env ?? EnvManager.getInstance().getSnapshot();
  const raw = source[ENV_KEY.TOADSTOOL_ALLOW_ESCAPE];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const isPathEscape = (value: string): boolean => {
  if (!value) return false;
  return value
    .split(/\s+/)
    .some((part) => part.startsWith("../") || part === ".." || part.includes("/../"));
};

const resolveCwd = (candidate: string, base: string, allowEscape: boolean): string => {
  const normalizedBase = resolve(base);
  const resolved = resolve(normalizedBase, candidate);
  if (allowEscape) return resolved;
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error(`Cwd escapes base directory: ${candidate}`);
  }
  return resolved;
};

const trimOutputByBytes = (
  value: string,
  limit: number
): { output: string; truncated: boolean } => {
  if (limit <= 0) return { output: value, truncated: false };
  let output = value;
  let truncated = false;
  while (Buffer.byteLength(output, "utf8") > limit && output.length > 0) {
    output = output.slice(1);
    truncated = true;
  }
  return { output, truncated };
};

class TerminalSession {
  private output = "";
  private truncated = false;
  private exitCode: number | null = null;
  private signal: NodeJS.Signals | null = null;
  private readonly outputLimit: number;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly exitPromise: Promise<TerminalSessionOutput>;

  constructor(options: TerminalSessionOptions) {
    this.outputLimit = options.outputByteLimit ?? LIMIT.TERMINAL_OUTPUT_MAX_BYTES;
    this.child = spawn(options.command, options.args ?? [], {
      cwd: options.cwd,
      env: options.env,
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");

    this.child.stdout.on("data", (chunk: string) => this.appendOutput(chunk));
    this.child.stderr.on("data", (chunk: string) => this.appendOutput(chunk));

    this.exitPromise = new Promise((resolvePromise) => {
      let resolved = false;
      const resolveOnce = (): void => {
        if (resolved) return;
        resolved = true;
        resolvePromise(this.snapshot());
      };

      this.child.on("error", (error) => {
        this.appendOutput(error.message);
        resolveOnce();
      });
      this.child.on("close", (code, signal) => {
        this.exitCode = code;
        this.signal = signal;
        resolveOnce();
      });
    });
  }

  snapshot(): TerminalSessionOutput {
    return {
      output: this.output,
      truncated: this.truncated,
      exitCode: this.exitCode,
      signal: this.signal,
    };
  }

  async waitForExit(): Promise<TerminalSessionOutput> {
    return this.exitPromise;
  }

  kill(): void {
    if (this.exitCode !== null || this.signal !== null) {
      return;
    }
    this.child.kill(SIGNAL.SIGTERM);
  }

  release(): void {
    this.kill();
  }

  private appendOutput(chunk: string): void {
    const combined = this.output + chunk;
    const trimmed = trimOutputByBytes(combined, this.outputLimit);
    this.output = trimmed.output;
    this.truncated = this.truncated || trimmed.truncated;
  }
}

export class TerminalManager {
  private readonly baseDir: string;
  private readonly allowEscape: boolean;
  private readonly baseEnv: NodeJS.ProcessEnv;
  private readonly sessions = new Map<string, TerminalSession>();

  constructor(options: TerminalManagerOptions = {}) {
    this.baseDir = options.baseDir ?? process.cwd();
    this.allowEscape = shouldAllowEscape(options.env, options.allowEscape);
    this.baseEnv = options.env ?? {};
  }

  createSession(options: TerminalSessionOptions): string {
    if (
      !this.allowEscape &&
      (isPathEscape(options.command) || (options.args ?? []).some(isPathEscape))
    ) {
      throw new Error("Command rejected: path escape detected");
    }

    const cwd = resolveCwd(options.cwd ?? this.baseDir, this.baseDir, this.allowEscape);
    const env = { ...EnvManager.getInstance().getSnapshot(), ...this.baseEnv, ...options.env };
    const terminalId = `term-${nanoid(LIMIT.NANOID_LENGTH)}`;
    const session = new TerminalSession({ ...options, cwd, env });
    this.sessions.set(terminalId, session);
    return terminalId;
  }

  getOutput(terminalId: string): TerminalSessionOutput {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }
    return session.snapshot();
  }

  async waitForExit(terminalId: string): Promise<TerminalSessionOutput> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }
    return session.waitForExit();
  }

  kill(terminalId: string): void {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }
    session.kill();
  }

  release(terminalId: string): void {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }
    session.release();
    this.sessions.delete(terminalId);
  }
}

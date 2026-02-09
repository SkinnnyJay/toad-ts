import { spawn } from "node:child_process";
import { isAbsolute, normalize, resolve } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  allowEscape?: boolean;
  baseCwd?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
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
  const resolved = isAbsolute(candidate)
    ? normalize(candidate)
    : resolve(normalizedBase, candidate);
  if (allowEscape) return resolved;
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error(`Cwd escapes base directory: ${candidate}`);
  }
  return resolved;
};

export class TerminalHandler {
  private readonly defaultCwd: string;
  private readonly allowEscape: boolean;

  constructor(
    options: { defaultCwd?: string; allowEscape?: boolean; env?: NodeJS.ProcessEnv } = {}
  ) {
    this.defaultCwd = options.defaultCwd ?? process.cwd();
    this.allowEscape = shouldAllowEscape(options.env, options.allowEscape);
  }

  async exec(command: string, args: string[] = [], options: ExecOptions = {}): Promise<ExecResult> {
    const allowEscape = shouldAllowEscape(options.env, options.allowEscape ?? this.allowEscape);
    if (!allowEscape && (isPathEscape(command) || args.some((arg) => isPathEscape(arg)))) {
      throw new Error("Command rejected: path escape detected");
    }
    const cwd = resolveCwd(
      options.cwd ?? this.defaultCwd,
      options.baseCwd ?? this.defaultCwd,
      allowEscape
    );
    const env = { ...EnvManager.getInstance().getSnapshot(), ...options.env };
    return new Promise<ExecResult>((resolve, reject) => {
      const child = spawn(command, args, { cwd, env });
      let stdout = "";
      let stderr = "";
      let finished = false;

      const complete = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
        if (finished) return;
        finished = true;
        resolve({ stdout, stderr, exitCode, signal });
      };

      child.stdout.setEncoding(ENCODING.UTF8);
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.setEncoding(ENCODING.UTF8);
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        if (finished) return;
        finished = true;
        reject(error);
      });

      child.on("close", (code, signal) => complete(code, signal));

      if (options.timeoutMs && options.timeoutMs > 0) {
        setTimeout(() => {
          if (!finished) {
            child.kill(SIGNAL.SIGTERM);
            complete(child.exitCode, child.signalCode);
          }
        }, options.timeoutMs).unref();
      }
    });
  }
}

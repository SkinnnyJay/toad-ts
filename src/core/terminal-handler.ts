import { spawn } from "node:child_process";
import { isAbsolute, normalize, resolve } from "node:path";
import { TERMINAL_KILL_GRACE_MS } from "@/config/timeouts";
import { TRUTHY_STRINGS } from "@/constants/boolean-strings";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import { isPathEscape } from "@/utils/pathEscape.utils";

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
  return TRUTHY_STRINGS.has(normalized);
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
      let killTimeout: NodeJS.Timeout | null = null;

      const clearKillTimeout = (): void => {
        if (killTimeout) {
          clearTimeout(killTimeout);
          killTimeout = null;
        }
      };

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
        clearKillTimeout();
        reject(error);
      });

      child.on("close", (code, signal) => {
        clearKillTimeout();
        complete(code, signal);
      });

      if (options.timeoutMs && options.timeoutMs > 0) {
        setTimeout(() => {
          if (!finished) {
            child.kill(SIGNAL.SIGTERM);
            killTimeout = setTimeout(() => {
              if (!finished) {
                child.kill(SIGNAL.SIGKILL);
              }
            }, TERMINAL_KILL_GRACE_MS);
            killTimeout.unref();
          }
        }, options.timeoutMs).unref();
      }
    });
  }
}

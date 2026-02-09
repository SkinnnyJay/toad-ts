import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { EnvManager } from "@/utils/env/env.utils";

export interface ReadFileOptions {
  encoding?: BufferEncoding;
  baseDir?: string;
}

export interface WriteFileOptions {
  encoding?: BufferEncoding;
  baseDir?: string;
  mode?: number;
}

export interface FsHandlerOptions {
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

const resolveWorkSubdir = (env?: NodeJS.ProcessEnv): string | undefined => {
  const source = env ?? EnvManager.getInstance().getSnapshot();
  const raw = source[ENV_KEY.TOADSTOOL_WORK_SUBDIR];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;

  // Reject absolute paths
  if (isAbsolute(trimmed)) {
    throw new Error(
      `TOADSTOOL_WORK_SUBDIR must be a relative path within the current working directory, got: ${trimmed}`
    );
  }

  // Reject path traversal attempts
  if (trimmed.includes("..")) {
    throw new Error(`TOADSTOOL_WORK_SUBDIR cannot contain path traversal (..), got: ${trimmed}`);
  }

  // Normalize: remove leading ./ if present
  const normalized = trimmed.startsWith("./") ? trimmed.slice(2) : trimmed;

  return normalized;
};

export class FsHandler {
  private readonly allowEscape: boolean;
  private readonly defaultBaseDir: string;

  constructor(options: FsHandlerOptions = {}) {
    const cwd = options.baseDir ?? process.cwd();
    const subdir = resolveWorkSubdir(options.env);
    const effectiveBaseDir = subdir ? join(cwd, subdir) : cwd;
    this.defaultBaseDir = effectiveBaseDir;
    this.allowEscape = shouldAllowEscape(options.env, options.allowEscape);
  }

  async read(filePath: string, options: ReadFileOptions = {}): Promise<string> {
    const target = this.resolvePath(filePath, options.baseDir);
    const data = await readFile(target, { encoding: options.encoding ?? "utf8" });
    return data.toString();
  }

  async write(
    filePath: string,
    content: string | Buffer,
    options: WriteFileOptions = {}
  ): Promise<void> {
    const target = this.resolvePath(filePath, options.baseDir);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { encoding: options.encoding, mode: options.mode });
  }

  async exists(filePath: string, baseDir?: string): Promise<boolean> {
    const target = this.resolvePath(filePath, baseDir);
    try {
      await stat(target);
      return true;
    } catch (error) {
      if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
        return false;
      }
      throw error;
    }
  }

  resolve(filePath: string, baseDir?: string): string {
    return this.resolvePath(filePath, baseDir);
  }

  private resolvePath(filePath: string, baseDir?: string): string {
    const base = baseDir ?? this.defaultBaseDir;
    const candidate = isAbsolute(filePath) ? normalize(filePath) : resolve(base, filePath);
    const normalizedBase = resolve(base);
    if (this.allowEscape) {
      return candidate;
    }
    if (!candidate.startsWith(normalizedBase)) {
      throw new Error(`Path escapes base directory: ${filePath}`);
    }
    return candidate;
  }
}

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

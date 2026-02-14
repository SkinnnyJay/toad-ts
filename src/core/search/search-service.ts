import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { isAbsolute, normalize, resolve } from "node:path";

import { TRUTHY_STRINGS } from "@/constants/boolean-strings";
import { ENV_KEY } from "@/constants/env-keys";
import { SEARCH_GLOB_EXCLUDES } from "@/constants/ignore-patterns";
import { EnvManager } from "@/utils/env/env.utils";
import { acquireProcessSlot, bindProcessSlotToChild } from "@/utils/process-concurrency.utils";
import { rgPath } from "@vscode/ripgrep";
import fg from "fast-glob";
import fuzzysort from "fuzzysort";

export interface TextSearchResult {
  file: string;
  line: number;
  column: number;
  text: string;
}

export interface SearchIndexEntry {
  path: string;
}

export interface SearchOptions {
  baseDir?: string;
  allowEscape?: boolean;
  glob?: string[];
  exclude?: string[];
}

const DEFAULT_EXCLUDES = SEARCH_GLOB_EXCLUDES;

const shouldAllowEscape = (env?: NodeJS.ProcessEnv, override?: boolean): boolean => {
  if (override !== undefined) return override;
  const source = env ?? EnvManager.getInstance().getSnapshot();
  const raw = source[ENV_KEY.TOADSTOOL_ALLOW_ESCAPE];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return TRUTHY_STRINGS.has(normalized);
};

const isEscape = (value: string): boolean => {
  if (!value) return false;
  return value.includes("..") || value.startsWith("/");
};

const resolveBase = (baseDir?: string): string => resolve(baseDir ?? process.cwd());

const normalizePath = (candidate: string, baseDir: string, allowEscape: boolean): string => {
  const resolved = isAbsolute(candidate) ? normalize(candidate) : resolve(baseDir, candidate);
  if (allowEscape) return resolved;
  if (!resolved.startsWith(baseDir)) {
    throw new Error(`Path escapes base directory: ${candidate}`);
  }
  return resolved;
};

export class SearchService {
  private readonly baseDir: string;
  private readonly allowEscape: boolean;
  private readonly excludes: readonly string[];

  constructor(options: { baseDir?: string; allowEscape?: boolean; env?: NodeJS.ProcessEnv } = {}) {
    this.baseDir = resolveBase(options.baseDir);
    this.allowEscape = shouldAllowEscape(options.env, options.allowEscape);
    this.excludes = DEFAULT_EXCLUDES;
  }

  async index(
    patterns: string[] = ["**/*"],
    options: SearchOptions = {}
  ): Promise<SearchIndexEntry[]> {
    const base = resolveBase(options.baseDir ?? this.baseDir);
    const allowEscape = shouldAllowEscape(undefined, options.allowEscape ?? this.allowEscape);
    const globs = patterns.length ? patterns : ["**/*"];
    const exclude = options.exclude ? [...options.exclude] : [...this.excludes];
    const results = await fg(globs, {
      cwd: base,
      dot: false,
      ignore: exclude,
      onlyFiles: true,
      absolute: true,
    });
    const filtered = results
      .map((p) => normalizePath(p, base, allowEscape))
      .filter((p) => allowEscape || p.startsWith(base));
    return filtered.map((p) => ({ path: p }));
  }

  async textSearch(query: string, options: SearchOptions = {}): Promise<TextSearchResult[]> {
    const base = resolveBase(options.baseDir ?? this.baseDir);
    const allowEscape = shouldAllowEscape(undefined, options.allowEscape ?? this.allowEscape);
    if (!allowEscape && options.glob?.some(isEscape)) {
      throw new Error("Glob escapes base directory");
    }

    const args = ["--no-heading", "--line-number", "--column", "--color", "never", query];
    const exclude = options.exclude ?? this.excludes;
    exclude.forEach((pattern) => {
      args.push("--glob");
      args.push(`!${pattern}`);
    });
    options.glob?.forEach((pattern) => {
      args.push("--glob");
      args.push(pattern);
    });
    args.push(".");

    const resolvedBase = normalizePath(base, base, allowEscape);
    const stdout = await this.spawnRg(args, resolvedBase);
    const lines = stdout.trim() ? stdout.trim().split("\n") : [];
    return lines
      .map((line) => this.parseRgLine(line, resolvedBase))
      .filter((r): r is TextSearchResult => r !== null);
  }

  async fuzzyFind(needle: string, haystack: string[]): Promise<string[]> {
    const results = fuzzysort.go(needle, haystack);
    return results.map((r) => r.target);
  }

  async buildIndex(patterns: string[] = ["**/*"], options: SearchOptions = {}): Promise<string[]> {
    const base = resolveBase(options.baseDir ?? this.baseDir);
    const allowEscape = shouldAllowEscape(undefined, options.allowEscape ?? this.allowEscape);
    const exclude = options.exclude ? [...options.exclude] : [...this.excludes];
    const files = await fg(patterns, {
      cwd: base,
      dot: false,
      ignore: exclude,
      onlyFiles: true,
      absolute: true,
    });
    return files
      .map((p) => normalizePath(p, base, allowEscape))
      .filter((p) => allowEscape || p.startsWith(base));
  }

  private async spawnRg(args: string[], cwd: string): Promise<string> {
    return new Promise<string>((resolvePromise, reject) => {
      const releaseSlot = acquireProcessSlot("search-service-rg");
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(rgPath, args, { cwd });
      } catch (error) {
        releaseSlot();
        reject(error);
        return;
      }
      bindProcessSlotToChild(child, releaseSlot);
      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });

      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code !== 0 && code !== 1) {
          return reject(new Error(stderr || `rg exited with code ${code}`));
        }
        return resolvePromise(stdout);
      });
    });
  }

  private parseRgLine(line: string, baseDir: string): TextSearchResult | null {
    const match = line.match(/^(.*?):(\d+):(\d+):(.*)$/);
    if (!match) return null;
    const [, file = "", lineStr = "0", colStr = "0", text = ""] = match;
    const filePath = normalizePath(file, baseDir, true);
    return {
      file: filePath,
      line: Number.parseInt(lineStr, 10),
      column: Number.parseInt(colStr, 10),
      text,
    };
  }
}

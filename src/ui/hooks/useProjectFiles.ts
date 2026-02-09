import { readFile } from "node:fs/promises";
import path from "node:path";
import { LIMIT } from "@/config/limits";
import { IGNORE_PATTERN } from "@/constants/ignore-patterns";
import fg from "fast-glob";
import ignore from "ignore";
import { useEffect, useState } from "react";

const toPosix = (value: string): string => value.split(path.sep).join("/");

/**
 * Creates an ignore filter based on default patterns and .gitignore.
 */
export const createIgnoreFilter = async (
  cwd: string
): Promise<(relativePath: string) => boolean> => {
  const ig = ignore();
  ig.add(IGNORE_PATTERN.PROJECT_FILES);
  try {
    const gitignore = await readFile(path.join(cwd, ".gitignore"), "utf8");
    ig.add(gitignore);
  } catch (_error) {
    // ignore missing .gitignore
  }
  return (relativePath: string): boolean => ig.ignores(toPosix(relativePath));
};

export interface UseProjectFilesResult {
  filePaths: string[];
  isLoading: boolean;
  error: string | null;
}

export interface UseProjectFilesOptions {
  enabled?: boolean;
  cwd?: string;
  maxFiles?: number;
}

/**
 * Hook to load project files for @-mention suggestions.
 * Respects .gitignore and default ignore patterns.
 */
export function useProjectFiles({
  enabled = true,
  cwd = process.cwd(),
  maxFiles = LIMIT.MAX_FILES,
}: UseProjectFilesOptions = {}): UseProjectFilesResult {
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const loadFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const shouldIgnore = await createIgnoreFilter(cwd);
        const files = await fg("**/*", {
          cwd,
          onlyFiles: true,
          dot: false,
        });
        if (cancelled) return;
        const filtered = files.filter((file) => !shouldIgnore(file)).slice(0, maxFiles);
        setFilePaths(filtered);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [enabled, cwd, maxFiles]);

  return { filePaths, isLoading, error };
}

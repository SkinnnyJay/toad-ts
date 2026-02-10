import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import fg from "fast-glob";

const logger = createClassLogger("InstructionsLoader");

export interface LoadedInstruction {
  source: string;
  content: string;
}

const isRemoteUrl = (value: string): boolean =>
  value.startsWith("http://") || value.startsWith("https://");

const isGlob = (value: string): boolean =>
  value.includes("*") || value.includes("?") || value.includes("{");

const fetchRemoteContent = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "text/plain, text/markdown" },
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    logger.warn("Failed to fetch remote instruction", { url });
    return null;
  }
};

/**
 * Load instructions from an array of sources (files, globs, remote URLs).
 * Used for the `instructions` config array.
 */
export const loadInstructions = async (
  sources: string[],
  cwd: string
): Promise<LoadedInstruction[]> => {
  const instructions: LoadedInstruction[] = [];

  for (const source of sources) {
    if (isRemoteUrl(source)) {
      const content = await fetchRemoteContent(source);
      if (content) {
        instructions.push({ source, content });
      }
      continue;
    }

    if (isGlob(source)) {
      const pattern = isAbsolute(source) ? source : join(cwd, source);
      try {
        const matches = await fg(pattern, { cwd, absolute: true, onlyFiles: true });
        for (const match of matches) {
          try {
            const content = await readFile(match, ENCODING.UTF8);
            instructions.push({ source: match, content });
          } catch {
            // Skip unreadable files
          }
        }
      } catch {
        logger.warn("Glob pattern failed", { source });
      }
      continue;
    }

    // Plain file path
    const filePath = isAbsolute(source) ? source : join(cwd, source);
    try {
      const content = await readFile(filePath, ENCODING.UTF8);
      instructions.push({ source: filePath, content });
    } catch {
      // Skip non-existent files
    }
  }

  logger.info("Loaded instructions", { count: instructions.length, sources: sources.length });
  return instructions;
};

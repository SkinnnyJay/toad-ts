import { extname } from "node:path";
import type { FormatterConfig } from "@/config/app-config";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { execa } from "execa";

const logger = createClassLogger("CodeFormatter");

export interface FormatResult {
  formatted: boolean;
  error?: string;
}

/**
 * Run a code formatter on a file based on its extension and the formatter config.
 * Called after agent write/edit operations.
 */
export const formatFile = async (
  filePath: string,
  formatters: Record<string, FormatterConfig>
): Promise<FormatResult> => {
  const ext = extname(filePath);
  if (!ext) return { formatted: false };

  for (const [name, config] of Object.entries(formatters)) {
    if (config.disabled) continue;
    if (!config.extensions?.includes(ext)) continue;
    if (!config.command || config.command.length === 0) continue;

    const command = config.command.map((part) => (part === "$FILE" ? filePath : part));
    const [cmd, ...args] = command;
    if (!cmd) continue;

    try {
      await execa(cmd, args, { timeout: 30_000 });
      logger.info("Formatted file", { formatter: name, file: filePath });
      return { formatted: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Formatter failed", { formatter: name, file: filePath, error: message });
      return { formatted: false, error: message };
    }
  }

  return { formatted: false };
};

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { DEFAULT_COMMAND, TEMP_DIR_PREFIX, TEMP_FILE_NAME } from "@/constants/editor";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { runInteractiveShellCommand } from "@/tools/interactive-shell";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import type { CliRenderer } from "@opentui/core";

export interface ExternalEditorOptions {
  initialValue?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  renderer: CliRenderer;
}

const logger = createClassLogger("ExternalEditor");

const quoteShellArg = (value: string): string => {
  const escaped = value.replace(/["\\$`]/g, "\\$&");
  return `"${escaped}"`;
};

const resolveEditorCommand = (env: NodeJS.ProcessEnv): string => {
  return env[ENV_KEY.VISUAL] ?? env[ENV_KEY.EDITOR] ?? DEFAULT_COMMAND;
};

export const openExternalEditor = async (
  options: ExternalEditorOptions
): Promise<string | null> => {
  const env = { ...EnvManager.getInstance().getSnapshot(), ...options.env };
  const editorCommand = resolveEditorCommand(env).trim();
  if (!editorCommand) {
    return null;
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), TEMP_DIR_PREFIX));
  const filePath = path.join(tempDir, TEMP_FILE_NAME);

  try {
    await writeFile(filePath, options.initialValue ?? "", ENCODING.UTF8);
    const command = `${editorCommand} ${quoteShellArg(filePath)}`;
    await runInteractiveShellCommand({
      command,
      cwd: options.cwd,
      env,
      renderer: options.renderer,
    });

    const result = await readFile(filePath, ENCODING.UTF8);
    return result;
  } catch (error) {
    logger.warn("External editor failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

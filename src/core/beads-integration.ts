import { TIMEOUT } from "@/config/timeouts";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { execa } from "execa";

const logger = createClassLogger("BeadsIntegration");

const BD_COMMAND = "bd";

/**
 * Check if the Beads (bd) CLI tool is installed.
 */
export const isBeadsInstalled = async (): Promise<boolean> => {
  try {
    await execa("which", [BD_COMMAND], { timeout: TIMEOUT.COMMAND_DISCOVERY_MS });
    return true;
  } catch {
    return false;
  }
};

/**
 * Run `bd prime` to load task/memory context at session start.
 * Used as a SessionStart hook.
 */
export const beadsPrime = async (cwd?: string): Promise<string> => {
  try {
    const { stdout } = await execa(BD_COMMAND, ["prime"], {
      cwd: cwd ?? process.cwd(),
      timeout: TIMEOUT.BEADS_COMMAND_MS,
    });
    logger.info("Beads prime completed", { output: stdout.slice(0, 200) });
    return stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Beads prime failed", { error: message });
    return `bd prime failed: ${message}`;
  }
};

/**
 * Run `bd sync` to synchronize task state before compaction.
 * Used as a PreCompact hook.
 */
export const beadsSync = async (cwd?: string): Promise<string> => {
  try {
    const { stdout } = await execa(BD_COMMAND, ["sync"], {
      cwd: cwd ?? process.cwd(),
      timeout: TIMEOUT.BEADS_COMMAND_MS,
    });
    logger.info("Beads sync completed");
    return stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Beads sync failed", { error: message });
    return `bd sync failed: ${message}`;
  }
};

/**
 * Import tasks from Beads into the session plan view.
 */
export const beadsImportTasks = async (
  cwd?: string
): Promise<Array<{ id: string; title: string; status: string }>> => {
  try {
    const { stdout } = await execa(BD_COMMAND, ["tasks", "--json"], {
      cwd: cwd ?? process.cwd(),
      timeout: TIMEOUT.BEADS_COMMAND_MS,
    });
    const parsed = JSON.parse(stdout) as Array<{ id: string; title: string; status: string }>;
    return parsed;
  } catch {
    return [];
  }
};

/**
 * Export session plan tasks to Beads.
 */
export const beadsExportTasks = async (
  tasks: Array<{ title: string; status: string }>,
  cwd?: string
): Promise<boolean> => {
  try {
    const input = JSON.stringify(tasks);
    await execa(BD_COMMAND, ["import", "--json"], {
      cwd: cwd ?? process.cwd(),
      input,
      timeout: TIMEOUT.BEADS_COMMAND_MS,
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Create Beads hook definitions for the hooks config.
 */
export const createBeadsHooks = () => ({
  SessionStart: [
    {
      matcher: "*",
      hooks: [{ type: "command" as const, command: `${BD_COMMAND} prime` }],
    },
  ],
  PreCompact: [
    {
      matcher: "*",
      hooks: [{ type: "command" as const, command: `${BD_COMMAND} sync` }],
    },
  ],
});

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { DISCOVERY_SUBPATH } from "@/constants/discovery-subpaths";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { TOOL_DIRS, type ToolSource } from "./discovery-paths";

const logger = createClassLogger("HooksLoader");

export interface LoadedHookScript {
  name: string;
  filePath: string;
  source: ToolSource;
  executable: boolean;
}

export interface LoadedHookConfig {
  source: ToolSource;
  filePath: string;
  config: unknown;
}

/**
 * Scan hook script directories (.toadstool/hooks/, .claude/hooks/).
 */
export const loadHookScripts = async (cwd: string): Promise<LoadedHookScript[]> => {
  const hookDirs = [
    {
      source: "TOADSTOOL" as ToolSource,
      dir: join(cwd, TOOL_DIRS.TOADSTOOL.project, DISCOVERY_SUBPATH.HOOKS),
    },
    {
      source: "TOADSTOOL" as ToolSource,
      dir: join(TOOL_DIRS.TOADSTOOL.global, DISCOVERY_SUBPATH.HOOKS),
    },
    {
      source: "CLAUDE" as ToolSource,
      dir: join(cwd, TOOL_DIRS.CLAUDE.project, DISCOVERY_SUBPATH.HOOKS),
    },
    {
      source: "CLAUDE" as ToolSource,
      dir: join(TOOL_DIRS.CLAUDE.global, DISCOVERY_SUBPATH.HOOKS),
    },
  ];

  const scripts: LoadedHookScript[] = [];

  for (const { source, dir } of hookDirs) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const filePath = join(dir, entry);
        try {
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) continue;
          // Skip settings.json — that's hook config, not a hook script
          if (entry === "settings.json") continue;
          scripts.push({
            name: entry,
            filePath,
            source,
            executable: Boolean(fileStat.mode & 0o111),
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Loaded hook scripts", { count: scripts.length });
  return scripts;
};

/**
 * Load hook configuration from settings.json files.
 * Scans .toadstool/settings.json and .claude/settings.json.
 */
export const loadHookConfigs = async (cwd: string): Promise<LoadedHookConfig[]> => {
  const configFiles = [
    {
      source: "TOADSTOOL" as ToolSource,
      filePath: join(cwd, TOOL_DIRS.TOADSTOOL.project, "settings.json"),
    },
    {
      source: "TOADSTOOL" as ToolSource,
      filePath: join(TOOL_DIRS.TOADSTOOL.global, "settings.json"),
    },
    {
      source: "CLAUDE" as ToolSource,
      filePath: join(cwd, TOOL_DIRS.CLAUDE.project, "settings.json"),
    },
    { source: "CLAUDE" as ToolSource, filePath: join(TOOL_DIRS.CLAUDE.global, "settings.json") },
  ];

  const configs: LoadedHookConfig[] = [];

  for (const { source, filePath } of configFiles) {
    try {
      const content = await readFile(filePath, ENCODING.UTF8);
      const parsed = JSON.parse(content) as unknown;
      configs.push({ source, filePath, config: parsed });
    } catch {
      // Skip non-existent or unreadable config files
    }
  }

  logger.info("Loaded hook configs", { count: configs.length });
  return configs;
};

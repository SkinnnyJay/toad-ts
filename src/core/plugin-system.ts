import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("PluginSystem");

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  tools?: Record<string, PluginToolDefinition>;
  hooks?: Record<string, PluginHookDefinition>;
}

export interface PluginToolDefinition {
  description: string;
  parameters?: Record<string, unknown>;
}

export interface PluginHookDefinition {
  event: string;
  matcher?: string;
}

export interface LoadedPlugin {
  name: string;
  version: string;
  description: string;
  dirPath: string;
  manifest: PluginManifest;
  tools: string[];
  hooks: string[];
}

/**
 * Discover plugins from plugin directories.
 * Each plugin is a directory with a plugin.json manifest.
 */
export const discoverPlugins = async (pluginDirs: string[]): Promise<LoadedPlugin[]> => {
  const plugins: LoadedPlugin[] = [];

  for (const dir of pluginDirs) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const pluginDir = join(dir, entry);
        try {
          const dirStat = await stat(pluginDir);
          if (!dirStat.isDirectory()) continue;

          const manifestPath = join(pluginDir, "plugin.json");
          const raw = await readFile(manifestPath, "utf8");
          const manifest = JSON.parse(raw) as PluginManifest;

          if (!manifest.name || !manifest.version) continue;

          plugins.push({
            name: manifest.name,
            version: manifest.version,
            description: manifest.description ?? "",
            dirPath: pluginDir,
            manifest,
            tools: Object.keys(manifest.tools ?? {}),
            hooks: Object.keys(manifest.hooks ?? {}),
          });
        } catch {
          // Skip directories without valid manifests
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Discovered plugins", { count: plugins.length });
  return plugins;
};

/**
 * Get default plugin search directories.
 */
export const getPluginDirs = (cwd: string): string[] => [
  join(cwd, ".toadstool", "plugins"),
  join(cwd, ".opencode", "plugins"),
  join(homedir(), ".config", "toadstool", "plugins"),
];

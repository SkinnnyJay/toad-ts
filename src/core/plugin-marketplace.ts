import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("PluginMarketplace");

const DEFAULT_REGISTRY_URL = "https://toadstool.dev/plugins/registry.json";

export interface MarketplacePlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  repository: string;
  category: "tools" | "hooks" | "providers" | "ui" | "formatters";
  installCommand: string;
  downloads: number;
}

/**
 * Fetch the plugin registry from the marketplace.
 * Returns available plugins that can be installed.
 */
export const fetchPluginRegistry = async (
  registryUrl = DEFAULT_REGISTRY_URL
): Promise<MarketplacePlugin[]> => {
  try {
    const response = await fetch(registryUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      logger.warn("Plugin registry fetch failed", { status: response.status });
      return [];
    }
    const data = (await response.json()) as { plugins?: MarketplacePlugin[] };
    return data.plugins ?? [];
  } catch (error) {
    logger.warn("Plugin registry unreachable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

/**
 * Search plugins by name or description.
 */
export const searchPlugins = (plugins: MarketplacePlugin[], query: string): MarketplacePlugin[] => {
  const lower = query.toLowerCase();
  return plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower)
  );
};

/**
 * Install a plugin by running its install command.
 */
export const installPlugin = async (
  plugin: MarketplacePlugin,
  cwd?: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { execa } = await import("execa");
    const [cmd, ...args] = plugin.installCommand.split(" ");
    if (!cmd) return { ok: false, error: "Invalid install command" };
    await execa(cmd, args, { cwd: cwd ?? process.cwd(), timeout: 60_000 });
    logger.info("Plugin installed", { name: plugin.name, version: plugin.version });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

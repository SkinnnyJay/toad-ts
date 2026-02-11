import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { getDiscoveryLocations } from "./discovery-paths";

const logger = createClassLogger("ResourceLoader");

export interface LoadedResource {
  name: string;
  description: string;
  content: string;
  source: string;
  filePath: string;
  type: "local" | "remote";
}

/**
 * Load resources from .toadstool/resources/ and other tool resource directories.
 * Resources are on-demand instruction sets similar to skills but scoped to specific tasks.
 */
export const loadResources = async (cwd: string): Promise<LoadedResource[]> => {
  const locations = getDiscoveryLocations(cwd, "resources");
  const resources = new Map<string, LoadedResource>();

  for (const location of locations) {
    try {
      const entries = await readdir(location.dir);
      for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const filePath = join(location.dir, entry);
        try {
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) continue;
          const content = await readFile(filePath, ENCODING.UTF8);
          const name = entry.replace(/\.md$/, "");
          if (!resources.has(name)) {
            resources.set(name, {
              name,
              description: content.split("\n")[0]?.replace(/^#\s*/, "") ?? name,
              content,
              source: location.source,
              filePath,
              type: "local",
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Loaded resources", { count: resources.size });
  return Array.from(resources.values());
};

/**
 * Load a remote resource from a URL.
 */
export const loadRemoteResource = async (
  url: string,
  name: string
): Promise<LoadedResource | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "text/plain, text/markdown" },
    });
    if (!response.ok) return null;
    const content = await response.text();
    return {
      name,
      description: content.split("\n")[0]?.replace(/^#\s*/, "") ?? name,
      content,
      source: "remote",
      filePath: url,
      type: "remote",
    };
  } catch {
    logger.warn("Failed to load remote resource", { url });
    return null;
  }
};

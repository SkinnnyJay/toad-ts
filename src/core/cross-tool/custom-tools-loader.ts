import { readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { TOOL_DIRS, type ToolSource } from "./discovery-paths";

const logger = createClassLogger("CustomToolsLoader");

export interface DiscoveredCustomTool {
  name: string;
  filePath: string;
  source: ToolSource;
  extension: string;
}

const TOOL_EXTENSIONS = new Set([".ts", ".js", ".mjs"]);

/**
 * Discover custom tool files from .opencode/tools/ and .toadstool/tools/.
 * Files are discovered but NOT loaded/evaluated — that happens at runtime
 * in a sandboxed context.
 */
export const discoverCustomTools = async (cwd: string): Promise<DiscoveredCustomTool[]> => {
  const toolDirs = [
    { source: "TOADSTOOL" as ToolSource, dir: join(cwd, TOOL_DIRS.TOADSTOOL.project, "tools") },
    { source: "TOADSTOOL" as ToolSource, dir: join(TOOL_DIRS.TOADSTOOL.global, "tools") },
    { source: "OPENCODE" as ToolSource, dir: join(cwd, TOOL_DIRS.OPENCODE.project, "tools") },
    { source: "OPENCODE" as ToolSource, dir: join(TOOL_DIRS.OPENCODE.global, "tools") },
  ];

  const tools: DiscoveredCustomTool[] = [];
  const seenNames = new Set<string>();

  for (const { source, dir } of toolDirs) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const ext = extname(entry);
        if (!TOOL_EXTENSIONS.has(ext)) continue;
        const filePath = join(dir, entry);
        try {
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) continue;
          const name = basename(entry, ext);
          if (seenNames.has(name)) continue;
          seenNames.add(name);
          tools.push({ name, filePath, source, extension: ext });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Discovered custom tools", { count: tools.length });
  return tools;
};

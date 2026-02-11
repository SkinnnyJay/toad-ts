import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { TOOL_DIRS } from "./discovery-paths";

const logger = createClassLogger("McpConfigMerger");

export interface McpServerEntry {
  type: "stdio" | "sse" | "remote";
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface MergedMcpConfig {
  servers: McpServerEntry[];
  sources: string[];
}

const parseMcpJson = (raw: string, filePath: string): McpServerEntry[] => {
  try {
    const parsed = JSON.parse(raw) as {
      mcpServers?: Record<string, unknown>;
      servers?: Record<string, unknown>;
    };
    const serverMap = parsed.mcpServers ?? parsed.servers ?? {};
    const entries: McpServerEntry[] = [];
    for (const [name, config] of Object.entries(serverMap)) {
      if (typeof config !== "object" || config === null) continue;
      const cfg = config as Record<string, unknown>;
      entries.push({
        type: (cfg.type as McpServerEntry["type"]) ?? "stdio",
        name,
        command: cfg.command as string | undefined,
        args: cfg.args as string[] | undefined,
        url: cfg.url as string | undefined,
        env: cfg.env as Record<string, string> | undefined,
        enabled: cfg.enabled !== false,
      });
    }
    return entries;
  } catch {
    logger.warn("Failed to parse MCP config", { filePath });
    return [];
  }
};

/**
 * Load and merge MCP server configs from .cursor/mcp.json and .toadstool/mcp.json.
 * Deduplicates by server name (first occurrence wins).
 */
export const loadMergedMcpConfig = async (cwd: string): Promise<MergedMcpConfig> => {
  const configFiles = [
    join(cwd, TOOL_DIRS.TOADSTOOL.project, "mcp.json"),
    join(cwd, TOOL_DIRS.CURSOR.project, "mcp.json"),
    join(cwd, TOOL_DIRS.OPENCODE.project, "mcp.json"),
  ];

  const servers: McpServerEntry[] = [];
  const sources: string[] = [];
  const seenNames = new Set<string>();

  for (const filePath of configFiles) {
    try {
      const content = await readFile(filePath, ENCODING.UTF8);
      const entries = parseMcpJson(content, filePath);
      for (const entry of entries) {
        if (!seenNames.has(entry.name)) {
          seenNames.add(entry.name);
          servers.push(entry);
        }
      }
      if (entries.length > 0) sources.push(filePath);
    } catch {
      // File doesn't exist
    }
  }

  logger.info("Merged MCP configs", { servers: servers.length, sources: sources.length });
  return { servers, sources };
};

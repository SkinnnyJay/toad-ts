import { loadRemoteResource, loadResources } from "@/core/cross-tool/resource-loader";
import type { ToolContext, ToolDefinition, ToolResult } from "../types";

/**
 * Resource tool: load on-demand instruction sets from resource files.
 * Agents can call this to load context-specific resources.
 */
export const resourceTool: ToolDefinition = {
  name: "resource",
  description: "Load an on-demand resource/instruction set by name or URL",
  parameters: {
    name: { type: "string", description: "Resource name or URL to load" },
  },
  execute: async (args: { name: string }, context: ToolContext): Promise<ToolResult> => {
    const { name } = args;

    if (!name || name.trim().length === 0) {
      return { ok: false, error: "Resource name is required" };
    }

    // Check if it's a URL
    if (name.startsWith("http://") || name.startsWith("https://")) {
      const resource = await loadRemoteResource(name, name);
      if (!resource) {
        return { ok: false, error: `Failed to load remote resource: ${name}` };
      }
      return { ok: true, output: resource.content };
    }

    // Search local resources
    const cwd = context.baseDir ?? process.cwd();
    const resources = await loadResources(cwd);
    const match = resources.find((r) => r.name.toLowerCase() === name.toLowerCase());

    if (!match) {
      const available = resources.map((r) => r.name).join(", ");
      return {
        ok: false,
        error: `Resource "${name}" not found. Available: ${available || "none"}`,
      };
    }

    return { ok: true, output: match.content };
  },
};

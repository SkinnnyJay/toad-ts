import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";

const ListInputSchema = z.object({
  path: z.string().optional(),
  depth: z.number().int().positive().optional(),
});

export type ListToolInput = z.infer<typeof ListInputSchema>;

export const LIST_ENTRY_TYPE = {
  FILE: "file",
  DIRECTORY: "directory",
} as const;

export type ListEntryType = (typeof LIST_ENTRY_TYPE)[keyof typeof LIST_ENTRY_TYPE];

export interface ListEntry {
  path: string;
  type: ListEntryType;
  depth: number;
}

const listDirectory = async (
  dirPath: string,
  depth: number,
  currentDepth: number,
  results: ListEntry[]
): Promise<void> => {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const childPath = join(dirPath, entry.name);
    const type = entry.isDirectory() ? LIST_ENTRY_TYPE.DIRECTORY : LIST_ENTRY_TYPE.FILE;
    results.push({ path: childPath, type, depth: currentDepth });
    if (entry.isDirectory() && currentDepth < depth) {
      await listDirectory(childPath, depth, currentDepth + 1, results);
    }
  }
};

export const listTool: ToolDefinition<ListEntry[]> = {
  name: TOOL_NAME.LIST,
  description: "List directory entries up to a specified depth.",
  kind: TOOL_KIND.READ,
  inputSchema: ListInputSchema,
  execute: async (input, context) => {
    const parsed = ListInputSchema.parse(input);
    const target = parsed.path ?? context.baseDir;
    const resolvedPath = context.fs.resolve(target);
    const depth = parsed.depth ?? 1;
    const results: ListEntry[] = [];
    await listDirectory(resolvedPath, depth, 1, results);
    return { ok: true, output: results };
  },
};

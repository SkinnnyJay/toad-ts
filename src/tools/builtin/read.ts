import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";

const ReadInputSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export type ReadToolInput = z.infer<typeof ReadInputSchema>;

export interface ReadToolOutput {
  content: string;
  lineStart: number;
  lineEnd: number;
}

const sliceLines = (content: string, startLine: number, limit?: number): ReadToolOutput => {
  const lines = content.split(/\r?\n/);
  const startIndex = Math.max(1, startLine) - 1;
  const maxLines = limit ?? Math.max(0, lines.length - startIndex);
  const slice = lines.slice(startIndex, startIndex + maxLines);
  const lineEnd = startIndex + slice.length;

  return {
    content: slice.join("\n"),
    lineStart: startIndex + 1,
    lineEnd,
  };
};

export const readTool: ToolDefinition<ReadToolOutput> = {
  name: TOOL_NAME.READ,
  description: "Read a text file with optional line range.",
  kind: TOOL_KIND.READ,
  inputSchema: ReadInputSchema,
  execute: async (input, context) => {
    const parsed = ReadInputSchema.parse(input);
    const content = await context.fs.read(parsed.path);
    const lineStart = parsed.line ?? 1;
    const output = sliceLines(content, lineStart, parsed.limit);
    return { ok: true, output };
  },
};

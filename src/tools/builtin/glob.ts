import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { SearchIndexEntry } from "@/core/search/search-service";
import type { ToolDefinition } from "@/tools/types";

const GlobInputSchema = z.object({
  patterns: z.array(z.string().min(1)).optional(),
  pattern: z.string().min(1).optional(),
  baseDir: z.string().min(1).optional(),
});

export type GlobToolInput = z.infer<typeof GlobInputSchema>;

const resolvePatterns = (input: GlobToolInput): string[] => {
  if (input.patterns && input.patterns.length > 0) {
    return input.patterns;
  }
  if (input.pattern) {
    return [input.pattern];
  }
  return ["**/*"];
};

export const globTool: ToolDefinition<SearchIndexEntry[]> = {
  name: TOOL_NAME.GLOB,
  description: "Match file paths using glob patterns.",
  kind: TOOL_KIND.SEARCH,
  inputSchema: GlobInputSchema,
  execute: async (input, context) => {
    const parsed = GlobInputSchema.parse(input);
    const patterns = resolvePatterns(parsed);
    const results = await context.search.index(patterns, {
      baseDir: parsed.baseDir,
    });

    return { ok: true, output: results };
  },
};

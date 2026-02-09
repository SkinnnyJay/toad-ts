import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { TextSearchResult } from "@/core/search/search-service";
import type { ToolDefinition } from "@/tools/types";

const GrepInputSchema = z.object({
  query: z.string().min(1),
  glob: z.array(z.string().min(1)).optional(),
  baseDir: z.string().min(1).optional(),
});

export type GrepToolInput = z.infer<typeof GrepInputSchema>;

export const grepTool: ToolDefinition<TextSearchResult[]> = {
  name: TOOL_NAME.GREP,
  description: "Search text files for a regex query using ripgrep.",
  kind: TOOL_KIND.SEARCH,
  inputSchema: GrepInputSchema,
  execute: async (input, context) => {
    const parsed = GrepInputSchema.parse(input);
    const results = await context.search.textSearch(parsed.query, {
      glob: parsed.glob,
      baseDir: parsed.baseDir,
    });

    return { ok: true, output: results };
  },
};

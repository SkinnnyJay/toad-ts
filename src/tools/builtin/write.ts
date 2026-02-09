import { Buffer } from "node:buffer";
import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";

const WriteInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export type WriteToolInput = z.infer<typeof WriteInputSchema>;

export interface WriteToolOutput {
  path: string;
  bytesWritten: number;
}

export const writeTool: ToolDefinition<WriteToolOutput> = {
  name: TOOL_NAME.WRITE,
  description: "Write text content to a file, creating directories as needed.",
  kind: TOOL_KIND.EDIT,
  inputSchema: WriteInputSchema,
  execute: async (input, context) => {
    const parsed = WriteInputSchema.parse(input);
    await context.fs.write(parsed.path, parsed.content);
    return {
      ok: true,
      output: {
        path: parsed.path,
        bytesWritten: Buffer.byteLength(parsed.content, "utf8"),
      },
    };
  },
};

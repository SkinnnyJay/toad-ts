import { Buffer } from "node:buffer";
import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import { getCheckpointManager } from "@/store/checkpoints/checkpoint-service";
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
    const checkpointManager = getCheckpointManager();
    const absolutePath = context.fs.resolve(parsed.path);
    const existed = await context.fs.exists(parsed.path);
    const before = existed ? await context.fs.read(parsed.path) : null;
    await context.fs.write(parsed.path, parsed.content);
    checkpointManager?.recordFileChange({
      path: absolutePath,
      before,
      after: parsed.content,
    });
    return {
      ok: true,
      output: {
        path: parsed.path,
        bytesWritten: Buffer.byteLength(parsed.content, "utf8"),
      },
    };
  },
};

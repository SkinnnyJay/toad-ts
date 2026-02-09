import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";

const EditInputSchema = z.object({
  path: z.string().min(1),
  old_string: z.string().min(1),
  new_string: z.string(),
});

export type EditToolInput = z.infer<typeof EditInputSchema>;

export interface EditToolOutput {
  path: string;
  replaced: boolean;
}

const applyReplacement = (
  content: string,
  oldString: string,
  newString: string
): { updated: string; replaced: boolean } => {
  const index = content.indexOf(oldString);
  if (index < 0) {
    return { updated: content, replaced: false };
  }
  const updated = content.slice(0, index) + newString + content.slice(index + oldString.length);
  return { updated, replaced: true };
};

export const editTool: ToolDefinition<EditToolOutput> = {
  name: TOOL_NAME.EDIT,
  description: "Replace a string in a file with a new value.",
  kind: TOOL_KIND.EDIT,
  inputSchema: EditInputSchema,
  execute: async (input, context) => {
    const parsed = EditInputSchema.parse(input);
    const content = await context.fs.read(parsed.path);
    const { updated, replaced } = applyReplacement(content, parsed.old_string, parsed.new_string);

    if (!replaced) {
      return { ok: false, error: "Old string not found in file." };
    }

    await context.fs.write(parsed.path, updated);

    return {
      ok: true,
      output: {
        path: parsed.path,
        replaced,
      },
    };
  },
};

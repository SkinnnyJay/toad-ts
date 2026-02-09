import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import { type TodoItem, TodoItemSchema } from "@/tools/todo-store";
import type { ToolDefinition } from "@/tools/types";

const TodoWriteInputSchema = z.object({
  merge: z.boolean().optional(),
  items: z.array(TodoItemSchema),
});

export type TodoWriteToolInput = z.infer<typeof TodoWriteInputSchema>;

export const todoWriteTool: ToolDefinition<TodoItem[]> = {
  name: TOOL_NAME.TODO_WRITE,
  description: "Replace or merge the todo list.",
  kind: TOOL_KIND.EDIT,
  inputSchema: TodoWriteInputSchema,
  execute: async (input, context) => {
    const parsed = TodoWriteInputSchema.parse(input);
    const updated = await context.todoStore.upsert(parsed.items, parsed.merge ?? false);
    return { ok: true, output: updated };
  },
};

import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import { TODO_WRITE_DESCRIPTION } from "@/tools/builtin/descriptions/todo-write-description";
import { type TodoItem, TodoItemSchema } from "@/tools/todo-store";
import type { ToolDefinition } from "@/tools/types";

const TodoWriteInputSchema = z.object({
  merge: z.boolean().optional(),
  items: z.array(TodoItemSchema),
});

export type TodoWriteToolInput = z.infer<typeof TodoWriteInputSchema>;

export const todoWriteTool: ToolDefinition<TodoItem[]> = {
  name: TOOL_NAME.TODO_WRITE,
  description: TODO_WRITE_DESCRIPTION,
  kind: TOOL_KIND.EDIT,
  inputSchema: TodoWriteInputSchema,
  execute: async (input, context) => {
    const parsed = TodoWriteInputSchema.parse(input);
    const updated = await context.todoStore.upsert(parsed.items, parsed.merge ?? false);
    if (context.sessionId && context.onTodosUpdated) {
      context.onTodosUpdated(context.sessionId, updated);
    }
    return { ok: true, output: updated };
  },
};

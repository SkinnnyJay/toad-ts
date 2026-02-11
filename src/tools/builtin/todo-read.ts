import { z } from "zod";

import { TODO_STATUS } from "@/constants/todo-status";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import { TODO_READ_DESCRIPTION } from "@/tools/builtin/descriptions/todo-read-description";
import type { TodoItem } from "@/tools/todo-store";
import type { ToolDefinition } from "@/tools/types";

const TodoReadInputSchema = z.object({
  status: z
    .enum([
      TODO_STATUS.PENDING,
      TODO_STATUS.IN_PROGRESS,
      TODO_STATUS.COMPLETED,
      TODO_STATUS.CANCELLED,
    ])
    .optional(),
});

export type TodoReadToolInput = z.infer<typeof TodoReadInputSchema>;

export interface TodoReadToolOutput {
  items: TodoItem[];
  activeCount: number;
}

export const todoReadTool: ToolDefinition<TodoReadToolOutput> = {
  name: TOOL_NAME.TODO_READ,
  description: TODO_READ_DESCRIPTION,
  kind: TOOL_KIND.READ,
  inputSchema: TodoReadInputSchema,
  execute: async (input, context) => {
    const parsed = TodoReadInputSchema.parse(input);
    const items = await context.todoStore.list();
    const filtered = parsed.status ? items.filter((item) => item.status === parsed.status) : items;
    const activeCount = filtered.filter(
      (item) => item.status !== TODO_STATUS.COMPLETED && item.status !== TODO_STATUS.CANCELLED
    ).length;
    if (context.sessionId && context.onTodosUpdated) {
      context.onTodosUpdated(context.sessionId, items);
    }
    return { ok: true, output: { items: filtered, activeCount } };
  },
};

import { z } from "zod";

import { TODO_STATUS } from "@/constants/todo-status";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
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

export const todoReadTool: ToolDefinition<TodoItem[]> = {
  name: TOOL_NAME.TODO_READ,
  description: "Read the current todo list.",
  kind: TOOL_KIND.READ,
  inputSchema: TodoReadInputSchema,
  execute: async (input, context) => {
    const parsed = TodoReadInputSchema.parse(input);
    const items = await context.todoStore.list();
    const filtered = parsed.status ? items.filter((item) => item.status === parsed.status) : items;
    return { ok: true, output: filtered };
  },
};

import { join } from "node:path";
import { z } from "zod";

import { FILE_PATH } from "@/constants/file-paths";
import { TODO_STATUS } from "@/constants/todo-status";
import type { FsHandler } from "@/core/fs-handler";

export const TodoItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  status: z.enum([
    TODO_STATUS.PENDING,
    TODO_STATUS.IN_PROGRESS,
    TODO_STATUS.COMPLETED,
    TODO_STATUS.CANCELLED,
  ]),
});

export type TodoItem = z.infer<typeof TodoItemSchema>;

const TodoListSchema = z.array(TodoItemSchema);

const resolveTodoPath = (baseDir: string): string =>
  join(baseDir, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.TODOS_JSON);

export class TodoStore {
  constructor(
    private readonly fs: FsHandler,
    private readonly baseDir: string
  ) {}

  async list(): Promise<TodoItem[]> {
    const path = resolveTodoPath(this.baseDir);
    const exists = await this.fs.exists(path);
    if (!exists) {
      return [];
    }
    const content = await this.fs.read(path);
    const parsed = TodoListSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return [];
    }
    return parsed.data;
  }

  async save(items: TodoItem[]): Promise<TodoItem[]> {
    const validated = TodoListSchema.parse(items);
    const path = resolveTodoPath(this.baseDir);
    await this.fs.write(path, JSON.stringify(validated, null, 2));
    return validated;
  }

  async upsert(items: TodoItem[], merge = false): Promise<TodoItem[]> {
    if (!merge) {
      return this.save(items);
    }

    const existing = await this.list();
    const merged = this.mergeById(existing, items);
    return this.save(merged);
  }

  private mergeById(existing: TodoItem[], updates: TodoItem[]): TodoItem[] {
    const map = new Map(existing.map((item) => [item.id, item]));
    updates.forEach((item) => {
      map.set(item.id, item);
    });
    return Array.from(map.values());
  }
}

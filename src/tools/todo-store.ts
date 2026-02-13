import { join } from "node:path";
import { z } from "zod";

import { FILE_PATH } from "@/constants/file-paths";
import { INDENT_SPACES } from "@/constants/json-format";
import type { FsHandler } from "@/core/fs-handler";
import { type TodoItem, TodoItemSchema } from "@/types/domain";

export type { TodoItem };
export { TodoItemSchema };

const TodoListSchema = z.array(TodoItemSchema);

const resolveTodoPath = (baseDir: string, sessionId: string | undefined): string =>
  sessionId
    ? join(baseDir, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.TODOS_DIR, `${sessionId}.json`)
    : join(baseDir, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.TODOS_JSON);

export class TodoStore {
  constructor(
    private readonly fs: FsHandler,
    private readonly baseDir: string,
    private readonly sessionId: string | undefined = undefined
  ) {}

  async list(): Promise<TodoItem[]> {
    const path = resolveTodoPath(this.baseDir, this.sessionId);
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
    const path = resolveTodoPath(this.baseDir, this.sessionId);
    await this.fs.write(path, JSON.stringify(validated, null, INDENT_SPACES));
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

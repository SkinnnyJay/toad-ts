import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TODO_STATUS } from "@/constants/todo-status";
import { TOOL_NAME } from "@/constants/tool-names";
import { createToolRuntime } from "@/tools/runtime";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toadstool-todo-write-"));

describe("todo_write tool", () => {
  let baseDir: string;

  beforeEach(async () => {
    EnvManager.resetInstance();
    baseDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("replaces list when merge is false", async () => {
    const runtime = createToolRuntime({ baseDir });
    await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        items: [
          { id: "1", content: "First", status: TODO_STATUS.PENDING },
          { id: "2", content: "Second", status: TODO_STATUS.PENDING },
        ],
      },
      runtime.context
    );
    const replace = await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      { merge: false, items: [{ id: "only", content: "Only", status: TODO_STATUS.PENDING }] },
      runtime.context
    );
    expect(replace.ok).toBe(true);
    const read = await runtime.registry.execute(TOOL_NAME.TODO_READ, {}, runtime.context);
    expect(read.ok).toBe(true);
    if (read.ok) {
      const out = read.output as { items: unknown[] };
      expect(out.items).toHaveLength(1);
      expect(out.items[0]).toMatchObject({ id: "only" });
    }
  });

  it("merges by id when merge is true", async () => {
    const runtime = createToolRuntime({ baseDir });
    await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        items: [
          { id: "a", content: "A", status: TODO_STATUS.PENDING },
          { id: "b", content: "B", status: TODO_STATUS.PENDING },
        ],
      },
      runtime.context
    );
    await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        merge: true,
        items: [
          { id: "b", content: "B updated", status: TODO_STATUS.IN_PROGRESS },
          { id: "c", content: "C", status: TODO_STATUS.PENDING },
        ],
      },
      runtime.context
    );
    const read = await runtime.registry.execute(TOOL_NAME.TODO_READ, {}, runtime.context);
    expect(read.ok).toBe(true);
    if (read.ok) {
      const out = read.output as { items: Array<{ id: string; content: string; status: string }> };
      expect(out.items).toHaveLength(3);
      expect(out.items.find((i) => i.id === "b")).toMatchObject({
        content: "B updated",
        status: TODO_STATUS.IN_PROGRESS,
      });
    }
  });

  it("calls onTodosUpdated when sessionId and callback provided", async () => {
    const onTodosUpdated = vi.fn<void, [string, unknown[]]>();
    const runtime = createToolRuntime({
      baseDir,
      sessionId: "session-1",
      onTodosUpdated,
    });
    const result = await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        items: [{ id: "t1", content: "Task", status: TODO_STATUS.PENDING }],
      },
      runtime.context
    );
    expect(result.ok).toBe(true);
    expect(onTodosUpdated).toHaveBeenCalledTimes(1);
    expect(onTodosUpdated).toHaveBeenCalledWith("session-1", [
      expect.objectContaining({ id: "t1", content: "Task" }),
    ]);
  });
});

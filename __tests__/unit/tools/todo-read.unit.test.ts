import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TODO_STATUS } from "@/constants/todo-status";
import { TOOL_NAME } from "@/constants/tool-names";
import { createToolRuntime } from "@/tools/runtime";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toadstool-todo-read-"));

describe("todo_read tool", () => {
  let baseDir: string;

  beforeEach(async () => {
    EnvManager.resetInstance();
    baseDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("returns items and activeCount", async () => {
    const runtime = createToolRuntime({ baseDir });
    await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        items: [
          { id: "1", content: "P", status: TODO_STATUS.PENDING },
          { id: "2", content: "I", status: TODO_STATUS.IN_PROGRESS },
          { id: "3", content: "C", status: TODO_STATUS.COMPLETED },
          { id: "4", content: "X", status: TODO_STATUS.CANCELLED },
        ],
      },
      runtime.context
    );
    const read = await runtime.registry.execute(TOOL_NAME.TODO_READ, {}, runtime.context);
    expect(read.ok).toBe(true);
    if (read.ok) {
      const out = read.output as { items: unknown[]; activeCount: number };
      expect(out.items).toHaveLength(4);
      expect(out.activeCount).toBe(2);
    }
  });

  it("filters by status when status param provided", async () => {
    const runtime = createToolRuntime({ baseDir });
    await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        items: [
          { id: "1", content: "P", status: TODO_STATUS.PENDING },
          { id: "2", content: "C", status: TODO_STATUS.COMPLETED },
        ],
      },
      runtime.context
    );
    const read = await runtime.registry.execute(
      TOOL_NAME.TODO_READ,
      { status: TODO_STATUS.COMPLETED },
      runtime.context
    );
    expect(read.ok).toBe(true);
    if (read.ok) {
      const out = read.output as { items: unknown[]; activeCount: number };
      expect(out.items).toHaveLength(1);
      expect(out.items[0]).toMatchObject({ id: "2", status: TODO_STATUS.COMPLETED });
      expect(out.activeCount).toBe(0);
    }
  });

  it("calls onTodosUpdated when sessionId and callback provided", async () => {
    const onTodosUpdated = vi.fn<void, [string, unknown[]]>();
    const runtime = createToolRuntime({
      baseDir,
      sessionId: "session-read",
      onTodosUpdated,
    });
    await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      { items: [{ id: "r1", content: "R", status: TODO_STATUS.PENDING }] },
      runtime.context
    );
    onTodosUpdated.mockClear();
    const read = await runtime.registry.execute(TOOL_NAME.TODO_READ, {}, runtime.context);
    expect(read.ok).toBe(true);
    expect(onTodosUpdated).toHaveBeenCalledTimes(1);
    expect(onTodosUpdated).toHaveBeenCalledWith(
      "session-read",
      expect.arrayContaining([expect.objectContaining({ id: "r1" })])
    );
  });
});

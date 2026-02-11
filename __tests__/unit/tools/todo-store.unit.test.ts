import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FILE_PATH } from "@/constants/file-paths";
import { TODO_PRIORITY } from "@/constants/todo-priority";
import { TODO_STATUS } from "@/constants/todo-status";
import { FsHandler } from "@/core/fs-handler";
import { TodoStore } from "@/tools/todo-store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toadstool-todo-store-"));

describe("TodoStore", () => {
  let baseDir: string;
  let fs: FsHandler;

  beforeEach(async () => {
    baseDir = await createTempDir();
    fs = new FsHandler({ baseDir });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("returns empty list when no file exists", async () => {
    const store = new TodoStore(fs, baseDir);
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it("returns empty list when session-scoped file does not exist", async () => {
    const store = new TodoStore(fs, baseDir, "session-1");
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it("saves and lists items (legacy global path)", async () => {
    const store = new TodoStore(fs, baseDir);
    const items = [
      {
        id: "a",
        content: "Task A",
        status: TODO_STATUS.PENDING,
        priority: TODO_PRIORITY.MEDIUM,
      },
      {
        id: "b",
        content: "Task B",
        status: TODO_STATUS.IN_PROGRESS,
        priority: TODO_PRIORITY.HIGH,
      },
    ];
    const saved = await store.save(items);
    expect(saved).toHaveLength(2);
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: "a", content: "Task A", status: TODO_STATUS.PENDING });
    expect(list[1]).toMatchObject({ id: "b", content: "Task B", status: TODO_STATUS.IN_PROGRESS });
  });

  it("saves and lists items (session-scoped path)", async () => {
    const sessionId = "session-xyz";
    const store = new TodoStore(fs, baseDir, sessionId);
    const items = [
      { id: "1", content: "One", status: TODO_STATUS.PENDING },
      { id: "2", content: "Two", status: TODO_STATUS.COMPLETED },
    ];
    await store.save(items);
    const list = await store.list();
    expect(list).toHaveLength(2);
    const expectedPath = join(
      baseDir,
      FILE_PATH.TOADSTOOL_DIR,
      FILE_PATH.TODOS_DIR,
      `${sessionId}.json`
    );
    const raw = await readFile(expectedPath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(2);
  });

  it("upsert replace replaces entire list", async () => {
    const store = new TodoStore(fs, baseDir);
    await store.save([{ id: "old", content: "Old", status: TODO_STATUS.PENDING }]);
    const replacement = [
      { id: "new1", content: "New 1", status: TODO_STATUS.PENDING },
      { id: "new2", content: "New 2", status: TODO_STATUS.IN_PROGRESS },
    ];
    const result = await store.upsert(replacement, false);
    expect(result).toHaveLength(2);
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.id)).toEqual(["new1", "new2"]);
  });

  it("upsert merge merges by id", async () => {
    const store = new TodoStore(fs, baseDir);
    await store.save([
      { id: "a", content: "A", status: TODO_STATUS.PENDING },
      { id: "b", content: "B", status: TODO_STATUS.PENDING },
    ]);
    const updates = [
      { id: "b", content: "B updated", status: TODO_STATUS.IN_PROGRESS },
      { id: "c", content: "C", status: TODO_STATUS.PENDING },
    ];
    const result = await store.upsert(updates, true);
    expect(result).toHaveLength(3);
    const list = await store.list();
    expect(list.find((i) => i.id === "a")).toMatchObject({ content: "A" });
    expect(list.find((i) => i.id === "b")).toMatchObject({
      content: "B updated",
      status: TODO_STATUS.IN_PROGRESS,
    });
    expect(list.find((i) => i.id === "c")).toMatchObject({ content: "C" });
  });

  it("session-scoped and global lists are independent", async () => {
    const global = new TodoStore(fs, baseDir);
    const sessionA = new TodoStore(fs, baseDir, "session-a");
    await global.save([{ id: "g", content: "Global", status: TODO_STATUS.PENDING }]);
    await sessionA.save([{ id: "a", content: "Session A", status: TODO_STATUS.PENDING }]);
    const globalList = await global.list();
    const sessionAList = await sessionA.list();
    expect(globalList).toHaveLength(1);
    expect(globalList[0].id).toBe("g");
    expect(sessionAList).toHaveLength(1);
    expect(sessionAList[0].id).toBe("a");
  });
});

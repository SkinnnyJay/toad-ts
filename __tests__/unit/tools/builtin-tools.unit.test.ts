import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TODO_STATUS } from "@/constants/todo-status";
import { TOOL_NAME } from "@/constants/tool-names";
import { createToolRuntime } from "@/tools/runtime";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toadstool-tools-"));

describe("Built-in tools", () => {
  let baseDir = "";

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    EnvManager.resetInstance();
    baseDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("writes, reads, and edits files", async () => {
    const runtime = createToolRuntime({ baseDir });

    const writeResult = await runtime.registry.execute(
      TOOL_NAME.WRITE,
      { path: "note.txt", content: "hello world" },
      runtime.context
    );
    expect(writeResult.ok).toBe(true);

    const readResult = await runtime.registry.execute(
      TOOL_NAME.READ,
      { path: "note.txt", line: 1, limit: 1 },
      runtime.context
    );
    expect(readResult.ok).toBe(true);
    if (readResult.ok) {
      if (
        typeof readResult.output === "object" &&
        readResult.output !== null &&
        "content" in readResult.output &&
        typeof readResult.output.content === "string"
      ) {
        expect(readResult.output.content).toContain("hello world");
      }
    }

    const editResult = await runtime.registry.execute(
      TOOL_NAME.EDIT,
      { path: "note.txt", old_string: "hello", new_string: "hi" },
      runtime.context
    );
    expect(editResult.ok).toBe(true);

    const editedRead = await runtime.registry.execute(
      TOOL_NAME.READ,
      { path: "note.txt" },
      runtime.context
    );
    expect(editedRead.ok).toBe(true);
    if (editedRead.ok) {
      if (
        typeof editedRead.output === "object" &&
        editedRead.output !== null &&
        "content" in editedRead.output &&
        typeof editedRead.output.content === "string"
      ) {
        expect(editedRead.output.content).toContain("hi world");
      }
    }
  });

  it("searches and lists files", async () => {
    const runtime = createToolRuntime({ baseDir });
    await writeFile(join(baseDir, "alpha.txt"), "needle");

    const grepResult = await runtime.registry.execute(
      TOOL_NAME.GREP,
      { query: "needle" },
      runtime.context
    );
    expect(grepResult.ok).toBe(true);
    if (grepResult.ok) {
      if (Array.isArray(grepResult.output)) {
        expect(grepResult.output.length).toBeGreaterThan(0);
      }
    }

    const globResult = await runtime.registry.execute(
      TOOL_NAME.GLOB,
      { pattern: "**/*.txt" },
      runtime.context
    );
    expect(globResult.ok).toBe(true);

    const listResult = await runtime.registry.execute(
      TOOL_NAME.LIST,
      { path: baseDir, depth: 1 },
      runtime.context
    );
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      if (Array.isArray(listResult.output)) {
        expect(
          listResult.output.some(
            (entry) =>
              typeof entry === "object" &&
              entry !== null &&
              "path" in entry &&
              typeof entry.path === "string" &&
              entry.path.endsWith("alpha.txt")
          )
        ).toBe(true);
      }
    }
  });

  it("manages the todo list", async () => {
    const runtime = createToolRuntime({ baseDir });
    const todoWrite = await runtime.registry.execute(
      TOOL_NAME.TODO_WRITE,
      {
        items: [
          { id: "task-1", content: "first task", status: TODO_STATUS.PENDING },
          { id: "task-2", content: "second task", status: TODO_STATUS.IN_PROGRESS },
        ],
      },
      runtime.context
    );

    expect(todoWrite.ok).toBe(true);

    const todoRead = await runtime.registry.execute(TOOL_NAME.TODO_READ, {}, runtime.context);
    expect(todoRead.ok).toBe(true);
    if (todoRead.ok) {
      if (Array.isArray(todoRead.output)) {
        expect(todoRead.output.length).toBe(2);
      }
    }
  });

  it("fetches web content", async () => {
    const fetcher = vi.fn(async () => new Response("payload", { status: 200 }));
    const runtime = createToolRuntime({ baseDir, fetcher });

    const result = await runtime.registry.execute(
      TOOL_NAME.WEBFETCH,
      { url: "https://example.com" },
      runtime.context
    );

    expect(fetcher).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      if (
        typeof result.output === "object" &&
        result.output !== null &&
        "body" in result.output &&
        typeof result.output.body === "string"
      ) {
        expect(result.output.body).toBe("payload");
      }
    }
  });

  it("answers questions with defaults in test mode", async () => {
    const runtime = createToolRuntime({ baseDir });
    const result = await runtime.registry.execute(
      TOOL_NAME.QUESTION,
      { question: "What?", default: "default" },
      runtime.context
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      if (
        typeof result.output === "object" &&
        result.output !== null &&
        "answer" in result.output &&
        typeof result.output.answer === "string"
      ) {
        expect(result.output.answer).toBe("default");
      }
    }
  });

  it("runs shell commands", async () => {
    if (process.platform === "win32") {
      return;
    }
    const runtime = createToolRuntime({ baseDir });
    const result = await runtime.registry.execute(
      TOOL_NAME.BASH,
      { command: "echo shell-ok" },
      runtime.context
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      if (
        typeof result.output === "object" &&
        result.output !== null &&
        "stdout" in result.output &&
        typeof result.output.stdout === "string"
      ) {
        expect(result.output.stdout).toContain("shell-ok");
      }
    }
  });
});

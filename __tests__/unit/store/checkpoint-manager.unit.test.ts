import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENCODING } from "@/constants/encodings";
import { REWIND_MODE } from "@/constants/rewind-modes";
import { useAppStore } from "@/store/app-store";
import { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import { AgentIdSchema, MessageIdSchema, SessionIdSchema } from "@/types/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("CheckpointManager", () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(tmpdir(), "toad-checkpoints-"));
    vi.stubEnv("HOME", tempHome);
    useAppStore.getState().reset();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tempHome, { recursive: true, force: true });
  });

  it("records checkpoints and restores state via undo/redo", async () => {
    const store = useAppStore.getState();
    const sessionId = SessionIdSchema.parse("s-checkpoint");
    store.upsertSession({
      session: {
        id: sessionId,
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    store.appendMessage({
      id: MessageIdSchema.parse("m-before"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "before" }],
      createdAt: 1,
      isStreaming: false,
    });

    const manager = new CheckpointManager(useAppStore);
    manager.startCheckpoint(sessionId, "checkpoint prompt");

    const filePath = path.join(tempHome, "example.txt");
    manager.recordFileChange({ path: filePath, before: "old", after: "new" }, sessionId);
    await writeFile(filePath, "new", ENCODING.UTF8);

    store.appendMessage({
      id: MessageIdSchema.parse("m-after"),
      sessionId,
      role: "assistant",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "after" }],
      createdAt: 2,
      isStreaming: false,
    });

    await manager.finalizeCheckpoint(sessionId);

    await manager.undo(sessionId, REWIND_MODE.BOTH);
    const undoMessages = store.getMessagesForSession(sessionId);
    expect(undoMessages).toHaveLength(1);
    expect(await readFile(filePath, ENCODING.UTF8)).toBe("old");

    await manager.redo(sessionId, REWIND_MODE.BOTH);
    const redoMessages = store.getMessagesForSession(sessionId);
    expect(redoMessages).toHaveLength(2);
    expect(await readFile(filePath, ENCODING.UTF8)).toBe("new");
  });
});

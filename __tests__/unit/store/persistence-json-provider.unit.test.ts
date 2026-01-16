import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";

import { afterEach, describe, expect, it } from "vitest";

import { createJsonPersistenceProvider } from "../../../src/store/persistence/json-provider";
import { SessionSnapshotSchema } from "../../../src/store/session-persistence";
import { MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

const createTempPath = async (): Promise<{ dir: string; filePath: string }> => {
  const dir = await mkdtemp(join(tmpdir(), "toadstool-json-"));
  return { dir, filePath: join(dir, "sessions.json") };
};

describe("json persistence provider", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("loads and saves snapshots", async () => {
    const { dir, filePath } = await createTempPath();
    tempDirs.push(dir);

    const provider = createJsonPersistenceProvider({ filePath });
    const initial = await provider.load();

    expect(initial.sessions).toEqual({});
    expect(initial.messages).toEqual({});

    const sessionId = SessionIdSchema.parse("session-1");
    const messageId = MessageIdSchema.parse("message-1");

    const snapshot = SessionSnapshotSchema.parse({
      currentSessionId: sessionId,
      sessions: {
        [sessionId]: {
          id: sessionId,
          title: "Test",
          agentId: undefined,
          messageIds: [messageId],
          createdAt: 123,
          updatedAt: 456,
        },
      },
      messages: {
        [messageId]: {
          id: messageId,
          sessionId,
          role: "user",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
          createdAt: 123,
          isStreaming: false,
        },
      },
    });

    await provider.save(snapshot);
    const saved = await provider.load();

    expect(saved.currentSessionId).toBe(sessionId);
    expect(saved.sessions[sessionId]?.messageIds).toEqual([messageId]);
    expect(saved.messages[messageId]?.content[0]?.type).toBe(CONTENT_BLOCK_TYPE.TEXT);
  });

  it("searches and returns session history", async () => {
    const { dir, filePath } = await createTempPath();
    tempDirs.push(dir);

    const provider = createJsonPersistenceProvider({ filePath });
    const sessionId = SessionIdSchema.parse("session-2");
    const messageId = MessageIdSchema.parse("message-2");

    const snapshot = SessionSnapshotSchema.parse({
      currentSessionId: sessionId,
      sessions: {
        [sessionId]: {
          id: sessionId,
          title: "Search",
          agentId: undefined,
          messageIds: [messageId],
          createdAt: 100,
          updatedAt: 200,
        },
      },
      messages: {
        [messageId]: {
          id: messageId,
          sessionId,
          role: "assistant",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello world" }],
          createdAt: 150,
          isStreaming: false,
        },
      },
    });

    await provider.save(snapshot);

    const results = await provider.search({ text: "world" });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(messageId);

    const history = await provider.getSessionHistory(sessionId);
    expect(history.id).toBe(sessionId);
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]?.id).toBe(messageId);
  });
});

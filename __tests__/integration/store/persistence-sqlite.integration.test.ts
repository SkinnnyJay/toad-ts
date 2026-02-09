import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";

import { afterEach, describe, expect, it } from "vitest";

import { createSqlitePersistenceProvider } from "../../../src/store/persistence/sqlite-provider";
import { SessionSnapshotSchema } from "../../../src/store/session-persistence";
import { MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

const createTempDb = async (): Promise<{ dir: string; filePath: string }> => {
  const dir = await mkdtemp(join(tmpdir(), "toadstool-sqlite-"));
  return { dir, filePath: join(dir, "toadstool.db") };
};

describe("sqlite persistence provider", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("saves, searches, and loads history", async () => {
    const { dir, filePath } = await createTempDb();
    tempDirs.push(dir);

    const provider = createSqlitePersistenceProvider({
      filePath,
      writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
      batchDelay: 50,
    });

    const sessionId = SessionIdSchema.parse("session-sqlite");
    const messageId = MessageIdSchema.parse("message-sqlite");

    const snapshot = SessionSnapshotSchema.parse({
      currentSessionId: sessionId,
      sessions: {
        [sessionId]: {
          id: sessionId,
          title: "SQLite",
          agentId: undefined,
          messageIds: [messageId],
          createdAt: 1,
          updatedAt: 2,
        },
      },
      messages: {
        [messageId]: {
          id: messageId,
          sessionId,
          role: "assistant",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "searchable content" }],
          createdAt: 1,
          isStreaming: false,
        },
      },
      plans: {},
      contextAttachments: {},
    });

    await provider.save(snapshot);

    const searchResults = await provider.search({ text: "searchable" });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]?.id).toBe(messageId);

    const history = await provider.getSessionHistory(sessionId);
    expect(history.id).toBe(sessionId);
    expect(history.messages).toHaveLength(1);

    const reloaded = await provider.load();
    expect(reloaded.sessions[sessionId]?.messageIds).toEqual([messageId]);

    await provider.close();
  });
});

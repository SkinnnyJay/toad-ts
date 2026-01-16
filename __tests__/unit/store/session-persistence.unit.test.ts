import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";

import { describe, expect, it } from "vitest";

import {
  createDiskSessionPersistence,
  createMemorySessionPersistence,
  defaultSnapshot,
} from "../../../src/store/session-persistence";
import { MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

const createSnapshot = () => {
  const sessionId = SessionIdSchema.parse("s-persist");
  const messageId = MessageIdSchema.parse("m-persist");

  return {
    currentSessionId: sessionId,
    sessions: {
      [sessionId]: {
        id: sessionId,
        title: "Persisted",
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
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Stored" }],
        createdAt: 2,
        isStreaming: false,
      },
    },
  };
};

describe("SessionPersistence", () => {
  it("stores snapshots in memory", async () => {
    const persistence = createMemorySessionPersistence();
    await persistence.save(createSnapshot());
    const loaded = await persistence.load();

    expect(loaded).toMatchObject(createSnapshot());
  });

  it("stores snapshots on disk", async () => {
    const folder = await mkdtemp(join(tmpdir(), "toadstool-session-"));
    const filePath = join(folder, "sessions.json");
    const persistence = createDiskSessionPersistence({ filePath });

    try {
      await persistence.save(createSnapshot());
      const loaded = await persistence.load();

      expect(loaded).toMatchObject(createSnapshot());
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });

  it("returns defaults when no file exists", async () => {
    const folder = await mkdtemp(join(tmpdir(), "toadstool-session-empty-"));
    const filePath = join(folder, "sessions.json");
    const persistence = createDiskSessionPersistence({ filePath });

    try {
      const loaded = await persistence.load();
      expect(loaded).toEqual(defaultSnapshot);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});

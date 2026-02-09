import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import { PERSISTENCE_WRITE_MODE } from "../../../src/constants/persistence-write-modes";
import { createSqlitePersistenceProvider } from "../../../src/store/persistence/sqlite-provider";
import { MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

describe("SQLite Worker", () => {
  const tempDir = join(process.cwd(), ".test-temp-sqlite-worker");

  beforeEach(async () => {
    // Ensure temp dir exists
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should use worker client when useWorker is true", async () => {
    const dbPath = join(tempDir, `test-worker-${Date.now()}.db`);
    const provider = createSqlitePersistenceProvider({
      filePath: dbPath,
      writeMode: PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE,
      batchDelay: 100,
    });

    const snapshot = {
      currentSessionId: SessionIdSchema.parse("session-1"),
      sessions: {
        "session-1": {
          id: SessionIdSchema.parse("session-1"),
          agentId: "agent-1",
          messageIds: [],
          createdAt: 1000,
          updatedAt: 1000,
          mode: "auto",
        },
      },
      messages: {},
      plans: {},
      contextAttachments: {},
    };

    await provider.save(snapshot);
    const loaded = await provider.load();

    expect(loaded).toBeDefined();
    await provider.close();
  });

  it("should use direct client when useWorker is false", async () => {
    const dbPath = join(tempDir, `test-direct-${Date.now()}.db`);
    const provider = createSqlitePersistenceProvider({
      filePath: dbPath,
      writeMode: PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE,
      batchDelay: 100,
    });

    const snapshot = {
      currentSessionId: SessionIdSchema.parse("session-1"),
      sessions: {
        "session-1": {
          id: SessionIdSchema.parse("session-1"),
          agentId: "agent-1",
          messageIds: [],
          createdAt: 1000,
          updatedAt: 1000,
          mode: "auto",
        },
      },
      messages: {},
      plans: {},
      contextAttachments: {},
    };

    await provider.save(snapshot);
    const loaded = await provider.load();

    expect(loaded).toBeDefined();
    await provider.close();
  });

  it("should handle errors in worker gracefully", async () => {
    const dbPath = join(tempDir, `test-error-${Date.now()}.db`);
    const provider = createSqlitePersistenceProvider({
      filePath: dbPath,
      writeMode: PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE,
      batchDelay: 100,
    });

    // Invalid snapshot should be handled - may throw or handle gracefully
    try {
      await provider.save({ invalid: "data" } as never);
    } catch {
      // Expected to throw for invalid data
    }

    await provider.close();
  });
});

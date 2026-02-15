import { LIMIT } from "@/config/limits";
import { SIDEBAR_TAB } from "@/constants/sidebar-tabs";
import { THEME } from "@/constants/themes";
import { SqliteStore } from "@/store/persistence/sqlite-storage";
import { SessionSnapshotSchema } from "@/store/session-persistence";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const SQLITE_MAINTENANCE_SQL = {
  OPTIMIZE: "PRAGMA optimize",
  CHECKPOINT_TRUNCATE: "PRAGMA wal_checkpoint(TRUNCATE)",
  VACUUM: "VACUUM",
} as const;

const createEmptySnapshot = () =>
  SessionSnapshotSchema.parse({
    currentSessionId: undefined,
    sessions: {},
    messages: {},
    plans: {},
    subAgents: {},
    contextAttachments: {},
    uiState: {
      sidebarTab: SIDEBAR_TAB.FILES,
      accordionCollapsed: {},
      showToolDetails: true,
      showThinking: true,
      theme: THEME.DEFAULT,
    },
  });

const createStoreForTests = () => {
  const executeRawUnsafe = vi.fn(async () => 0);
  const tx = {
    $executeRawUnsafe: vi.fn(async () => 0),
    $executeRaw: vi.fn(async () => 0),
    message: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (callback: (input: typeof tx) => Promise<void>) => {
      await callback(tx);
    }),
    $executeRawUnsafe: executeRawUnsafe,
  };

  const SqliteStoreCtor = SqliteStore as unknown as {
    new (input: PrismaClient): SqliteStore;
  };
  return {
    store: new SqliteStoreCtor(prisma as unknown as PrismaClient),
    executeRawUnsafe,
  };
};

describe("sqlite storage maintenance", () => {
  it("runs optimize and checkpoint after maintenance interval elapses", async () => {
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const { store, executeRawUnsafe } = createStoreForTests();
    const snapshot = createEmptySnapshot();

    await store.saveSnapshot(snapshot);
    expect(executeRawUnsafe).not.toHaveBeenCalledWith(SQLITE_MAINTENANCE_SQL.OPTIMIZE);

    now += LIMIT.SQLITE_MAINTENANCE_MIN_INTERVAL_MS + 1;
    await store.saveSnapshot(snapshot);

    expect(executeRawUnsafe).toHaveBeenCalledWith(SQLITE_MAINTENANCE_SQL.OPTIMIZE);
    expect(executeRawUnsafe).toHaveBeenCalledWith(SQLITE_MAINTENANCE_SQL.CHECKPOINT_TRUNCATE);
    nowSpy.mockRestore();
  });

  it("runs vacuum when vacuum maintenance interval elapses", async () => {
    let now = 10_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const { store, executeRawUnsafe } = createStoreForTests();
    const snapshot = createEmptySnapshot();

    await store.saveSnapshot(snapshot);
    now += LIMIT.SQLITE_VACUUM_MIN_INTERVAL_MS + 1;
    await store.saveSnapshot(snapshot);

    expect(executeRawUnsafe).toHaveBeenCalledWith(SQLITE_MAINTENANCE_SQL.VACUUM);
    nowSpy.mockRestore();
  });

  it("treats maintenance failures as best-effort and preserves writes", async () => {
    let now = 20_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const { store, executeRawUnsafe } = createStoreForTests();
    const snapshot = createEmptySnapshot();

    await store.saveSnapshot(snapshot);
    now += LIMIT.SQLITE_MAINTENANCE_MIN_INTERVAL_MS + 1;
    executeRawUnsafe.mockRejectedValueOnce(new Error("maintenance failed"));

    await expect(store.saveSnapshot(snapshot)).resolves.toBeUndefined();
    nowSpy.mockRestore();
  });
});

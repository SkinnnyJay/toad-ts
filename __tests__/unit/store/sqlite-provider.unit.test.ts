import { EventEmitter } from "node:events";

import { TIMEOUT } from "@/config/timeouts";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import { createSqlitePersistenceProvider } from "@/store/persistence/sqlite-provider";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockWorkers, mockWorkerFactoryState } = vi.hoisted(() => {
  return {
    mockWorkers: [] as Array<{
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }>,
    mockWorkerFactoryState: { nanoidCounter: 0 },
  };
});

vi.mock("node:worker_threads", () => ({
  Worker: class MockWorker extends EventEmitter {
    public readonly postMessage = vi.fn();
    public readonly terminate = vi.fn(async () => 0);

    constructor() {
      super();
      mockWorkers.push(this);
    }
  },
}));

vi.mock("nanoid", () => ({
  nanoid: () => `id-${++mockWorkerFactoryState.nanoidCounter}`,
}));

describe("sqlite provider worker timeouts", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWorkers.length = 0;
    mockWorkerFactoryState.nanoidCounter = 0;
    process.env.NODE_ENV = "development";
    EnvManager.resetInstance();
  });

  afterEach(async () => {
    vi.useRealTimers();
    process.env.NODE_ENV = originalNodeEnv;
    EnvManager.resetInstance();
  });

  it("restarts worker when sqlite requests time out", async () => {
    const provider = createSqlitePersistenceProvider({
      filePath: "/tmp/toadstool-sqlite-provider-timeout.db",
      writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
      batchDelay: 1,
    });

    const loadPromise = provider.load();
    const loadRejection = expect(loadPromise).rejects.toThrow("SQLite worker request timed out");
    await vi.advanceTimersByTimeAsync(TIMEOUT.SQLITE_WORKER_REQUEST_TIMEOUT_MS);

    await loadRejection;
    expect(mockWorkers).toHaveLength(2);
    expect(mockWorkers[0]?.terminate).toHaveBeenCalledTimes(1);
    expect(mockWorkers[1]?.postMessage).not.toHaveBeenCalled();

    await provider.close();
    expect(mockWorkers[1]?.terminate).toHaveBeenCalledTimes(1);
  });
});

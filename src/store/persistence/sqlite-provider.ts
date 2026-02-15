import { Worker } from "node:worker_threads";

import { TIMEOUT } from "@/config/timeouts";
import { ENV_VALUE } from "@/constants/env-values";
import { PERSISTENCE_REQUEST_TYPE } from "@/constants/persistence-request-types";
import { SessionSnapshotSchema } from "@/store/session-persistence";
import { MessageSchema, SessionSchema } from "@/types/domain";
import type { Message, Session } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { nanoid } from "nanoid";

import type { ChatQuery, PersistenceConfig, PersistenceProvider } from "./persistence-provider";
import { SqliteStore } from "./sqlite-storage";

interface WorkerConfig {
  filePath: string;
}

type WorkerRequest =
  | { id: string; type: typeof PERSISTENCE_REQUEST_TYPE.LOAD }
  | { id: string; type: typeof PERSISTENCE_REQUEST_TYPE.SAVE; snapshot: unknown }
  | { id: string; type: typeof PERSISTENCE_REQUEST_TYPE.SEARCH; query: ChatQuery }
  | { id: string; type: typeof PERSISTENCE_REQUEST_TYPE.HISTORY; sessionId: string }
  | { id: string; type: typeof PERSISTENCE_REQUEST_TYPE.CLOSE };

type WorkerRequestPayload =
  | { type: typeof PERSISTENCE_REQUEST_TYPE.LOAD }
  | { type: typeof PERSISTENCE_REQUEST_TYPE.SAVE; snapshot: unknown }
  | { type: typeof PERSISTENCE_REQUEST_TYPE.SEARCH; query: ChatQuery }
  | { type: typeof PERSISTENCE_REQUEST_TYPE.HISTORY; sessionId: string }
  | { type: typeof PERSISTENCE_REQUEST_TYPE.CLOSE };

interface WorkerResponseBase {
  id: string;
  success: boolean;
}

interface WorkerSuccessResponse<T> extends WorkerResponseBase {
  success: true;
  data?: T;
}

interface WorkerErrorResponse extends WorkerResponseBase {
  success: false;
  error: string;
}

type WorkerResponse<T> = WorkerSuccessResponse<T> | WorkerErrorResponse;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

interface SqliteClient {
  load(): Promise<unknown>;
  save(snapshot: unknown): Promise<void>;
  search(query: ChatQuery): Promise<unknown>;
  history(sessionId: string): Promise<unknown>;
  close(): Promise<void>;
}

class SqliteWorkerClient implements SqliteClient {
  private worker: Worker;
  private readonly config: WorkerConfig;
  private readonly pending = new Map<string, PendingRequest>();
  private isClosing = false;
  private restartPromise: Promise<void> | null = null;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.worker = this.createWorker();
  }

  private async request<T>(payload: WorkerRequestPayload): Promise<T> {
    if (this.isClosing) {
      throw new Error("Sqlite worker closed");
    }
    const id = nanoid();
    const request: WorkerRequest = { ...payload, id };
    const timeoutError = new Error(
      `SQLite worker request timed out after ${TIMEOUT.SQLITE_WORKER_REQUEST_TIMEOUT_MS}ms`
    );

    const response = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) {
          return;
        }
        this.pending.delete(id);
        pending.reject(timeoutError);
        void this.restartWorker(timeoutError);
      }, TIMEOUT.SQLITE_WORKER_REQUEST_TIMEOUT_MS);

      timeout.unref();
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
    });

    this.worker.postMessage(request);
    return response;
  }

  async load(): Promise<unknown> {
    return this.request({ type: PERSISTENCE_REQUEST_TYPE.LOAD });
  }

  async save(snapshot: unknown): Promise<void> {
    await this.request<void>({ type: PERSISTENCE_REQUEST_TYPE.SAVE, snapshot });
  }

  async search(query: ChatQuery): Promise<unknown> {
    return this.request({ type: PERSISTENCE_REQUEST_TYPE.SEARCH, query });
  }

  async history(sessionId: string): Promise<unknown> {
    return this.request({ type: PERSISTENCE_REQUEST_TYPE.HISTORY, sessionId });
  }

  async close(): Promise<void> {
    this.isClosing = true;
    const closedError = new Error("Sqlite worker closed");
    this.rejectAllPending(closedError);
    try {
      this.worker.postMessage({ id: nanoid(), type: PERSISTENCE_REQUEST_TYPE.CLOSE });
    } catch {
      // Ignore postMessage failures during shutdown.
    }
    await this.worker.terminate();
  }

  private createWorker(): Worker {
    const execArgv = process.execArgv.some((arg) => arg.includes("tsx"))
      ? []
      : ["--import=tsx/esm"];

    const worker = new Worker(new URL("./sqlite-worker.ts", import.meta.url), {
      workerData: this.config,
      execArgv,
    });
    worker.on("message", (message: WorkerResponse<unknown>) => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);

      if (message.success) {
        pending.resolve(message.data);
      } else {
        pending.reject(new Error(message.error));
      }
    });
    worker.on("error", (error) => {
      if (this.isClosing) {
        return;
      }
      void this.restartWorker(error instanceof Error ? error : new Error(String(error)));
    });
    return worker;
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private async restartWorker(error: Error): Promise<void> {
    if (this.isClosing) {
      return;
    }
    if (this.restartPromise) {
      return await this.restartPromise;
    }

    this.restartPromise = (async () => {
      this.rejectAllPending(error);
      const previousWorker = this.worker;
      await previousWorker.terminate();
      if (!this.isClosing) {
        this.worker = this.createWorker();
      }
    })();

    try {
      await this.restartPromise;
    } finally {
      this.restartPromise = null;
    }
  }
}

class SqliteDirectClient implements SqliteClient {
  private readonly storePromise: Promise<SqliteStore>;

  constructor(filePath: string) {
    this.storePromise = SqliteStore.create(filePath);
  }

  async load(): Promise<unknown> {
    const store = await this.storePromise;
    return store.loadSnapshot();
  }

  async save(snapshot: unknown): Promise<void> {
    const store = await this.storePromise;
    await store.saveSnapshot(snapshot);
  }

  async search(query: ChatQuery): Promise<unknown> {
    const store = await this.storePromise;
    return store.searchMessages(query);
  }

  async history(sessionId: string): Promise<unknown> {
    const store = await this.storePromise;
    return store.getSessionHistory(sessionId);
  }

  async close(): Promise<void> {
    const store = await this.storePromise;
    await store.close();
  }
}

export const createSqlitePersistenceProvider = (
  config: NonNullable<PersistenceConfig["sqlite"]>
): PersistenceProvider => {
  const useWorker = EnvManager.getInstance().getEnvironment() !== ENV_VALUE.TEST;
  const client: SqliteClient = useWorker
    ? new SqliteWorkerClient({ filePath: config.filePath })
    : new SqliteDirectClient(config.filePath);

  return {
    async load() {
      const snapshot = await client.load();
      return SessionSnapshotSchema.parse(snapshot);
    },

    async save(snapshot) {
      const normalized = SessionSnapshotSchema.parse(snapshot);
      await client.save(normalized);
    },

    async close() {
      await client.close();
    },

    async search(query: ChatQuery): Promise<Message[]> {
      const results = await client.search(query);
      return MessageSchema.array().parse(results);
    },

    async getSessionHistory(sessionId: string): Promise<Session & { messages: Message[] }> {
      const result = await client.history(sessionId);
      const parsed = SessionSchema.parse(result);
      const rawMessages =
        typeof result === "object" && result !== null
          ? (Reflect.get(result, "messages") ?? [])
          : [];
      const messages = MessageSchema.array().parse(rawMessages);
      return { ...parsed, messages };
    },
  };
};

import { Worker } from "node:worker_threads";

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
};

interface SqliteClient {
  load(): Promise<unknown>;
  save(snapshot: unknown): Promise<void>;
  search(query: ChatQuery): Promise<unknown>;
  history(sessionId: string): Promise<unknown>;
  close(): Promise<void>;
}

class SqliteWorkerClient implements SqliteClient {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(config: WorkerConfig) {
    const execArgv = process.execArgv.some((arg) => arg.includes("tsx"))
      ? []
      : ["--import=tsx/esm"];

    this.worker = new Worker(new URL("./sqlite-worker.ts", import.meta.url), {
      workerData: config,
      execArgv,
    });

    this.worker.on("message", (message: WorkerResponse<unknown>) => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);

      if (message.success) {
        pending.resolve(message.data);
      } else {
        pending.reject(new Error(message.error));
      }
    });

    this.worker.on("error", (error) => {
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
    });
  }

  private async request<T>(payload: WorkerRequestPayload): Promise<T> {
    const id = nanoid();
    const request: WorkerRequest = { ...payload, id };

    const response = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
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
    await this.request<void>({ type: PERSISTENCE_REQUEST_TYPE.CLOSE });
    const closedError = new Error("Sqlite worker closed");
    for (const { reject } of this.pending.values()) {
      reject(closedError);
    }
    this.pending.clear();
    await this.worker.terminate();
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

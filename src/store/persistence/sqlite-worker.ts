import { parentPort, workerData } from "node:worker_threads";

import { PERSISTENCE_REQUEST_TYPE } from "@/constants/persistence-request-types";
import type { ChatQuery } from "./persistence-provider";
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

const config = workerData as WorkerConfig;

const storePromise = SqliteStore.create(config.filePath);

const handleRequest = async (request: WorkerRequest): Promise<WorkerResponse<unknown>> => {
  try {
    const store = await storePromise;
    switch (request.type) {
      case PERSISTENCE_REQUEST_TYPE.LOAD:
        return { id: request.id, success: true, data: await store.loadSnapshot() };
      case PERSISTENCE_REQUEST_TYPE.SAVE:
        await store.saveSnapshot(request.snapshot);
        return { id: request.id, success: true };
      case PERSISTENCE_REQUEST_TYPE.SEARCH:
        return { id: request.id, success: true, data: await store.searchMessages(request.query) };
      case PERSISTENCE_REQUEST_TYPE.HISTORY:
        return {
          id: request.id,
          success: true,
          data: await store.getSessionHistory(request.sessionId),
        };
      case PERSISTENCE_REQUEST_TYPE.CLOSE:
        await store.close();
        return { id: request.id, success: true };
      default: {
        const fallback = request as { id: string; type: string };
        return {
          id: fallback.id,
          success: false,
          error: `Unknown request type: ${fallback.type}`,
        };
      }
    }
  } catch (error) {
    return {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const port = parentPort;
if (!port) {
  throw new Error("SQLite worker requires parent port");
}

port.on("message", async (request: WorkerRequest) => {
  const response = await handleRequest(request);
  port.postMessage(response);
});

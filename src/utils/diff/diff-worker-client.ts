import { Worker } from "node:worker_threads";

import { EnvManager } from "@/utils/env/env.utils";
import { nanoid } from "nanoid";

interface DiffWorkerRequest {
  id: string;
  filename: string;
  oldContent: string;
  newContent: string;
  contextLines: number;
}

interface DiffWorkerSuccessResponse {
  id: string;
  success: true;
  diff: string;
}

interface DiffWorkerErrorResponse {
  id: string;
  success: false;
  error: string;
}

type DiffWorkerResponse = DiffWorkerSuccessResponse | DiffWorkerErrorResponse;

type PendingRequest = {
  resolve: (diff: string) => void;
  reject: (error: Error) => void;
};

class DiffWorkerClient {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingRequest>();

  constructor() {
    const execArgv = process.execArgv.some((arg) => arg.includes("tsx"))
      ? []
      : ["--import=tsx/esm"];

    this.worker = new Worker(new URL("../../workers/diff-worker.ts", import.meta.url), {
      execArgv,
    });

    this.worker.on("message", (message: DiffWorkerResponse) => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);

      if (message.success) {
        pending.resolve(message.diff);
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

  requestDiff(params: Omit<DiffWorkerRequest, "id">): Promise<string> {
    const id = nanoid();
    const request: DiffWorkerRequest = { ...params, id };

    const response = new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.worker.postMessage(request);
    return response;
  }
}

const diffWorkerClient =
  EnvManager.getInstance().getEnvironment() === "test" ? null : new DiffWorkerClient();

export const computeDiffInWorker = async (
  params: Omit<DiffWorkerRequest, "id">
): Promise<string | null> => {
  if (!diffWorkerClient) {
    return null;
  }

  try {
    return await diffWorkerClient.requestDiff(params);
  } catch {
    return null;
  }
};

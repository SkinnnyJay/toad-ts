import { parentPort } from "node:worker_threads";

import { createTwoFilesPatch } from "diff";

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

const port = parentPort;

if (!port) {
  throw new Error("Diff worker requires a parent port.");
}

const handleRequest = (request: DiffWorkerRequest): DiffWorkerResponse => {
  try {
    const diff = createTwoFilesPatch(
      request.filename,
      request.filename,
      request.oldContent,
      request.newContent,
      "",
      "",
      { context: request.contextLines }
    );

    return { id: request.id, success: true, diff };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { id: request.id, success: false, error: message };
  }
};

port.on("message", (request: DiffWorkerRequest) => {
  port.postMessage(handleRequest(request));
});

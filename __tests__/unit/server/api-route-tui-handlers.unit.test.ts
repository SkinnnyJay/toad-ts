import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { appendPrompt, executeCommand } from "@/server/api-routes";
import { describe, expect, it } from "vitest";

interface CapturedResponse {
  statusCode: number;
  body: unknown;
}

const createResponseCapture = (): {
  response: ServerResponse;
  getCaptured: () => CapturedResponse;
} => {
  let statusCode = 0;
  let body: unknown = null;
  const response = {
    writeHead: (nextStatusCode: number) => {
      statusCode = nextStatusCode;
      return response;
    },
    end: (payload?: string) => {
      body = payload ? JSON.parse(payload) : null;
      return response;
    },
  } as unknown as ServerResponse;
  return {
    response,
    getCaptured: () => ({ statusCode, body }),
  };
};

const createRequest = (): IncomingMessage => {
  return new EventEmitter() as IncomingMessage;
};

const invokeJsonHandler = async (
  handler: typeof appendPrompt | typeof executeCommand,
  payload: unknown
): Promise<CapturedResponse> => {
  const req = createRequest();
  const { response, getCaptured } = createResponseCapture();
  const execution = handler(req, response, {});
  process.nextTick(() => {
    req.emit("data", JSON.stringify(payload));
    req.emit("end");
  });
  await execution;
  return getCaptured();
};

describe("api-routes TUI handlers", () => {
  it("appendPrompt rejects missing text", async () => {
    const captured = await invokeJsonHandler(appendPrompt, { text: "" });

    expect(captured).toEqual({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: { error: SERVER_RESPONSE_MESSAGE.TEXT_REQUIRED },
    });
  });

  it("appendPrompt queues valid prompt text", async () => {
    const captured = await invokeJsonHandler(appendPrompt, { text: "hello" });

    expect(captured).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { queued: true, text: "hello" },
    });
  });

  it("executeCommand rejects missing command", async () => {
    const captured = await invokeJsonHandler(executeCommand, { command: "" });

    expect(captured).toEqual({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: { error: SERVER_RESPONSE_MESSAGE.COMMAND_REQUIRED },
    });
  });

  it("executeCommand returns executed response for valid command", async () => {
    const captured = await invokeJsonHandler(executeCommand, { command: "ls -la" });

    expect(captured).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { executed: true, command: "ls -la" },
    });
  });
});

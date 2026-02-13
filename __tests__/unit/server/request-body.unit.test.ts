import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { parseJsonRequestBody, readRequestBody } from "@/server/request-body";
import { describe, expect, it } from "vitest";

const createRequest = (): IncomingMessage => {
  return new EventEmitter() as IncomingMessage;
};

const emitPayload = (req: IncomingMessage, payload: string): void => {
  process.nextTick(() => {
    if (payload.length > 0) {
      req.emit("data", payload);
    }
    req.emit("end");
  });
};

describe("request-body helpers", () => {
  it("reads request body payload", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitPayload(req, '{"hello":true}');

    await expect(pending).resolves.toBe('{"hello":true}');
  });

  it("rejects request body when size exceeds configured max", async () => {
    const req = createRequest();
    const pending = readRequestBody(req, 4);
    emitPayload(req, "12345");

    await expect(pending).rejects.toThrow(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);
  });

  it("parses JSON request body payload", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<{ value: string }>(req);
    emitPayload(req, '{"value":"ok"}');

    await expect(pending).resolves.toEqual({ value: "ok" });
  });

  it("returns empty-body fallback value when provided", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<Record<string, never>>(req, { emptyBodyValue: {} });
    emitPayload(req, "");

    await expect(pending).resolves.toEqual({});
  });

  it("rejects on invalid JSON payload", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<{ value: string }>(req);
    emitPayload(req, "{invalid");

    await expect(pending).rejects.toBeInstanceOf(SyntaxError);
  });
});

import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { SERVER_CONFIG } from "@/config/server";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { parseJsonRequestBody, readRequestBody } from "@/server/request-body";
import { describe, expect, it } from "vitest";

const createRequest = (headers: IncomingMessage["headers"] = {}): IncomingMessage => {
  return Object.assign(new EventEmitter(), { headers }) as IncomingMessage;
};

const emitPayload = (req: IncomingMessage, payload: string): void => {
  process.nextTick(() => {
    if (payload.length > 0) {
      req.emit("data", payload);
    }
    req.emit("end");
  });
};

const emitPayloadChunks = (req: IncomingMessage, payloads: string[]): void => {
  process.nextTick(() => {
    for (const payload of payloads) {
      if (payload.length > 0) {
        req.emit("data", payload);
      }
    }
    req.emit("end");
  });
};

const emitBufferPayload = (req: IncomingMessage, payload: string): void => {
  process.nextTick(() => {
    req.emit("data", Buffer.from(payload));
    req.emit("end");
  });
};

const emitBufferChunks = (req: IncomingMessage, chunks: Buffer[]): void => {
  process.nextTick(() => {
    for (const chunk of chunks) {
      req.emit("data", chunk);
    }
    req.emit("end");
  });
};

const emitMixedChunks = (req: IncomingMessage, chunks: Array<Buffer | string>): void => {
  process.nextTick(() => {
    for (const chunk of chunks) {
      req.emit("data", chunk);
    }
    req.emit("end");
  });
};

const emitAborted = (req: IncomingMessage): void => {
  process.nextTick(() => {
    req.emit("aborted");
  });
};

const emitClosed = (req: IncomingMessage): void => {
  process.nextTick(() => {
    req.emit("close");
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

  it("rejects request body when content-length exceeds configured max", async () => {
    const req = createRequest({ "content-length": "5" });
    await expect(readRequestBody(req, 4)).rejects.toThrow(
      SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE
    );
  });

  it("rejects request body when content-length is malformed", async () => {
    const req = createRequest({ "content-length": "four" });
    await expect(readRequestBody(req, 4)).rejects.toThrow(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("rejects request body when content-encoding is unsupported", async () => {
    const req = createRequest({ "content-encoding": "gzip" });
    await expect(readRequestBody(req)).rejects.toThrow(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("allows request body when content-encoding is identity", async () => {
    const req = createRequest({ "content-encoding": "identity" });
    const pending = readRequestBody(req);
    emitPayload(req, '{"value":"ok"}');

    await expect(pending).resolves.toBe('{"value":"ok"}');
  });

  it("rejects when combined chunk size exceeds configured max", async () => {
    const req = createRequest();
    const pending = readRequestBody(req, 4);
    emitPayloadChunks(req, ["12", "345"]);

    await expect(pending).rejects.toThrow(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);
  });

  it("rejects request body when utf-8 byte size exceeds max", async () => {
    const req = createRequest();
    const pending = readRequestBody(req, 7);
    emitPayload(req, "😀😀");

    await expect(pending).rejects.toThrow(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);
  });

  it("reads payload across multiple chunks", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitPayloadChunks(req, ['{"hello":', "true}"]);

    await expect(pending).resolves.toBe('{"hello":true}');
  });

  it("reads request body from buffer chunks", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitBufferPayload(req, '{"value":"ok"}');

    await expect(pending).resolves.toBe('{"value":"ok"}');
  });

  it("reads payload across mixed string and buffer chunks", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitMixedChunks(req, ['{"value":"', Buffer.from("ok"), '"}']);

    await expect(pending).resolves.toBe('{"value":"ok"}');
  });

  it("preserves decoder ordering for mixed malformed buffer and string chunks", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitMixedChunks(req, [Buffer.from([0xf0, 0x9f]), "abc"]);

    await expect(pending).resolves.toBe("\uFFFDabc");
  });

  it("reads utf-8 payloads split across buffer chunks", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<{ value: string }>(req);
    const payload = Buffer.from('{"value":"😀"}');
    const emojiStart = payload.indexOf(Buffer.from("😀"));
    const splitIndex = emojiStart + 2;
    emitBufferChunks(req, [payload.subarray(0, splitIndex), payload.subarray(splitIndex)]);

    await expect(pending).resolves.toEqual({ value: "😀" });
  });

  it("allows payload exactly at the configured byte limit", async () => {
    const req = createRequest();
    const payload = "1234";
    const pending = readRequestBody(req, Buffer.byteLength(payload));
    emitPayload(req, payload);

    await expect(pending).resolves.toBe(payload);
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

  it("parses JSON payload prefixed by utf-8 bom", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<{ value: string }>(req);
    emitPayload(req, '\uFEFF{"value":"ok"}');

    await expect(pending).resolves.toEqual({ value: "ok" });
  });

  it("treats utf-8 bom only payload as empty body fallback", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<Record<string, never>>(req, { emptyBodyValue: {} });
    emitPayload(req, "\uFEFF");

    await expect(pending).resolves.toEqual({});
  });

  it("rejects on invalid JSON payload", async () => {
    const req = createRequest();
    const pending = parseJsonRequestBody<{ value: string }>(req);
    emitPayload(req, "{invalid");

    await expect(pending).rejects.toBeInstanceOf(SyntaxError);
  });

  it("rejects when request stream emits an error", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    const failure = new Error("stream failed");

    process.nextTick(() => {
      req.emit("error", failure);
    });

    await expect(pending).rejects.toThrow("stream failed");
  });

  it("rejects when request stream is aborted", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitAborted(req);

    await expect(pending).rejects.toThrow(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("rejects when request stream closes before end event", async () => {
    const req = createRequest();
    const pending = readRequestBody(req);
    emitClosed(req);

    await expect(pending).rejects.toThrow(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("rejects when request body read exceeds timeout", async () => {
    const req = createRequest();
    await expect(readRequestBody(req, SERVER_CONFIG.MAX_BODY_BYTES, 1)).rejects.toThrow(
      SERVER_RESPONSE_MESSAGE.INVALID_REQUEST
    );
  });
});

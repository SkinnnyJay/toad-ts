import type { ServerResponse } from "node:http";
import { sendErrorResponse, sendJsonResponse } from "@/server/http-response";
import { describe, expect, it } from "vitest";

interface CapturedResponse {
  statusCode: number | null;
  headers: Record<string, string | number> | null;
  body: unknown;
}

const createResponseCapture = (): {
  response: ServerResponse;
  getCaptured: () => CapturedResponse;
} => {
  let statusCode: number | null = null;
  let headers: Record<string, string | number> | null = null;
  let body: unknown = null;
  const response = {
    writeHead: (nextStatusCode: number, nextHeaders: Record<string, string | number>) => {
      statusCode = nextStatusCode;
      headers = nextHeaders;
      return response;
    },
    end: (payload?: string) => {
      body = payload ? JSON.parse(payload) : null;
      return response;
    },
  } as unknown as ServerResponse;
  return {
    response,
    getCaptured: () => ({ statusCode, headers, body }),
  };
};

describe("http-response helpers", () => {
  it("writes JSON responses with content-type header", () => {
    const { response, getCaptured } = createResponseCapture();
    sendJsonResponse(response, 200, { ok: true });

    expect(getCaptured()).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true },
    });
  });

  it("optionally includes content-length header", () => {
    const payload = { ok: true };
    const body = JSON.stringify(payload);
    const { response, getCaptured } = createResponseCapture();
    sendJsonResponse(response, 200, payload, { includeContentLength: true });

    expect(getCaptured()).toEqual({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      body: payload,
    });
  });

  it("writes canonical error payloads", () => {
    const { response, getCaptured } = createResponseCapture();
    sendErrorResponse(response, 400, "Bad request");

    expect(getCaptured()).toEqual({
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "Bad request" },
    });
  });

  it("enforces json content-type when custom headers are provided", () => {
    const { response, getCaptured } = createResponseCapture();
    sendJsonResponse(
      response,
      200,
      { ok: true },
      {
        headers: {
          "Content-Type": "text/plain",
          "WWW-Authenticate": "Bearer",
        },
      }
    );

    expect(getCaptured()).toEqual({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": "Bearer",
      },
      body: { ok: true },
    });
  });
});

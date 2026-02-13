import type { IncomingMessage, ServerResponse } from "node:http";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { searchFiles } from "@/server/api-routes";
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

const createRequest = (url: string, host?: string): IncomingMessage => {
  return {
    url,
    headers: { host: host ?? "127.0.0.1:4141" },
  } as unknown as IncomingMessage;
};

describe("api-routes searchFiles handler", () => {
  it("returns bad request when query parameter is missing", async () => {
    const { response, getCaptured } = createResponseCapture();

    await searchFiles(createRequest("/api/files/search"), response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: { error: SERVER_RESPONSE_MESSAGE.QUERY_PARAM_Q_REQUIRED },
    });
  });

  it("returns placeholder search results for valid query", async () => {
    const { response, getCaptured } = createResponseCapture();

    await searchFiles(createRequest("/api/files/search?q=readme"), response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { query: "readme", results: [] },
    });
  });

  it("parses query successfully when request host header is absent", async () => {
    const { response, getCaptured } = createResponseCapture();

    const request = {
      url: "/api/files/search?q=notes",
      headers: {},
    } as unknown as IncomingMessage;

    await searchFiles(request, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { query: "notes", results: [] },
    });
  });
});

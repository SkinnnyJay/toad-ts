import type { IncomingMessage, ServerResponse } from "node:http";
import { ENV_KEY } from "@/constants/env-keys";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { checkServerAuth } from "@/server/server-auth";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface CapturedResponse {
  statusCode: number | null;
  body: unknown;
}

const createResponseCapture = (): {
  response: ServerResponse;
  getCaptured: () => CapturedResponse;
} => {
  let statusCode: number | null = null;
  let body: unknown = null;
  const response = {
    writeHead: vi.fn((nextStatusCode: number) => {
      statusCode = nextStatusCode;
      return response;
    }),
    end: vi.fn((payload?: string) => {
      body = payload ? JSON.parse(payload) : null;
      return response;
    }),
  } as unknown as ServerResponse;
  return {
    response,
    getCaptured: () => ({ statusCode, body }),
  };
};

describe("checkServerAuth", () => {
  beforeEach(() => {
    delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
    EnvManager.resetInstance();
  });

  afterEach(() => {
    delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
    EnvManager.resetInstance();
  });

  it("allows requests when server password is not configured", () => {
    const { response, getCaptured } = createResponseCapture();

    const allowed = checkServerAuth(
      { headers: {} } as IncomingMessage,
      response as unknown as ServerResponse
    );

    expect(allowed).toBe(true);
    expect(getCaptured().statusCode).toBeNull();
  });

  it("rejects missing authorization when password is configured", () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const { response, getCaptured } = createResponseCapture();

    const allowed = checkServerAuth(
      { headers: {} } as IncomingMessage,
      response as unknown as ServerResponse
    );

    expect(allowed).toBe(false);
    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      body: { error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED },
    });
  });

  it("rejects invalid credentials", () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const { response, getCaptured } = createResponseCapture();

    const allowed = checkServerAuth(
      { headers: { authorization: "wrong" } } as IncomingMessage,
      response as unknown as ServerResponse
    );

    expect(allowed).toBe(false);
    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      body: { error: SERVER_RESPONSE_MESSAGE.INVALID_CREDENTIALS },
    });
  });

  it("accepts bearer token that matches configured password", () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const { response, getCaptured } = createResponseCapture();

    const allowed = checkServerAuth(
      { headers: { authorization: "Bearer secret" } } as IncomingMessage,
      response as unknown as ServerResponse
    );

    expect(allowed).toBe(true);
    expect(getCaptured().statusCode).toBeNull();
  });

  it("accepts raw authorization token that matches configured password", () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const { response, getCaptured } = createResponseCapture();

    const allowed = checkServerAuth(
      { headers: { authorization: "secret" } } as IncomingMessage,
      response as unknown as ServerResponse
    );

    expect(allowed).toBe(true);
    expect(getCaptured().statusCode).toBeNull();
  });
});

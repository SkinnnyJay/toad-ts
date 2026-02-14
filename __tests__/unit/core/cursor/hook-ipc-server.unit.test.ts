import http from "node:http";
import { SERVER_CONFIG } from "@/config/server";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { HOOK_IPC_AUTH } from "@/constants/hook-ipc-auth";
import { HTTP_STATUS } from "@/constants/http-status";
import { PERMISSION } from "@/constants/permissions";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { type HookIpcEndpoint, HookIpcServer } from "@/core/cursor/hook-ipc-server";
import * as requestBody from "@/server/request-body";
import { REQUEST_PARSING_SOURCE } from "@/server/request-error-normalization";
import { afterEach, describe, expect, it, vi } from "vitest";

const buildHookHttpAuthHeaders = (endpoint: HookIpcEndpoint): Record<string, string> => {
  if (endpoint.transport !== "http") {
    return {};
  }
  const headers: Record<string, string> = {};
  if (endpoint.authToken) {
    headers[HOOK_IPC_AUTH.TOKEN_HEADER] = endpoint.authToken;
  }
  if (endpoint.authNonce) {
    headers[HOOK_IPC_AUTH.NONCE_HEADER] = endpoint.authNonce;
  }
  return headers;
};

const postJson = async (endpoint: HookIpcEndpoint, payload: Record<string, unknown>) => {
  if (endpoint.transport === "http" && endpoint.url) {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildHookHttpAuthHeaders(endpoint),
      },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as Record<string, unknown>;
  }

  if (endpoint.transport === "unix_socket" && endpoint.socketPath) {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = http.request(
        {
          method: "POST",
          socketPath: endpoint.socketPath,
          path: "/",
          headers: {
            "Content-Type": "application/json",
          },
        },
        (response) => {
          const chunks: string[] = [];
          response.on("data", (chunk: Buffer | string) => {
            chunks.push(chunk.toString());
          });
          response.on("end", () => {
            try {
              resolve(JSON.parse(chunks.join("")));
            } catch (error) {
              reject(error);
            }
          });
        }
      );
      request.on("error", (error) => reject(error));
      request.write(JSON.stringify(payload));
      request.end();
    });
  }

  throw new Error("Invalid hook endpoint");
};

const requestHttpEndpoint = async (
  endpoint: HookIpcEndpoint,
  method: string,
  body?: string,
  headers?: Record<string, string>
): Promise<{ status: number; payload: Record<string, unknown> }> => {
  if (endpoint.transport !== "http" || !endpoint.url) {
    throw new Error("HTTP endpoint required");
  }

  const response = await fetch(endpoint.url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...buildHookHttpAuthHeaders(endpoint),
      ...headers,
    },
    body,
  });
  return {
    status: response.status,
    payload: (await response.json()) as Record<string, unknown>,
  };
};

const requestHttpEndpointWithNodeHeaders = async (
  endpoint: HookIpcEndpoint,
  method: string,
  body?: string,
  headers?: Record<string, string>
): Promise<{ status: number; payload: Record<string, unknown> }> => {
  if (endpoint.transport !== "http" || !endpoint.url) {
    throw new Error("HTTP endpoint required");
  }

  const target = new URL(endpoint.url);
  return await new Promise<{ status: number; payload: Record<string, unknown> }>(
    (resolve, reject) => {
      const request = http.request(
        {
          method,
          hostname: target.hostname,
          port: target.port,
          path: target.pathname,
          headers: {
            "Content-Type": "application/json",
            ...buildHookHttpAuthHeaders(endpoint),
            ...headers,
          },
        },
        (response) => {
          const chunks: string[] = [];
          response.on("data", (chunk: Buffer | string) => {
            chunks.push(chunk.toString());
          });
          response.on("end", () => {
            try {
              resolve({
                status: response.statusCode ?? 0,
                payload: JSON.parse(chunks.join("")) as Record<string, unknown>,
              });
            } catch (error) {
              reject(error);
            }
          });
        }
      );
      request.on("error", (error) => reject(error));
      if (body) {
        request.write(body);
      }
      request.end();
    }
  );
};

const createValidHookPayload = (): Record<string, string> => ({
  conversation_id: "conv-1",
  generation_id: "gen-1",
  model: "opus-4.6-thinking",
  hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
});

const HOOK_REQUEST_STREAM_ERROR = {
  ABORTED: "request aborted",
  STREAM_ERROR: "socket hang up",
} as const;

const HOOK_IPC_HANDLER = {
  METHOD_GUARD: "method_guard",
  ORIGIN_GUARD: "origin_guard",
  AUTH_GUARD: "auth_guard",
} as const;

const getHookIpcWarnSpy = (hookServer: HookIpcServer) => {
  const logger = Reflect.get(hookServer, "logger") as {
    warn: (message: string, metadata?: Record<string, unknown>) => void;
  };
  return vi.spyOn(logger, "warn");
};

describe("HookIpcServer", () => {
  let server: HookIpcServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("routes permission requests with allow/deny responses", async () => {
    server = new HookIpcServer({ transport: "http" });
    server.setHandlers({
      permissionRequest: async () => ({ decision: PERMISSION.DENY, reason: "policy" }),
    });
    const endpoint = await server.start();

    const response = await postJson(endpoint, {
      conversation_id: "conv-1",
      generation_id: "gen-1",
      model: "opus-4.6-thinking",
      hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
    });

    expect(response.decision).toBe(PERMISSION.DENY);
    expect(response.reason).toBe("policy");
  });

  it("routes sessionStart to context injection", async () => {
    server = new HookIpcServer({ transport: "http" });
    server.setHandlers({
      contextInjection: async () => ({
        continue: true,
        additional_context: "Follow org rules.",
        env: { TOADSTOOL: "1" },
      }),
    });
    const endpoint = await server.start();

    const response = await postJson(endpoint, {
      conversation_id: "conv-1",
      generation_id: "gen-1",
      model: "opus-4.6-thinking",
      hook_event_name: CURSOR_HOOK_EVENT.SESSION_START,
    });

    expect(response.additional_context).toBe("Follow org rules.");
    expect(response.env).toMatchObject({ TOADSTOOL: "1" });
  });

  it("routes stop hooks to continuation handler", async () => {
    server = new HookIpcServer({ transport: "http" });
    server.setHandlers({
      continuation: async () => ({ followup_message: "continue with next task" }),
    });
    const endpoint = await server.start();

    const response = await postJson(endpoint, {
      conversation_id: "conv-1",
      generation_id: "gen-1",
      model: "opus-4.6-thinking",
      hook_event_name: CURSOR_HOOK_EVENT.STOP,
    });

    expect(response.followup_message).toBe("continue with next task");
  });

  it("times out handlers and falls back to safe defaults", async () => {
    server = new HookIpcServer({
      transport: "http",
      requestTimeoutMs: 1,
    });
    server.setHandlers({
      permissionRequest: async () =>
        new Promise<Record<string, unknown>>(() => {
          // Intentional never-resolving promise for timeout path.
        }),
    });
    const endpoint = await server.start();

    const response = await postJson(endpoint, {
      conversation_id: "conv-1",
      generation_id: "gen-1",
      model: "opus-4.6-thinking",
      hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
    });

    expect(response.decision).toBe(PERMISSION.ALLOW);
  });

  it("supports unix socket transport by default on non-Windows", async () => {
    server = new HookIpcServer();
    const endpoint = await server.start();

    if (process.platform === "win32") {
      expect(endpoint.transport).toBe("http");
      return;
    }

    expect(endpoint.transport).toBe("unix_socket");
    const response = await postJson(endpoint, {
      conversation_id: "conv-1",
      generation_id: "gen-1",
      model: "opus-4.6-thinking",
      hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
    });
    expect(response.decision).toBe(PERMISSION.ALLOW);
  });

  it("falls back to loopback host when non-local http host is configured", async () => {
    server = new HookIpcServer({
      transport: "http",
      host: "0.0.0.0",
      port: 0,
    });
    const endpoint = await server.start();

    expect(endpoint.transport).toBe("http");
    expect(endpoint.url).toContain("127.0.0.1");
  });

  it("falls back to http transport when unix socket startup fails", async () => {
    server = new HookIpcServer({
      transport: "unix_socket",
      socketPath: "/__toadstool_invalid_socket_dir__/hooks.sock",
      host: SERVER_CONFIG.DEFAULT_HOST,
      port: 0,
    });
    const endpoint = await server.start();

    expect(endpoint.transport).toBe("http");
    expect(endpoint.url).toContain("http://");
    const response = await postJson(endpoint, {
      conversation_id: "conv-fallback",
      generation_id: "gen-fallback",
      model: "opus-4.6-thinking",
      hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
    });
    expect(response.decision).toBe(PERMISSION.ALLOW);
  });

  it("keeps hook roundtrip p95 under target", async () => {
    server = new HookIpcServer();
    const endpoint = await server.start();
    const latenciesMs: number[] = [];

    for (let i = 0; i < CURSOR_LIMIT.HOOK_PERF_SAMPLE_SIZE; i += 1) {
      const start = Date.now();
      await postJson(endpoint, {
        conversation_id: `conv-${i}`,
        generation_id: "gen-1",
        model: "opus-4.6-thinking",
        hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
      });
      latenciesMs.push(Date.now() - start);
    }

    const sorted = [...latenciesMs].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    const p95 = sorted[p95Index] ?? 0;

    expect(p95).toBeLessThanOrEqual(CURSOR_LIMIT.HOOK_P95_TARGET_MS);
  });

  it("returns method not allowed for non-POST requests", async () => {
    server = new HookIpcServer({ transport: "http" });
    const warnSpy = getHookIpcWarnSpy(server);
    const endpoint = await server.start();

    const response = await requestHttpEndpoint(endpoint, "GET");

    expect(response).toEqual({
      status: HTTP_STATUS.METHOD_NOT_ALLOWED,
      payload: { error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED },
    });
    expect(warnSpy).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      handler: HOOK_IPC_HANDLER.METHOD_GUARD,
      method: "GET",
      pathname: "/",
      error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      mappedMessage: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
    });
    warnSpy.mockRestore();
  });

  it("rejects non-local host header requests in http mode", async () => {
    server = new HookIpcServer({ transport: "http" });
    const warnSpy = getHookIpcWarnSpy(server);
    const endpoint = await server.start();

    const response = await requestHttpEndpointWithNodeHeaders(
      endpoint,
      "POST",
      JSON.stringify(createValidHookPayload()),
      {
        Host: "malicious.example",
      }
    );

    expect(response).toEqual({
      status: HTTP_STATUS.FORBIDDEN,
      payload: { error: SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED },
    });
    expect(warnSpy).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      handler: HOOK_IPC_HANDLER.ORIGIN_GUARD,
      method: "POST",
      pathname: "/",
      error: SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED,
      mappedMessage: SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED,
    });
    warnSpy.mockRestore();
  });

  it("rejects http requests with invalid hook auth headers", async () => {
    server = new HookIpcServer({ transport: "http" });
    const warnSpy = getHookIpcWarnSpy(server);
    const endpoint = await server.start();

    const response = await requestHttpEndpoint(
      endpoint,
      "POST",
      JSON.stringify(createValidHookPayload()),
      {
        [HOOK_IPC_AUTH.TOKEN_HEADER]: "invalid-token",
        [HOOK_IPC_AUTH.NONCE_HEADER]: "invalid-nonce",
      }
    );

    expect(response).toEqual({
      status: HTTP_STATUS.UNAUTHORIZED,
      payload: { error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED },
    });
    expect(warnSpy).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      handler: HOOK_IPC_HANDLER.AUTH_GUARD,
      method: "POST",
      pathname: "/",
      error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      mappedMessage: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
    });
    warnSpy.mockRestore();
  });

  it("returns bad request for malformed JSON payloads", async () => {
    server = new HookIpcServer({ transport: "http" });
    const warnSpy = getHookIpcWarnSpy(server);
    const endpoint = await server.start();

    const response = await requestHttpEndpoint(endpoint, "POST", "{invalid");

    expect(response).toEqual({
      status: HTTP_STATUS.BAD_REQUEST,
      payload: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Request parsing failed",
      expect.objectContaining({
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: "POST",
        pathname: "/",
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: expect.any(String),
      })
    );
    warnSpy.mockRestore();
  });

  it("returns bad request for schema-invalid payloads", async () => {
    server = new HookIpcServer({ transport: "http" });
    const warnSpy = getHookIpcWarnSpy(server);
    const endpoint = await server.start();

    const response = await requestHttpEndpoint(
      endpoint,
      "POST",
      JSON.stringify({ hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE })
    );

    expect(response).toEqual({
      status: HTTP_STATUS.BAD_REQUEST,
      payload: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Request validation failed",
      expect.objectContaining({
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: "POST",
        pathname: "/",
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: expect.any(String),
      })
    );
    warnSpy.mockRestore();
  });

  it("returns bad request for non-object JSON payloads", async () => {
    server = new HookIpcServer({ transport: "http" });
    const endpoint = await server.start();

    const arrayPayloadResponse = await requestHttpEndpoint(endpoint, "POST", JSON.stringify([]));
    expect(arrayPayloadResponse).toEqual({
      status: HTTP_STATUS.BAD_REQUEST,
      payload: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
    });

    const primitivePayloadResponse = await requestHttpEndpoint(
      endpoint,
      "POST",
      JSON.stringify("invalid")
    );
    expect(primitivePayloadResponse).toEqual({
      status: HTTP_STATUS.BAD_REQUEST,
      payload: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
    });
  });

  it("returns request-body-too-large for oversized payloads", async () => {
    server = new HookIpcServer({ transport: "http" });
    const warnSpy = getHookIpcWarnSpy(server);
    const endpoint = await server.start();

    const response = await requestHttpEndpoint(
      endpoint,
      "POST",
      `"${"x".repeat(SERVER_CONFIG.MAX_BODY_BYTES + 1)}"`
    );

    expect(response).toEqual({
      status: HTTP_STATUS.BAD_REQUEST,
      payload: { error: SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Request parsing failed",
      expect.objectContaining({
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: "POST",
        pathname: "/",
        mappedMessage: SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE,
        error: SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE,
      })
    );
    warnSpy.mockRestore();
  });

  it.each([HOOK_REQUEST_STREAM_ERROR.ABORTED, HOOK_REQUEST_STREAM_ERROR.STREAM_ERROR])(
    "returns bad request when body reader fails with '%s'",
    async (streamErrorMessage) => {
      const parseBodySpy = vi
        .spyOn(requestBody, "parseJsonRequestBody")
        .mockRejectedValueOnce(new Error(streamErrorMessage));

      server = new HookIpcServer({ transport: "http" });
      const warnSpy = getHookIpcWarnSpy(server);
      const endpoint = await server.start();

      const response = await requestHttpEndpoint(
        endpoint,
        "POST",
        JSON.stringify(createValidHookPayload())
      );

      expect(response).toEqual({
        status: HTTP_STATUS.BAD_REQUEST,
        payload: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "Request parsing failed",
        expect.objectContaining({
          source: REQUEST_PARSING_SOURCE.HOOK_IPC,
          method: "POST",
          pathname: "/",
          error: streamErrorMessage,
          mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        })
      );

      warnSpy.mockRestore();
      parseBodySpy.mockRestore();
    }
  );

  it("returns server error when hook handler throws", async () => {
    server = new HookIpcServer({ transport: "http" });
    server.setHandlers({
      permissionRequest: async () => {
        throw new Error("boom");
      },
    });
    const endpoint = await server.start();

    const response = await requestHttpEndpoint(
      endpoint,
      "POST",
      JSON.stringify({
        conversation_id: "conv-1",
        generation_id: "gen-1",
        model: "opus-4.6-thinking",
        hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
      })
    );

    expect(response).toEqual({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      payload: { error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR },
    });
  });
});

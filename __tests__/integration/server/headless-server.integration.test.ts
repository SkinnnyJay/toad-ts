import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { z } from "zod";

import { SERVER_CONFIG } from "@/config/server";
import { ENV_KEY } from "@/constants/env-keys";
import { FILE_PATH } from "@/constants/file-paths";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SERVER_EVENT } from "@/constants/server-events";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import {
  formatHarnessAdapterNotRegisteredError,
  formatHarnessNotConfiguredError,
} from "@/harness/harness-error-messages";
import { HARNESS_ID_VALIDATION_MESSAGE } from "@/harness/harness-id";
import { startHeadlessServer } from "@/server/headless-server";
import { createSessionResponseSchema, serverEventSchema } from "@/server/server-types";
import { EnvManager } from "@/utils/env/env.utils";

const waitForMessage = (socket: WebSocket): Promise<string> => {
  return new Promise((resolve) => {
    socket.on("message", (data) => resolve(data.toString()));
  });
};

const waitForOpen = (socket: WebSocket): Promise<void> => {
  return new Promise((resolve) => {
    socket.on("open", () => resolve());
  });
};

const collectStateUpdateEvents = async (
  response: Response,
  expectedCount: number
): Promise<Array<Record<string, unknown>>> => {
  if (!response.body) {
    throw new Error("Events stream response body is missing.");
  }

  const stateUpdates: Array<Record<string, unknown>> = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  while (stateUpdates.length < expectedCount) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffered += decoder.decode(value, { stream: true });

    let separatorIndex = buffered.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const frame = buffered.slice(0, separatorIndex).trim();
      buffered = buffered.slice(separatorIndex + 2);
      separatorIndex = buffered.indexOf("\n\n");

      if (!frame.startsWith("data: ")) {
        continue;
      }
      const serializedEvent = frame
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.replace(/^data:\s?/, ""))
        .join("\n");
      const stateUpdateEvent = z
        .object({
          type: z.literal(SERVER_EVENT.STATE_UPDATE),
          currentSessionId: z.string().optional(),
          connectionStatus: z.string().optional(),
        })
        .passthrough()
        .parse(JSON.parse(serializedEvent));
      stateUpdates.push(stateUpdateEvent);
      if (stateUpdates.length >= expectedCount) {
        await reader.cancel();
        return stateUpdates;
      }
    }
  }

  await reader.cancel();
  throw new Error("Events stream ended before expected state-update events were collected.");
};

const collectSessionCreatedEvents = async (
  socket: WebSocket,
  expectedCount: number
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const sessionIds: string[] = [];

    const onError = (error: Error): void => {
      socket.off("message", onMessage);
      socket.off("error", onError);
      reject(error);
    };

    const onMessage = (data: WebSocket.RawData): void => {
      try {
        const event = serverEventSchema.parse(JSON.parse(data.toString()));
        if (event.type !== SERVER_EVENT.SESSION_CREATED) {
          return;
        }
        sessionIds.push(event.payload.sessionId);
        if (sessionIds.length < expectedCount) {
          return;
        }
        socket.off("message", onMessage);
        socket.off("error", onError);
        resolve(sessionIds);
      } catch (error) {
        socket.off("message", onMessage);
        socket.off("error", onError);
        reject(error);
      }
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
  });
};

const requestWithRawPath = (
  host: string,
  port: number,
  requestPath: string
): Promise<{ statusCode: number; body: unknown }> =>
  new Promise((resolve, reject) => {
    const req = httpRequest({ host, port, path: requestPath, method: "GET" }, (res) => {
      const chunks: string[] = [];
      res.setEncoding("utf8");
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const payload = chunks.join("");
        if (payload.length === 0) {
          resolve({ statusCode: res.statusCode ?? 0, body: null });
          return;
        }
        try {
          resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(payload) });
        } catch {
          resolve({ statusCode: res.statusCode ?? 0, body: payload });
        }
      });
    });
    req.on("error", reject);
    req.end();
  });

describe("headless server", () => {
  it("handles session creation and prompts", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;
    const socket = new WebSocket(`ws://${host}:${port}`);
    await waitForOpen(socket);
    const messagePromise = waitForMessage(socket);

    try {
      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);
      await expect(health.json()).resolves.toEqual({ status: "ok" });

      const sessionResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(sessionResponse.status).toBe(200);
      const sessionPayload = createSessionResponseSchema.parse(await sessionResponse.json());
      expect(sessionPayload.sessionId).toBeTruthy();

      const eventRaw = await messagePromise;
      const event = serverEventSchema.parse(JSON.parse(eventRaw));
      expect(event.type).toBe(SERVER_EVENT.SESSION_CREATED);
      expect(event.payload.sessionId).toBe(sessionPayload.sessionId);

      const promptResponse = await fetch(`${baseUrl}/sessions/${sessionPayload.sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello." }),
      });
      expect(promptResponse.status).toBe(200);
      const promptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await promptResponse.json());
      expect(promptPayload.stopReason).toBeDefined();
    } finally {
      await new Promise<void>((resolve) => {
        socket.once("close", () => resolve());
        socket.close();
      });
      await server.close();
    }
  });

  it("enforces auth for non-health endpoints when password is configured", async () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);

      const noAuthResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(noAuthResponse.status).toBe(401);
      expect(noAuthResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(noAuthResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const wrongAuthResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wrong",
        },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(wrongAuthResponse.status).toBe(401);
      expect(wrongAuthResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(wrongAuthResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_CREDENTIALS,
      });

      const authorizedResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
        },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(authorizedResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await authorizedResponse.json());
      expect(payload.sessionId).toBeTruthy();

      const rawTokenResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "secret",
        },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(rawTokenResponse.status).toBe(200);
      const rawTokenPayload = createSessionResponseSchema.parse(await rawTokenResponse.json());
      expect(rawTokenPayload.sessionId).toBeTruthy();
    } finally {
      await server.close();
      delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
      EnvManager.resetInstance();
    }
  });

  it("returns bad request for invalid JSON payloads", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const invalidPayloadResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      });
      expect(invalidPayloadResponse.status).toBe(400);
      await expect(invalidPayloadResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });

      const invalidTuiPayloadResponse = await fetch(`${baseUrl}/api/tui/append-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      });
      expect(invalidTuiPayloadResponse.status).toBe(400);
      await expect(invalidTuiPayloadResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });
    } finally {
      await server.close();
    }
  });

  it("keeps server responsive when cursor harness connection fails", async () => {
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "true";
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = "toadstool-missing-cursor-binary";
    EnvManager.resetInstance();

    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const cursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(cursorResponse.status).toBe(500);
      await expect(cursorResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const fallbackResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(fallbackResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await fallbackResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      await server.close();
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      EnvManager.resetInstance();
    }
  });

  it("keeps server responsive after repeated explicit cursor connection failures", async () => {
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "true";
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = "toadstool-missing-cursor-binary";
    EnvManager.resetInstance();

    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const firstCursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(firstCursorResponse.status).toBe(500);
      await expect(firstCursorResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const secondCursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(secondCursorResponse.status).toBe(500);
      await expect(secondCursorResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      await server.close();
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      EnvManager.resetInstance();
    }
  });

  it("returns bad request for non-origin-form request targets", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();

    try {
      const protocolRelativeRequest = await requestWithRawPath(
        host,
        port,
        "//example.com/api/files/search?q=notes"
      );
      expect(protocolRelativeRequest).toEqual({
        statusCode: 400,
        body: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
      });

      const absoluteRequest = await requestWithRawPath(
        host,
        port,
        "http://example.com/api/files/search?q=notes"
      );
      expect(absoluteRequest).toEqual({
        statusCode: 400,
        body: { error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST },
      });
    } finally {
      await server.close();
    }
  });

  it("enforces file-search query validation semantics", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const validResponse = await fetch(`${baseUrl}/api/files/search?q=readme`);
      expect(validResponse.status).toBe(200);
      await expect(validResponse.json()).resolves.toEqual({
        query: "readme",
        results: [],
      });

      const duplicateQueryResponse = await fetch(`${baseUrl}/api/files/search?q=readme&q=notes`);
      expect(duplicateQueryResponse.status).toBe(400);
      await expect(duplicateQueryResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });

      const mixedCaseDuplicateQueryResponse = await fetch(
        `${baseUrl}/api/files/search?q=readme&Q=notes`
      );
      expect(mixedCaseDuplicateQueryResponse.status).toBe(400);
      await expect(mixedCaseDuplicateQueryResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });

      const encodedKeyResponse = await fetch(`${baseUrl}/api/files/search?%71=readme`);
      expect(encodedKeyResponse.status).toBe(200);
      await expect(encodedKeyResponse.json()).resolves.toEqual({
        query: "readme",
        results: [],
      });

      const uppercaseKeyResponse = await fetch(`${baseUrl}/api/files/search?Q=readme`);
      expect(uppercaseKeyResponse.status).toBe(200);
      await expect(uppercaseKeyResponse.json()).resolves.toEqual({
        query: "readme",
        results: [],
      });

      const encodedSeparatorValueResponse = await fetch(
        `${baseUrl}/api/files/search?q=readme%26notes`
      );
      expect(encodedSeparatorValueResponse.status).toBe(200);
      await expect(encodedSeparatorValueResponse.json()).resolves.toEqual({
        query: "readme&notes",
        results: [],
      });

      const malformedKeyResponse = await fetch(`${baseUrl}/api/files/search?%E0%A4%A=readme`);
      expect(malformedKeyResponse.status).toBe(400);
      await expect(malformedKeyResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });
    } finally {
      await server.close();
    }
  });

  it("returns not found for unknown top-level endpoints", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/unknown-endpoint`);
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });
    } finally {
      await server.close();
    }
  });

  it("returns unknown endpoint for unsupported session subroutes", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const postResponse = await fetch(`${baseUrl}/sessions/session-1/unsupported`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(postResponse.status).toBe(404);
      await expect(postResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const getResponse = await fetch(`${baseUrl}/sessions/session-1/unsupported`);
      expect(getResponse.status).toBe(404);
      await expect(getResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const extraPromptSegment = await fetch(`${baseUrl}/sessions/session-1/prompt/extra`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(extraPromptSegment.status).toBe(404);
      await expect(extraPromptSegment.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const extraMessagesSegment = await fetch(`${baseUrl}/sessions/session-1/messages/extra`);
      expect(extraMessagesSegment.status).toBe(404);
      await expect(extraMessagesSegment.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });
    } finally {
      await server.close();
    }
  });

  it("returns session not found when prompting a missing runtime session", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/sessions/session-missing/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SESSION_NOT_FOUND,
      });
    } finally {
      await server.close();
    }
  });

  it("returns bad request when prompt payload fails schema validation", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const sessionResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      const sessionPayload = createSessionResponseSchema.parse(await sessionResponse.json());

      const response = await fetch(`${baseUrl}/sessions/${sessionPayload.sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
      const payload = (await response.json()) as { error?: string };
      expect(typeof payload.error).toBe("string");
      expect((payload.error ?? "").length).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it("returns bad request when session payload fails schema validation", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock", unexpected: true }),
      });
      expect(response.status).toBe(400);
      const payload = (await response.json()) as { error?: string };
      expect(typeof payload.error).toBe("string");
      expect((payload.error ?? "").length).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it("returns bad request when session payload includes non-canonical harness id", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: " mock " }),
      });
      expect(response.status).toBe(400);
      const payload = (await response.json()) as { error?: string };
      expect(typeof payload.error).toBe("string");
      expect(payload.error).toContain(HARNESS_ID_VALIDATION_MESSAGE.NON_CANONICAL);
    } finally {
      await server.close();
    }
  });

  it("returns bad request when session payload includes empty harness id", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "" }),
      });
      expect(response.status).toBe(400);
      const payload = (await response.json()) as { error?: string };
      expect(typeof payload.error).toBe("string");
      expect(payload.error).toContain(HARNESS_ID_VALIDATION_MESSAGE.NON_CANONICAL);
    } finally {
      await server.close();
    }
  });

  it("returns not found when requested harness id is not configured", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "missing-harness" }),
      });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: formatHarnessNotConfiguredError("missing-harness"),
      });
    } finally {
      await server.close();
    }
  });

  it("keeps server responsive after repeated unknown harness requests", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "missing-harness" }),
      });
      expect(firstResponse.status).toBe(404);
      await expect(firstResponse.json()).resolves.toEqual({
        error: formatHarnessNotConfiguredError("missing-harness"),
      });

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "missing-harness" }),
      });
      expect(secondResponse.status).toBe(404);
      await expect(secondResponse.json()).resolves.toEqual({
        error: formatHarnessNotConfiguredError("missing-harness"),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      await server.close();
    }
  });

  it("returns cursor harness not configured when cursor default config is disabled", async () => {
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const cursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(cursorResponse.status).toBe(404);
      await expect(cursorResponse.json()).resolves.toEqual({
        error: formatHarnessNotConfiguredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      await server.close();
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
    }
  });

  it("keeps server responsive after repeated cursor-not-configured requests", async () => {
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const firstCursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(firstCursorResponse.status).toBe(404);
      await expect(firstCursorResponse.json()).resolves.toEqual({
        error: formatHarnessNotConfiguredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const secondCursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(secondCursorResponse.status).toBe(404);
      await expect(secondCursorResponse.json()).resolves.toEqual({
        error: formatHarnessNotConfiguredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      await server.close();
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
    }
  });

  it("returns not found when selected harness adapter is not registered", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "custom",
          harnesses: {
            custom: {
              name: "Custom",
              command: "custom-cli",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError("custom"),
      });
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated default adapter-not-registered responses", async () => {
    const customHarnessId = "custom";
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-custom-repeated-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: customHarnessId,
          harnesses: {
            [customHarnessId]: {
              name: "Custom",
              command: "custom-cli",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstResponse.status).toBe(404);
      await expect(firstResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(customHarnessId),
      });

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(secondResponse.status).toBe(404);
      await expect(secondResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(customHarnessId),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("returns not found when cursor harness is configured but cursor adapter is disabled", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-cursor-disabled-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.CURSOR_CLI_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "cursor-agent",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated cursor adapter-not-registered responses", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-cursor-disabled-repeated-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.CURSOR_CLI_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "cursor-agent",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstResponse.status).toBe(404);
      await expect(firstResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(secondResponse.status).toBe(404);
      await expect(secondResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps non-cursor harnesses operational when cursor adapter is disabled", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-cursor-partial-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "cursor-agent",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const cursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(cursorResponse.status).toBe(404);
      await expect(cursorResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated explicit adapter-not-registered requests", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-cursor-explicit-repeated-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "cursor-agent",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstCursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(firstCursorResponse.status).toBe(404);
      await expect(firstCursorResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const secondCursorResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID }),
      });
      expect(secondCursorResponse.status).toBe(404);
      await expect(secondCursorResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive when default cursor harness connection fails", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-cursor-default-connect-fail-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.CURSOR_CLI_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "toadstool-missing-cursor-binary",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "true";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const defaultResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(defaultResponse.status).toBe(500);
      await expect(defaultResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated cursor connection failures", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-cursor-repeated-connect-fail-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.CURSOR_CLI_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "toadstool-missing-cursor-binary",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "true";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstFailureResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstFailureResponse.status).toBe(500);
      await expect(firstFailureResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const secondFailureResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(secondFailureResponse.status).toBe(500);
      await expect(secondFailureResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps non-cursor default override path operational when cursor adapter is disabled", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-cursor-default-disabled-partial-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.CURSOR_CLI_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: "cursor-agent",
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "false";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const defaultResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(defaultResponse.status).toBe(404);
      await expect(defaultResponse.json()).resolves.toEqual({
        error: formatHarnessAdapterNotRegisteredError(HARNESS_DEFAULT.CURSOR_CLI_ID),
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("falls back to default harness config when harness config loading fails", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-fallback-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "broken",
          harnesses: {
            " broken ": {
              name: "Broken",
              command: "broken-cli",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(response.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await response.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("falls back to default harness config when configured harnesses are empty", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-empty-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "empty",
          harnesses: {},
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(response.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await response.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated fallback requests when harnesses are empty", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-empty-repeated-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "empty",
          harnesses: {},
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("falls back to default harness config when configured default harness is missing", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-missing-default-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "missing",
          harnesses: {
            alpha: {
              name: "Alpha",
              command: "alpha-cli",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(response.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await response.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated fallback requests when default harness is missing", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-missing-default-repeated-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(
      harnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "missing",
          harnesses: {
            alpha: {
              name: "Alpha",
              command: "alpha-cli",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("falls back to default harness config when harness config JSON is malformed", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-malformed-"));
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(harnessFilePath, "{invalid json");

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(response.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await response.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated fallback requests for project-user default mismatch", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-project-merge-"));
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-merge-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: "missing",
          harnesses: {},
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated merged override cursor command failures", async () => {
    const missingCursorCommand = "toadstool-merged-override-missing-cursor";
    const projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-project-runtime-"));
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-runtime-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorEnabled = process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.CURSOR_CLI_ID,
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              name: "Cursor",
              command: HARNESS_DEFAULT.CURSOR_COMMAND,
            },
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.CURSOR_CLI_ID]: {
              command: missingCursorCommand,
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "true";
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstFailureResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstFailureResponse.status).toBe(500);
      await expect(firstFailureResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const secondFailureResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(secondFailureResponse.status).toBe(500);
      await expect(secondFailureResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.SERVER_ERROR,
      });

      const mockResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(mockResponse.status).toBe(200);
      const payload = createSessionResponseSchema.parse(await mockResponse.json());
      expect(payload.sessionId).toBeTruthy();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorEnabled === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = originalCursorEnabled;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated merged env-expansion override failures", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-project-env-"));
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              command: "${TOADSTOOL_CURSOR_COMMAND}",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated merged cwd override failures", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-project-cwd-"));
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-cwd-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              cwd: "${TOADSTOOL_CURSOR_COMMAND}",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated merged blank-command override failures", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-blank-command-")
    );
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-blank-command-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              command: " ",
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated merged env-map empty expansions", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-project-env-map-"));
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-map-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps prompt submissions responsive after merged env-map empty expansions", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-prompt-")
    );
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-prompt-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstCreateResponse.status).toBe(200);
      const firstSession = createSessionResponseSchema.parse(await firstCreateResponse.json());
      expect(firstSession.sessionId).toBeTruthy();

      const firstPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "First prompt." }),
        }
      );
      expect(firstPromptResponse.status).toBe(200);
      const firstPromptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await firstPromptResponse.json());
      expect(firstPromptPayload.stopReason).toBeDefined();

      const secondCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(secondCreateResponse.status).toBe(200);
      const secondSession = createSessionResponseSchema.parse(await secondCreateResponse.json());
      expect(secondSession.sessionId).toBeTruthy();
      expect(secondSession.sessionId).not.toBe(firstSession.sessionId);

      const secondPromptResponse = await fetch(
        `${baseUrl}/sessions/${secondSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Second prompt." }),
        }
      );
      expect(secondPromptResponse.status).toBe(200);
      const secondPromptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await secondPromptResponse.json());
      expect(secondPromptPayload.stopReason).toBeDefined();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps mixed explicit/default requests responsive after merged env-map expansions", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-project-env-mixed-"));
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-mixed-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const defaultFirstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(defaultFirstResponse.status).toBe(200);
      const defaultFirstSession = createSessionResponseSchema.parse(
        await defaultFirstResponse.json()
      );
      expect(defaultFirstSession.sessionId).toBeTruthy();

      const explicitResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(explicitResponse.status).toBe(200);
      const explicitSession = createSessionResponseSchema.parse(await explicitResponse.json());
      expect(explicitSession.sessionId).toBeTruthy();
      expect(explicitSession.sessionId).not.toBe(defaultFirstSession.sessionId);

      const defaultSecondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(defaultSecondResponse.status).toBe(200);
      const defaultSecondSession = createSessionResponseSchema.parse(
        await defaultSecondResponse.json()
      );
      expect(defaultSecondSession.sessionId).toBeTruthy();
      expect(defaultSecondSession.sessionId).not.toBe(defaultFirstSession.sessionId);
      expect(defaultSecondSession.sessionId).not.toBe(explicitSession.sessionId);

      const promptResponse = await fetch(
        `${baseUrl}/sessions/${defaultSecondSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Mixed path prompt." }),
        }
      );
      expect(promptResponse.status).toBe(200);
      const promptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await promptResponse.json());
      expect(promptPayload.stopReason).toBeDefined();
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps mixed request validation stable after merged env-map expansions", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-validation-")
    );
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-validation-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const explicitCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(explicitCreateResponse.status).toBe(200);
      const explicitSession = createSessionResponseSchema.parse(
        await explicitCreateResponse.json()
      );
      expect(explicitSession.sessionId).toBeTruthy();

      const defaultCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(defaultCreateResponse.status).toBe(200);
      const defaultSession = createSessionResponseSchema.parse(await defaultCreateResponse.json());
      expect(defaultSession.sessionId).toBeTruthy();
      expect(defaultSession.sessionId).not.toBe(explicitSession.sessionId);

      const invalidPromptResponse = await fetch(
        `${baseUrl}/sessions/${defaultSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(invalidPromptResponse.status).toBe(400);
      const invalidPromptPayload = (await invalidPromptResponse.json()) as { error?: string };
      expect(typeof invalidPromptPayload.error).toBe("string");
      expect((invalidPromptPayload.error ?? "").length).toBeGreaterThan(0);

      const validPromptResponse = await fetch(
        `${baseUrl}/sessions/${defaultSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Validation recovery prompt." }),
        }
      );
      expect(validPromptResponse.status).toBe(200);
      const validPromptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await validPromptResponse.json());
      expect(validPromptPayload.stopReason).toBeDefined();

      const trailingCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(trailingCreateResponse.status).toBe(200);
      const trailingSession = createSessionResponseSchema.parse(
        await trailingCreateResponse.json()
      );
      expect(trailingSession.sessionId).toBeTruthy();
      expect(trailingSession.sessionId).not.toBe(defaultSession.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps repeated invalid prompt cycles stable across merged env-map sessions", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-cycles-")
    );
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-cycles-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstCreateResponse.status).toBe(200);
      const firstSession = createSessionResponseSchema.parse(await firstCreateResponse.json());
      expect(firstSession.sessionId).toBeTruthy();

      const firstInvalidPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(firstInvalidPromptResponse.status).toBe(400);

      const firstValidPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "First valid prompt." }),
        }
      );
      expect(firstValidPromptResponse.status).toBe(200);
      const firstValidPromptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await firstValidPromptResponse.json());
      expect(firstValidPromptPayload.stopReason).toBeDefined();

      const secondCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondCreateResponse.status).toBe(200);
      const secondSession = createSessionResponseSchema.parse(await secondCreateResponse.json());
      expect(secondSession.sessionId).toBeTruthy();
      expect(secondSession.sessionId).not.toBe(firstSession.sessionId);

      const secondInvalidPromptResponse = await fetch(
        `${baseUrl}/sessions/${secondSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(secondInvalidPromptResponse.status).toBe(400);

      const secondValidPromptResponse = await fetch(
        `${baseUrl}/sessions/${secondSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Second valid prompt." }),
        }
      );
      expect(secondValidPromptResponse.status).toBe(200);
      const secondValidPromptPayload = z
        .object({ stopReason: z.string().optional() })
        .strict()
        .parse(await secondValidPromptResponse.json());
      expect(secondValidPromptPayload.stopReason).toBeDefined();

      const trailingCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(trailingCreateResponse.status).toBe(200);
      const trailingSession = createSessionResponseSchema.parse(
        await trailingCreateResponse.json()
      );
      expect(trailingSession.sessionId).toBeTruthy();
      expect(trailingSession.sessionId).not.toBe(firstSession.sessionId);
      expect(trailingSession.sessionId).not.toBe(secondSession.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps websocket session-created stream stable during merged env-map cycles", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-events-")
    );
    const homeRoot = await mkdtemp(path.join(tmpdir(), "toadstool-headless-home-env-events-"));
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let socket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      socket = new WebSocket(`ws://${host}:${port}`);
      await waitForOpen(socket);
      const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
        const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
        expect(stateUpdateResponse.status).toBe(200);
        const stateUpdateContentType = stateUpdateResponse.headers.get("content-type") ?? "";
        expect(stateUpdateContentType).toContain("text/event-stream");
        return collectStateUpdateEvents(stateUpdateResponse, 3);
      })();

      const createdSessionIds: string[] = [];
      const sessionCreatedReady = new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          socket?.off("message", onMessage);
          socket?.off("error", onError);
          reject(error);
        };

        const onMessage = (data: WebSocket.RawData): void => {
          try {
            const event = serverEventSchema.parse(JSON.parse(data.toString()));
            if (event.type !== SERVER_EVENT.SESSION_CREATED) {
              return;
            }
            createdSessionIds.push(event.payload.sessionId);
            if (createdSessionIds.length < 3) {
              return;
            }
            socket?.off("message", onMessage);
            socket?.off("error", onError);
            resolve();
          } catch (error) {
            socket?.off("message", onMessage);
            socket?.off("error", onError);
            reject(error);
          }
        };

        socket?.on("message", onMessage);
        socket?.on("error", onError);
      });

      const firstCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstCreateResponse.status).toBe(200);
      const firstSession = createSessionResponseSchema.parse(await firstCreateResponse.json());

      const firstInvalidPrompt = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(firstInvalidPrompt.status).toBe(400);

      const firstValidPrompt = await fetch(`${baseUrl}/sessions/${firstSession.sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Event cycle first prompt." }),
      });
      expect(firstValidPrompt.status).toBe(200);

      const secondCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondCreateResponse.status).toBe(200);
      const secondSession = createSessionResponseSchema.parse(await secondCreateResponse.json());
      expect(secondSession.sessionId).not.toBe(firstSession.sessionId);

      const secondInvalidPrompt = await fetch(
        `${baseUrl}/sessions/${secondSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(secondInvalidPrompt.status).toBe(400);

      const secondValidPrompt = await fetch(
        `${baseUrl}/sessions/${secondSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Event cycle second prompt." }),
        }
      );
      expect(secondValidPrompt.status).toBe(200);

      const thirdCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(thirdCreateResponse.status).toBe(200);
      const thirdSession = createSessionResponseSchema.parse(await thirdCreateResponse.json());
      expect(thirdSession.sessionId).not.toBe(firstSession.sessionId);
      expect(thirdSession.sessionId).not.toBe(secondSession.sessionId);

      await sessionCreatedReady;
      const stateUpdateEvents = await stateUpdatePromise;

      const uniqueEventSessionIds = new Set(createdSessionIds);
      expect(uniqueEventSessionIds.size).toBe(3);
      expect(uniqueEventSessionIds.has(firstSession.sessionId)).toBe(true);
      expect(uniqueEventSessionIds.has(secondSession.sessionId)).toBe(true);
      expect(uniqueEventSessionIds.has(thirdSession.sessionId)).toBe(true);

      const parsedStateUpdates = z
        .array(
          z
            .object({
              connectionStatus: z.string(),
              currentSessionId: z.string().optional(),
            })
            .passthrough()
        )
        .parse(stateUpdateEvents);
      expect(parsedStateUpdates).toHaveLength(3);
    } finally {
      if (socket) {
        await new Promise<void>((resolve) => {
          if (socket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          socket?.once("close", () => resolve());
          socket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps state-update stream reconnectable after merged env-map validation failures", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-events-reconnect-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-events-reconnect-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstStreamPromise = (async (): Promise<Array<Record<string, unknown>>> => {
        const firstStreamResponse = await fetch(`${baseUrl}/api/events`);
        expect(firstStreamResponse.status).toBe(200);
        const firstContentType = firstStreamResponse.headers.get("content-type") ?? "";
        expect(firstContentType).toContain("text/event-stream");
        return collectStateUpdateEvents(firstStreamResponse, 1);
      })();

      const firstCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstCreateResponse.status).toBe(200);
      const firstSession = createSessionResponseSchema.parse(await firstCreateResponse.json());

      const firstStateUpdateEvents = z
        .array(
          z
            .object({
              connectionStatus: z.string().optional(),
              currentSessionId: z.string().optional(),
            })
            .passthrough()
        )
        .parse(await firstStreamPromise);
      expect(firstStateUpdateEvents).toHaveLength(1);

      const invalidPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(invalidPromptResponse.status).toBe(400);

      const validPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Reconnect cycle prompt." }),
        }
      );
      expect(validPromptResponse.status).toBe(200);

      const secondStreamPromise = (async (): Promise<Array<Record<string, unknown>>> => {
        const secondStreamResponse = await fetch(`${baseUrl}/api/events`);
        expect(secondStreamResponse.status).toBe(200);
        const secondContentType = secondStreamResponse.headers.get("content-type") ?? "";
        expect(secondContentType).toContain("text/event-stream");
        return collectStateUpdateEvents(secondStreamResponse, 1);
      })();

      const secondCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondCreateResponse.status).toBe(200);
      const secondSession = createSessionResponseSchema.parse(await secondCreateResponse.json());
      expect(secondSession.sessionId).not.toBe(firstSession.sessionId);

      const secondStateUpdateEvents = z
        .array(
          z
            .object({
              connectionStatus: z.string().optional(),
              currentSessionId: z.string().optional(),
            })
            .passthrough()
        )
        .parse(await secondStreamPromise);
      expect(secondStateUpdateEvents).toHaveLength(1);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps interleaved websocket and sse reconnect cycles stable under merged env-map validation", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-reconnects-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-reconnects-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let firstSocket: WebSocket | null = null;
    let secondSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      firstSocket = new WebSocket(`ws://${host}:${port}`);
      await waitForOpen(firstSocket);

      const firstSessionCreatedEventsPromise = collectSessionCreatedEvents(firstSocket, 2);
      const firstStateUpdateEventsPromise = (async (): Promise<Array<Record<string, unknown>>> => {
        const firstSseResponse = await fetch(`${baseUrl}/api/events`);
        expect(firstSseResponse.status).toBe(200);
        return collectStateUpdateEvents(firstSseResponse, 2);
      })();

      const firstCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(firstCreateResponse.status).toBe(200);
      const firstSession = createSessionResponseSchema.parse(await firstCreateResponse.json());

      const invalidPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      expect(invalidPromptResponse.status).toBe(400);

      const validPromptResponse = await fetch(
        `${baseUrl}/sessions/${firstSession.sessionId}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Interleaved reconnect prompt." }),
        }
      );
      expect(validPromptResponse.status).toBe(200);

      const secondCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondCreateResponse.status).toBe(200);
      const secondSession = createSessionResponseSchema.parse(await secondCreateResponse.json());
      expect(secondSession.sessionId).not.toBe(firstSession.sessionId);

      const firstSessionCreatedEvents = await firstSessionCreatedEventsPromise;
      const firstSessionCreatedEventIds = new Set(firstSessionCreatedEvents);
      expect(firstSessionCreatedEventIds.size).toBe(2);
      expect(firstSessionCreatedEventIds.has(firstSession.sessionId)).toBe(true);
      expect(firstSessionCreatedEventIds.has(secondSession.sessionId)).toBe(true);

      const firstStateUpdateEvents = z
        .array(
          z
            .object({
              connectionStatus: z.string().optional(),
              currentSessionId: z.string().optional(),
            })
            .passthrough()
        )
        .parse(await firstStateUpdateEventsPromise);
      expect(firstStateUpdateEvents).toHaveLength(2);

      await new Promise<void>((resolve) => {
        if (firstSocket?.readyState === WebSocket.CLOSED) {
          resolve();
          return;
        }
        firstSocket?.once("close", () => resolve());
        firstSocket?.close();
      });
      firstSocket = null;

      secondSocket = new WebSocket(`ws://${host}:${port}`);
      await waitForOpen(secondSocket);

      const secondSessionCreatedEventsPromise = collectSessionCreatedEvents(secondSocket, 1);
      const secondStateUpdateEventsPromise = (async (): Promise<Array<Record<string, unknown>>> => {
        const secondSseResponse = await fetch(`${baseUrl}/api/events`);
        expect(secondSseResponse.status).toBe(200);
        return collectStateUpdateEvents(secondSseResponse, 1);
      })();

      const thirdCreateResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(thirdCreateResponse.status).toBe(200);
      const thirdSession = createSessionResponseSchema.parse(await thirdCreateResponse.json());
      expect(thirdSession.sessionId).not.toBe(firstSession.sessionId);
      expect(thirdSession.sessionId).not.toBe(secondSession.sessionId);

      const secondSessionCreatedEvents = await secondSessionCreatedEventsPromise;
      expect(secondSessionCreatedEvents).toEqual([thirdSession.sessionId]);

      const secondStateUpdateEvents = z
        .array(
          z
            .object({
              connectionStatus: z.string().optional(),
              currentSessionId: z.string().optional(),
            })
            .passthrough()
        )
        .parse(await secondStateUpdateEventsPromise);
      expect(secondStateUpdateEvents).toHaveLength(1);
    } finally {
      if (firstSocket) {
        await new Promise<void>((resolve) => {
          if (firstSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          firstSocket?.once("close", () => resolve());
          firstSocket?.close();
        });
      }
      if (secondSocket) {
        await new Promise<void>((resolve) => {
          if (secondSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          secondSocket?.once("close", () => resolve());
          secondSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps alternating default and explicit reconnect cycles stable under merged env-map validation", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-alternating-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-alternating-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const alternatingRequests: Array<Record<string, unknown>> = [
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
      ];
      const createdSessionIds: string[] = [];

      for (let cycleIndex = 0; cycleIndex < alternatingRequests.length; cycleIndex += 1) {
        activeSocket = new WebSocket(`ws://${host}:${port}`);
        await waitForOpen(activeSocket);

        const sessionCreatedPromise = collectSessionCreatedEvents(activeSocket, 1);
        const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
          const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
          expect(stateUpdateResponse.status).toBe(200);
          const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
          expect(contentType).toContain("text/event-stream");
          return collectStateUpdateEvents(stateUpdateResponse, 1);
        })();

        const createResponse = await fetch(`${baseUrl}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alternatingRequests[cycleIndex]),
        });
        expect(createResponse.status).toBe(200);
        const createdSession = createSessionResponseSchema.parse(await createResponse.json());
        createdSessionIds.push(createdSession.sessionId);

        const sessionCreatedEvents = await sessionCreatedPromise;
        expect(sessionCreatedEvents).toEqual([createdSession.sessionId]);

        const stateUpdates = z
          .array(
            z
              .object({
                connectionStatus: z.string().optional(),
                currentSessionId: z.string().optional(),
              })
              .passthrough()
          )
          .parse(await stateUpdatePromise);
        expect(stateUpdates).toHaveLength(1);

        const invalidPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        expect(invalidPromptResponse.status).toBe(400);

        const validPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Alternating reconnect prompt cycle ${cycleIndex + 1}.`,
            }),
          }
        );
        expect(validPromptResponse.status).toBe(200);

        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
        activeSocket = null;
      }

      expect(new Set(createdSessionIds).size).toBe(alternatingRequests.length);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps alternating reconnect cycles stable across invalid prompt bursts", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-bursts-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-bursts-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const alternatingRequests: Array<Record<string, unknown>> = [
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
      ];
      const createdSessionIds: string[] = [];

      for (let cycleIndex = 0; cycleIndex < alternatingRequests.length; cycleIndex += 1) {
        activeSocket = new WebSocket(`ws://${host}:${port}`);
        await waitForOpen(activeSocket);

        const sessionCreatedPromise = collectSessionCreatedEvents(activeSocket, 1);
        const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
          const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
          expect(stateUpdateResponse.status).toBe(200);
          const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
          expect(contentType).toContain("text/event-stream");
          return collectStateUpdateEvents(stateUpdateResponse, 1);
        })();

        const createResponse = await fetch(`${baseUrl}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alternatingRequests[cycleIndex]),
        });
        expect(createResponse.status).toBe(200);
        const createdSession = createSessionResponseSchema.parse(await createResponse.json());
        createdSessionIds.push(createdSession.sessionId);

        await expect(sessionCreatedPromise).resolves.toEqual([createdSession.sessionId]);
        const stateUpdates = z
          .array(
            z
              .object({
                connectionStatus: z.string().optional(),
                currentSessionId: z.string().optional(),
              })
              .passthrough()
          )
          .parse(await stateUpdatePromise);
        expect(stateUpdates).toHaveLength(1);

        const firstInvalidPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        expect(firstInvalidPromptResponse.status).toBe(400);

        const secondInvalidPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        expect(secondInvalidPromptResponse.status).toBe(400);

        const validPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Alternating reconnect burst prompt cycle ${cycleIndex + 1}.`,
            }),
          }
        );
        expect(validPromptResponse.status).toBe(200);

        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
        activeSocket = null;
      }

      expect(new Set(createdSessionIds).size).toBe(alternatingRequests.length);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps alternating reconnect cycles stable with mixed websocket close timing", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-close-timing-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-close-timing-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const alternatingRequests: Array<Record<string, unknown>> = [
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
      ];
      const closeBeforePromptByCycle = [true, false, true] as const;
      const createdSessionIds: string[] = [];

      for (let cycleIndex = 0; cycleIndex < alternatingRequests.length; cycleIndex += 1) {
        activeSocket = new WebSocket(`ws://${host}:${port}`);
        await waitForOpen(activeSocket);

        const sessionCreatedPromise = collectSessionCreatedEvents(activeSocket, 1);
        const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
          const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
          expect(stateUpdateResponse.status).toBe(200);
          const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
          expect(contentType).toContain("text/event-stream");
          return collectStateUpdateEvents(stateUpdateResponse, 1);
        })();

        const createResponse = await fetch(`${baseUrl}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alternatingRequests[cycleIndex]),
        });
        expect(createResponse.status).toBe(200);
        const createdSession = createSessionResponseSchema.parse(await createResponse.json());
        createdSessionIds.push(createdSession.sessionId);

        await expect(sessionCreatedPromise).resolves.toEqual([createdSession.sessionId]);

        const stateUpdates = z
          .array(
            z
              .object({
                connectionStatus: z.string().optional(),
                currentSessionId: z.string().optional(),
              })
              .passthrough()
          )
          .parse(await stateUpdatePromise);
        expect(stateUpdates).toHaveLength(1);

        if (closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }

        const invalidPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        expect(invalidPromptResponse.status).toBe(400);

        const validPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Alternating close timing prompt cycle ${cycleIndex + 1}.`,
            }),
          }
        );
        expect(validPromptResponse.status).toBe(200);

        if (!closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }
      }

      expect(new Set(createdSessionIds).size).toBe(alternatingRequests.length);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps mixed-close reconnect jitter stable across extended alternating cycles", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-jitter-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-jitter-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const alternatingRequests: Array<Record<string, unknown>> = [
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
      ];
      const closeBeforePromptByCycle = [true, false, true, false, true] as const;
      const createdSessionIds: string[] = [];

      for (let cycleIndex = 0; cycleIndex < alternatingRequests.length; cycleIndex += 1) {
        activeSocket = new WebSocket(`ws://${host}:${port}`);
        await waitForOpen(activeSocket);

        const sessionCreatedPromise = collectSessionCreatedEvents(activeSocket, 1);
        const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
          const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
          expect(stateUpdateResponse.status).toBe(200);
          const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
          expect(contentType).toContain("text/event-stream");
          return collectStateUpdateEvents(stateUpdateResponse, 1);
        })();

        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), cycleIndex % 2 === 0 ? 1 : 0);
        });

        const createResponse = await fetch(`${baseUrl}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alternatingRequests[cycleIndex]),
        });
        expect(createResponse.status).toBe(200);
        const createdSession = createSessionResponseSchema.parse(await createResponse.json());
        createdSessionIds.push(createdSession.sessionId);

        await expect(sessionCreatedPromise).resolves.toEqual([createdSession.sessionId]);
        const stateUpdates = z
          .array(
            z
              .object({
                connectionStatus: z.string().optional(),
                currentSessionId: z.string().optional(),
              })
              .passthrough()
          )
          .parse(await stateUpdatePromise);
        expect(stateUpdates).toHaveLength(1);

        if (closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }

        const invalidPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        expect(invalidPromptResponse.status).toBe(400);

        const validPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Extended jitter reconnect prompt cycle ${cycleIndex + 1}.`,
            }),
          }
        );
        expect(validPromptResponse.status).toBe(200);

        if (!closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }
      }

      expect(new Set(createdSessionIds).size).toBe(alternatingRequests.length);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps jitter reconnect cycles stable with alternating invalid-prompt burst sizes", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-burst-jitter-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-burst-jitter-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const alternatingRequests: Array<Record<string, unknown>> = [
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
        {},
        { harnessId: HARNESS_DEFAULT.MOCK_ID },
      ];
      const closeBeforePromptByCycle = [false, true, false, true, false, true] as const;
      const invalidPromptBurstByCycle = [1, 2, 3, 2, 4, 1] as const;
      const createdSessionIds: string[] = [];

      for (let cycleIndex = 0; cycleIndex < alternatingRequests.length; cycleIndex += 1) {
        activeSocket = new WebSocket(`ws://${host}:${port}`);
        await waitForOpen(activeSocket);

        const sessionCreatedPromise = collectSessionCreatedEvents(activeSocket, 1);
        const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
          const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
          expect(stateUpdateResponse.status).toBe(200);
          const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
          expect(contentType).toContain("text/event-stream");
          return collectStateUpdateEvents(stateUpdateResponse, 1);
        })();

        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), cycleIndex % 3);
        });

        const createResponse = await fetch(`${baseUrl}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alternatingRequests[cycleIndex]),
        });
        expect(createResponse.status).toBe(200);
        const createdSession = createSessionResponseSchema.parse(await createResponse.json());
        createdSessionIds.push(createdSession.sessionId);

        await expect(sessionCreatedPromise).resolves.toEqual([createdSession.sessionId]);
        const stateUpdates = z
          .array(
            z
              .object({
                connectionStatus: z.string().optional(),
                currentSessionId: z.string().optional(),
              })
              .passthrough()
          )
          .parse(await stateUpdatePromise);
        expect(stateUpdates).toHaveLength(1);

        if (closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }

        for (
          let invalidAttemptIndex = 0;
          invalidAttemptIndex < invalidPromptBurstByCycle[cycleIndex];
          invalidAttemptIndex += 1
        ) {
          const invalidPromptResponse = await fetch(
            `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }
          );
          expect(invalidPromptResponse.status).toBe(400);
        }

        const validPromptResponse = await fetch(
          `${baseUrl}/sessions/${createdSession.sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Alternating burst-size reconnect prompt cycle ${cycleIndex + 1}.`,
            }),
          }
        );
        expect(validPromptResponse.status).toBe(200);

        if (!closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }
      }

      expect(new Set(createdSessionIds).size).toBe(alternatingRequests.length);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps burst-size reconnect cycles stable with variable sse reconnect cadence", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-cadence-burst-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-cadence-burst-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const sseReconnectCadenceByCycle = [1, 2, 3, 2] as const;
      const invalidPromptBurstByCycle = [1, 3, 2, 4] as const;
      const closeBeforePromptByCycle = [true, false, true, false] as const;
      const totalExpectedSessionCreates = sseReconnectCadenceByCycle.reduce(
        (accumulator, reconnects) => accumulator + reconnects,
        0
      );
      const createdSessionIds: string[] = [];
      let createRequestIndex = 0;

      for (let cycleIndex = 0; cycleIndex < sseReconnectCadenceByCycle.length; cycleIndex += 1) {
        activeSocket = new WebSocket(`ws://${host}:${port}`);
        await waitForOpen(activeSocket);

        const expectedCreatesInCycle = sseReconnectCadenceByCycle[cycleIndex];
        const sessionCreatedPromise = collectSessionCreatedEvents(
          activeSocket,
          expectedCreatesInCycle
        );
        const cycleSessionIds: string[] = [];

        for (let reconnectIndex = 0; reconnectIndex < expectedCreatesInCycle; reconnectIndex += 1) {
          const stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
            const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
            expect(stateUpdateResponse.status).toBe(200);
            const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
            expect(contentType).toContain("text/event-stream");
            return collectStateUpdateEvents(stateUpdateResponse, 1);
          })();

          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), (cycleIndex + reconnectIndex) % 3);
          });

          const createSessionRequestBody =
            createRequestIndex % 2 === 0 ? {} : { harnessId: HARNESS_DEFAULT.MOCK_ID };
          const createResponse = await fetch(`${baseUrl}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createSessionRequestBody),
          });
          expect(createResponse.status).toBe(200);
          const createdSession = createSessionResponseSchema.parse(await createResponse.json());
          createdSessionIds.push(createdSession.sessionId);
          cycleSessionIds.push(createdSession.sessionId);
          createRequestIndex += 1;

          const stateUpdates = z
            .array(
              z
                .object({
                  connectionStatus: z.string().optional(),
                  currentSessionId: z.string().optional(),
                })
                .passthrough()
            )
            .parse(await stateUpdatePromise);
          expect(stateUpdates).toHaveLength(1);
        }

        await expect(sessionCreatedPromise).resolves.toEqual(cycleSessionIds);

        if (closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }

        for (const sessionId of cycleSessionIds) {
          for (
            let invalidAttemptIndex = 0;
            invalidAttemptIndex < invalidPromptBurstByCycle[cycleIndex];
            invalidAttemptIndex += 1
          ) {
            const invalidPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            expect(invalidPromptResponse.status).toBe(400);
          }

          const validPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Variable cadence reconnect prompt cycle ${cycleIndex + 1}.`,
            }),
          });
          expect(validPromptResponse.status).toBe(200);
        }

        if (!closeBeforePromptByCycle[cycleIndex]) {
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }
      }

      expect(createdSessionIds).toHaveLength(totalExpectedSessionCreates);
      expect(new Set(createdSessionIds).size).toBe(totalExpectedSessionCreates);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps variable websocket and sse reconnect cadence stable across burst cycles", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-dual-cadence-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-dual-cadence-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    const distributeCreatesAcrossReconnects = (
      createCount: number,
      reconnectCount: number
    ): number[] => {
      const baseCount = Math.floor(createCount / reconnectCount);
      const remainder = createCount % reconnectCount;
      const segmentSizes: number[] = [];
      for (let index = 0; index < reconnectCount; index += 1) {
        segmentSizes.push(baseCount + (index < remainder ? 1 : 0));
      }
      return segmentSizes;
    };

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const createCountByCycle = [3, 4, 5] as const;
      const websocketReconnectCadenceByCycle = [1, 2, 3] as const;
      const sseReconnectCadenceByCycle = [3, 2, 1] as const;
      const invalidPromptBurstByCycle = [2, 3, 4] as const;
      const createdSessionIds: string[] = [];
      let createRequestIndex = 0;

      for (let cycleIndex = 0; cycleIndex < createCountByCycle.length; cycleIndex += 1) {
        const cycleCreateCount = createCountByCycle[cycleIndex];
        const websocketSegments = distributeCreatesAcrossReconnects(
          cycleCreateCount,
          websocketReconnectCadenceByCycle[cycleIndex]
        );
        const sseSegments = distributeCreatesAcrossReconnects(
          cycleCreateCount,
          sseReconnectCadenceByCycle[cycleIndex]
        );
        const cycleSessionIds: string[] = [];
        let sseSegmentIndex = 0;
        let sseRemainingInSegment = 0;
        let sseCurrentExpectedCount = 0;
        let stateUpdatePromise: Promise<Array<Record<string, unknown>>> | null = null;

        const openSseSegment = (): void => {
          sseCurrentExpectedCount = sseSegments[sseSegmentIndex];
          sseSegmentIndex += 1;
          sseRemainingInSegment = sseCurrentExpectedCount;
          stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
            const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
            expect(stateUpdateResponse.status).toBe(200);
            const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
            expect(contentType).toContain("text/event-stream");
            return collectStateUpdateEvents(stateUpdateResponse, sseCurrentExpectedCount);
          })();
        };

        for (const websocketSegmentSize of websocketSegments) {
          activeSocket = new WebSocket(`ws://${host}:${port}`);
          await waitForOpen(activeSocket);

          const sessionCreatedPromise = collectSessionCreatedEvents(
            activeSocket,
            websocketSegmentSize
          );
          const websocketSegmentSessionIds: string[] = [];

          for (
            let websocketSegmentCreateIndex = 0;
            websocketSegmentCreateIndex < websocketSegmentSize;
            websocketSegmentCreateIndex += 1
          ) {
            if (sseRemainingInSegment === 0) {
              openSseSegment();
            }

            await new Promise<void>((resolve) => {
              setTimeout(
                () => resolve(),
                (cycleIndex + websocketSegmentCreateIndex + createRequestIndex) % 3
              );
            });

            const createSessionRequestBody =
              createRequestIndex % 2 === 0 ? {} : { harnessId: HARNESS_DEFAULT.MOCK_ID };
            const createResponse = await fetch(`${baseUrl}/sessions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(createSessionRequestBody),
            });
            expect(createResponse.status).toBe(200);
            const createdSession = createSessionResponseSchema.parse(await createResponse.json());
            createdSessionIds.push(createdSession.sessionId);
            cycleSessionIds.push(createdSession.sessionId);
            websocketSegmentSessionIds.push(createdSession.sessionId);
            sseRemainingInSegment -= 1;
            createRequestIndex += 1;

            if (sseRemainingInSegment === 0) {
              const stateUpdates = z
                .array(
                  z
                    .object({
                      connectionStatus: z.string().optional(),
                      currentSessionId: z.string().optional(),
                    })
                    .passthrough()
                )
                .parse(await stateUpdatePromise);
              expect(stateUpdates).toHaveLength(sseCurrentExpectedCount);
              stateUpdatePromise = null;
            }
          }

          await expect(sessionCreatedPromise).resolves.toEqual(websocketSegmentSessionIds);
          await new Promise<void>((resolve) => {
            if (activeSocket?.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }
            activeSocket?.once("close", () => resolve());
            activeSocket?.close();
          });
          activeSocket = null;
        }

        for (const sessionId of cycleSessionIds) {
          for (
            let invalidAttemptIndex = 0;
            invalidAttemptIndex < invalidPromptBurstByCycle[cycleIndex];
            invalidAttemptIndex += 1
          ) {
            const invalidPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            expect(invalidPromptResponse.status).toBe(400);
          }

          const validPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Variable dual cadence reconnect prompt cycle ${cycleIndex + 1}.`,
            }),
          });
          expect(validPromptResponse.status).toBe(200);
        }
      }

      const expectedTotalCreates = createCountByCycle.reduce(
        (totalCreates, cycleCreateCount) => totalCreates + cycleCreateCount,
        0
      );
      expect(createdSessionIds).toHaveLength(expectedTotalCreates);
      expect(new Set(createdSessionIds).size).toBe(expectedTotalCreates);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps reconnect-order inversion stable across dual cadence stream cycles", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-order-inversion-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-order-inversion-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    const distributeCreatesAcrossReconnects = (
      createCount: number,
      reconnectCount: number
    ): number[] => {
      const baseCount = Math.floor(createCount / reconnectCount);
      const remainder = createCount % reconnectCount;
      const segmentSizes: number[] = [];
      for (let index = 0; index < reconnectCount; index += 1) {
        segmentSizes.push(baseCount + (index < remainder ? 1 : 0));
      }
      return segmentSizes;
    };

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const createCountByCycle = [2, 3, 2, 3] as const;
      const websocketReconnectCadenceByCycle = [1, 3, 1, 3] as const;
      const sseReconnectCadenceByCycle = [2, 1, 2, 1] as const;
      const openSseFirstByCycle = [true, false, true, false] as const;
      const openOrderJitterByCycleMs = [0, 2, 1, 2] as const;
      const createJitterByCycleMs = [1, 0, 2, 0] as const;
      const invalidPromptBurstByCycle = [1, 3, 1, 3] as const;
      const createdSessionIds: string[] = [];
      let createRequestIndex = 0;

      for (let cycleIndex = 0; cycleIndex < createCountByCycle.length; cycleIndex += 1) {
        const cycleCreateCount = createCountByCycle[cycleIndex];
        const websocketSegmentSizes = distributeCreatesAcrossReconnects(
          cycleCreateCount,
          websocketReconnectCadenceByCycle[cycleIndex]
        );
        const sseSegmentSizes = distributeCreatesAcrossReconnects(
          cycleCreateCount,
          sseReconnectCadenceByCycle[cycleIndex]
        );
        expect(websocketSegmentSizes.length).not.toBe(sseSegmentSizes.length);
        const cycleSessionIds: string[] = [];
        let websocketSegmentIndex = 0;
        let sseSegmentIndex = 0;
        let websocketSegmentRemaining = 0;
        let sseSegmentRemaining = 0;
        let websocketSegmentSessionIds: string[] = [];
        let websocketSegmentPromise: Promise<string[]> | null = null;
        let sseSegmentExpectedCount = 0;
        let stateUpdatePromise: Promise<Array<Record<string, unknown>>> | null = null;

        const openNextWebsocketSegment = async (): Promise<void> => {
          const expectedCount = websocketSegmentSizes[websocketSegmentIndex];
          websocketSegmentIndex += 1;
          await new Promise<void>((resolve) => {
            setTimeout(
              () => resolve(),
              (openOrderJitterByCycleMs[cycleIndex] + websocketSegmentIndex) % 3
            );
          });
          activeSocket = new WebSocket(`ws://${host}:${port}`);
          await waitForOpen(activeSocket);
          websocketSegmentRemaining = expectedCount;
          websocketSegmentSessionIds = [];
          websocketSegmentPromise = collectSessionCreatedEvents(activeSocket, expectedCount);
        };

        const openNextSseSegment = async (): Promise<void> => {
          sseSegmentExpectedCount = sseSegmentSizes[sseSegmentIndex];
          sseSegmentIndex += 1;
          await new Promise<void>((resolve) => {
            setTimeout(
              () => resolve(),
              (openOrderJitterByCycleMs[cycleIndex] + sseSegmentIndex + 1) % 3
            );
          });
          sseSegmentRemaining = sseSegmentExpectedCount;
          stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
            const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
            expect(stateUpdateResponse.status).toBe(200);
            const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
            expect(contentType).toContain("text/event-stream");
            return collectStateUpdateEvents(stateUpdateResponse, sseSegmentExpectedCount);
          })();
        };

        for (let cycleCreateIndex = 0; cycleCreateIndex < cycleCreateCount; cycleCreateIndex += 1) {
          if (websocketSegmentRemaining === 0 && sseSegmentRemaining === 0) {
            if (openSseFirstByCycle[cycleIndex]) {
              await openNextSseSegment();
              await openNextWebsocketSegment();
            } else {
              await openNextWebsocketSegment();
              await openNextSseSegment();
            }
          } else if (websocketSegmentRemaining === 0) {
            await openNextWebsocketSegment();
          } else if (sseSegmentRemaining === 0) {
            await openNextSseSegment();
          }

          await new Promise<void>((resolve) => {
            setTimeout(
              () => resolve(),
              (createJitterByCycleMs[cycleIndex] + cycleCreateIndex + createRequestIndex) % 3
            );
          });

          const createSessionRequestBody =
            createRequestIndex % 2 === 0 ? {} : { harnessId: HARNESS_DEFAULT.MOCK_ID };
          const createResponse = await fetch(`${baseUrl}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createSessionRequestBody),
          });
          expect(createResponse.status).toBe(200);
          const createdSession = createSessionResponseSchema.parse(await createResponse.json());
          createdSessionIds.push(createdSession.sessionId);
          cycleSessionIds.push(createdSession.sessionId);
          websocketSegmentSessionIds.push(createdSession.sessionId);
          websocketSegmentRemaining -= 1;
          sseSegmentRemaining -= 1;
          createRequestIndex += 1;

          if (websocketSegmentRemaining === 0) {
            await expect(websocketSegmentPromise).resolves.toEqual(websocketSegmentSessionIds);
            await new Promise<void>((resolve) => {
              if (activeSocket?.readyState === WebSocket.CLOSED) {
                resolve();
                return;
              }
              activeSocket?.once("close", () => resolve());
              activeSocket?.close();
            });
            activeSocket = null;
            websocketSegmentPromise = null;
          }

          if (sseSegmentRemaining === 0) {
            const stateUpdates = z
              .array(
                z
                  .object({
                    connectionStatus: z.string().optional(),
                    currentSessionId: z.string().optional(),
                  })
                  .passthrough()
              )
              .parse(await stateUpdatePromise);
            expect(stateUpdates).toHaveLength(sseSegmentExpectedCount);
            stateUpdatePromise = null;
          }
        }

        expect(websocketSegmentIndex).toBe(websocketSegmentSizes.length);
        expect(sseSegmentIndex).toBe(sseSegmentSizes.length);

        for (const sessionId of cycleSessionIds) {
          for (
            let invalidAttemptIndex = 0;
            invalidAttemptIndex < invalidPromptBurstByCycle[cycleIndex];
            invalidAttemptIndex += 1
          ) {
            const invalidPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            expect(invalidPromptResponse.status).toBe(400);
          }

          const validPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Reconnect-order inversion prompt cycle ${cycleIndex + 1}.`,
            }),
          });
          expect(validPromptResponse.status).toBe(200);
        }
      }

      const expectedTotalCreates = createCountByCycle.reduce(
        (totalCreates, cycleCreateCount) => totalCreates + cycleCreateCount,
        0
      );
      expect(createdSessionIds).toHaveLength(expectedTotalCreates);
      expect(new Set(createdSessionIds).size).toBe(expectedTotalCreates);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps reconnect-order inversion stable with per-cycle jitter variation", async () => {
    const projectRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-project-env-stream-order-jitter-")
    );
    const homeRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-home-env-stream-order-jitter-")
    );
    const projectHarnessDirectory = path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR);
    const homeHarnessDirectory = path.join(homeRoot, FILE_PATH.TOADSTOOL_DIR);
    const projectHarnessFilePath = path.join(projectHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const homeHarnessFilePath = path.join(homeHarnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();
    const originalCursorCommand = process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const originalGeminiCommand = process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND];

    await mkdir(projectHarnessDirectory, { recursive: true });
    await mkdir(homeHarnessDirectory, { recursive: true });

    await writeFile(
      projectHarnessFilePath,
      JSON.stringify(
        {
          defaultHarness: HARNESS_DEFAULT.MOCK_ID,
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              name: "Mock",
              command: HARNESS_DEFAULT.MOCK_ID,
              env: {
                PROJECT_TOKEN: "project-value",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      homeHarnessFilePath,
      JSON.stringify(
        {
          harnesses: {
            [HARNESS_DEFAULT.MOCK_ID]: {
              env: {
                PROJECT_TOKEN: "${TOADSTOOL_CURSOR_COMMAND}",
                USER_TOKEN: "${TOADSTOOL_GEMINI_COMMAND}",
              },
            },
          },
        },
        null,
        2
      )
    );

    process.env.HOME = homeRoot;
    process.chdir(projectRoot);
    process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
    process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
    EnvManager.resetInstance();

    const distributeCreatesAcrossReconnects = (
      createCount: number,
      reconnectCount: number
    ): number[] => {
      const baseCount = Math.floor(createCount / reconnectCount);
      const remainder = createCount % reconnectCount;
      const segmentSizes: number[] = [];
      for (let index = 0; index < reconnectCount; index += 1) {
        segmentSizes.push(baseCount + (index < remainder ? 1 : 0));
      }
      return segmentSizes;
    };

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    let activeSocket: WebSocket | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const createCountByCycle = [2, 2, 2] as const;
      const websocketReconnectCadenceByCycle = [1, 2, 1] as const;
      const sseReconnectCadenceByCycle = [2, 1, 2] as const;
      const openSseFirstByCycle = [true, false, true] as const;
      const openOrderJitterByCycleMs = [0, 1, 2] as const;
      const createJitterByCycleMs = [2, 0, 1] as const;
      const invalidPromptBurstByCycle = [1, 2, 1] as const;
      const createdSessionIds: string[] = [];
      let createRequestIndex = 0;

      for (let cycleIndex = 0; cycleIndex < createCountByCycle.length; cycleIndex += 1) {
        const cycleCreateCount = createCountByCycle[cycleIndex];
        const websocketSegmentSizes = distributeCreatesAcrossReconnects(
          cycleCreateCount,
          websocketReconnectCadenceByCycle[cycleIndex]
        );
        const sseSegmentSizes = distributeCreatesAcrossReconnects(
          cycleCreateCount,
          sseReconnectCadenceByCycle[cycleIndex]
        );
        const cycleSessionIds: string[] = [];
        let websocketSegmentIndex = 0;
        let sseSegmentIndex = 0;
        let websocketSegmentRemaining = 0;
        let sseSegmentRemaining = 0;
        let websocketSegmentSessionIds: string[] = [];
        let websocketSegmentPromise: Promise<string[]> | null = null;
        let sseSegmentExpectedCount = 0;
        let stateUpdatePromise: Promise<Array<Record<string, unknown>>> | null = null;

        const openNextWebsocketSegment = async (): Promise<void> => {
          const expectedCount = websocketSegmentSizes[websocketSegmentIndex];
          websocketSegmentIndex += 1;
          await new Promise<void>((resolve) => {
            setTimeout(
              () => resolve(),
              (openOrderJitterByCycleMs[cycleIndex] + websocketSegmentIndex) % 3
            );
          });
          activeSocket = new WebSocket(`ws://${host}:${port}`);
          await waitForOpen(activeSocket);
          websocketSegmentRemaining = expectedCount;
          websocketSegmentSessionIds = [];
          websocketSegmentPromise = collectSessionCreatedEvents(activeSocket, expectedCount);
        };

        const openNextSseSegment = async (): Promise<void> => {
          sseSegmentExpectedCount = sseSegmentSizes[sseSegmentIndex];
          sseSegmentIndex += 1;
          await new Promise<void>((resolve) => {
            setTimeout(
              () => resolve(),
              (openOrderJitterByCycleMs[cycleIndex] + sseSegmentIndex + 1) % 3
            );
          });
          sseSegmentRemaining = sseSegmentExpectedCount;
          stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
            const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
            expect(stateUpdateResponse.status).toBe(200);
            const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
            expect(contentType).toContain("text/event-stream");
            return collectStateUpdateEvents(stateUpdateResponse, sseSegmentExpectedCount);
          })();
        };

        for (let cycleCreateIndex = 0; cycleCreateIndex < cycleCreateCount; cycleCreateIndex += 1) {
          if (websocketSegmentRemaining === 0 && sseSegmentRemaining === 0) {
            if (openSseFirstByCycle[cycleIndex]) {
              await openNextSseSegment();
              await openNextWebsocketSegment();
            } else {
              await openNextWebsocketSegment();
              await openNextSseSegment();
            }
          } else if (websocketSegmentRemaining === 0) {
            await openNextWebsocketSegment();
          } else if (sseSegmentRemaining === 0) {
            await openNextSseSegment();
          }

          await new Promise<void>((resolve) => {
            setTimeout(
              () => resolve(),
              (createJitterByCycleMs[cycleIndex] + cycleCreateIndex + createRequestIndex) % 3
            );
          });

          const createSessionRequestBody =
            createRequestIndex % 2 === 0 ? {} : { harnessId: HARNESS_DEFAULT.MOCK_ID };
          const createResponse = await fetch(`${baseUrl}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createSessionRequestBody),
          });
          expect(createResponse.status).toBe(200);
          const createdSession = createSessionResponseSchema.parse(await createResponse.json());
          createdSessionIds.push(createdSession.sessionId);
          cycleSessionIds.push(createdSession.sessionId);
          websocketSegmentSessionIds.push(createdSession.sessionId);
          websocketSegmentRemaining -= 1;
          sseSegmentRemaining -= 1;
          createRequestIndex += 1;

          if (websocketSegmentRemaining === 0) {
            await expect(websocketSegmentPromise).resolves.toEqual(websocketSegmentSessionIds);
            await new Promise<void>((resolve) => {
              if (activeSocket?.readyState === WebSocket.CLOSED) {
                resolve();
                return;
              }
              activeSocket?.once("close", () => resolve());
              activeSocket?.close();
            });
            activeSocket = null;
            websocketSegmentPromise = null;
          }

          if (sseSegmentRemaining === 0) {
            const stateUpdates = z
              .array(
                z
                  .object({
                    connectionStatus: z.string().optional(),
                    currentSessionId: z.string().optional(),
                  })
                  .passthrough()
              )
              .parse(await stateUpdatePromise);
            expect(stateUpdates).toHaveLength(sseSegmentExpectedCount);
            stateUpdatePromise = null;
          }
        }

        expect(websocketSegmentIndex).toBe(websocketSegmentSizes.length);
        expect(sseSegmentIndex).toBe(sseSegmentSizes.length);

        for (const sessionId of cycleSessionIds) {
          for (
            let invalidAttemptIndex = 0;
            invalidAttemptIndex < invalidPromptBurstByCycle[cycleIndex];
            invalidAttemptIndex += 1
          ) {
            const invalidPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            expect(invalidPromptResponse.status).toBe(400);
          }

          const validPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Reconnect-order jitter prompt cycle ${cycleIndex + 1}.`,
            }),
          });
          expect(validPromptResponse.status).toBe(200);
        }
      }

      const expectedTotalCreates = createCountByCycle.reduce(
        (totalCreates, cycleCreateCount) => totalCreates + cycleCreateCount,
        0
      );
      expect(createdSessionIds).toHaveLength(expectedTotalCreates);
      expect(new Set(createdSessionIds).size).toBe(expectedTotalCreates);
    } finally {
      if (activeSocket) {
        await new Promise<void>((resolve) => {
          if (activeSocket?.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          activeSocket?.once("close", () => resolve());
          activeSocket?.close();
        });
      }
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      if (originalCursorCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_CURSOR_COMMAND] = originalCursorCommand;
      }
      if (originalGeminiCommand === undefined) {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = undefined;
      } else {
        process.env[ENV_KEY.TOADSTOOL_GEMINI_COMMAND] = originalGeminiCommand;
      }
      EnvManager.resetInstance();
      await rm(projectRoot, { recursive: true, force: true });
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("keeps server responsive after repeated fallback explicit mock requests", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "toadstool-headless-fallback-default-")
    );
    const harnessDirectory = path.join(temporaryRoot, FILE_PATH.TOADSTOOL_DIR);
    const harnessFilePath = path.join(harnessDirectory, FILE_PATH.HARNESSES_JSON);
    const originalHome = process.env.HOME;
    const originalCwd = process.cwd();

    await mkdir(harnessDirectory, { recursive: true });
    await writeFile(harnessFilePath, "{invalid json");

    process.env.HOME = temporaryRoot;
    process.chdir(temporaryRoot);
    EnvManager.resetInstance();

    let server: Awaited<ReturnType<typeof startHeadlessServer>> | null = null;
    try {
      server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
      const { host, port } = server.address();
      const baseUrl = `http://${host}:${port}`;

      const firstResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(firstResponse.status).toBe(200);
      const firstPayload = createSessionResponseSchema.parse(await firstResponse.json());
      expect(firstPayload.sessionId).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(secondResponse.status).toBe(200);
      const secondPayload = createSessionResponseSchema.parse(await secondResponse.json());
      expect(secondPayload.sessionId).toBeTruthy();
      expect(secondPayload.sessionId).not.toBe(firstPayload.sessionId);
    } finally {
      if (server) {
        await server.close();
      }
      process.chdir(originalCwd);
      if (originalHome === undefined) {
        process.env.HOME = undefined;
      } else {
        process.env.HOME = originalHome;
      }
      EnvManager.resetInstance();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("returns request body too large for oversized payloads", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;
    const oversizedPayload = "x".repeat(SERVER_CONFIG.MAX_BODY_BYTES + 1);

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedPayload,
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE,
      });
    } finally {
      await server.close();
    }
  });

  it("returns empty message list for unknown session ids", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/sessions/session-unknown/messages`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ messages: [] });
    } finally {
      await server.close();
    }
  });

  it("returns method not allowed for known API routes with unsupported methods", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const configResponse = await fetch(`${baseUrl}/api/config`, {
        method: "POST",
      });
      expect(configResponse.status).toBe(405);
      await expect(configResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const executeResponse = await fetch(`${baseUrl}/api/tui/execute-command`);
      expect(executeResponse.status).toBe(405);
      await expect(executeResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });
    } finally {
      await server.close();
    }
  });

  it("returns method not allowed for known non-api routes with unsupported methods", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const healthResponse = await fetch(`${baseUrl}/health`, {
        method: "POST",
      });
      expect(healthResponse.status).toBe(405);
      await expect(healthResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionsResponse = await fetch(`${baseUrl}/sessions`);
      expect(sessionsResponse.status).toBe(405);
      await expect(sessionsResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const promptResponse = await fetch(`${baseUrl}/sessions/session-1/prompt`);
      expect(promptResponse.status).toBe(405);
      await expect(promptResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const messagesResponse = await fetch(`${baseUrl}/sessions/session-1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "ignored" }),
      });
      expect(messagesResponse.status).toBe(405);
      await expect(messagesResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });
    } finally {
      await server.close();
    }
  });

  it("returns body-too-large error for oversized api route payloads", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;
    const oversizedPayload = JSON.stringify({
      command: "x".repeat(SERVER_CONFIG.MAX_BODY_BYTES + 1),
    });

    try {
      const response = await fetch(`${baseUrl}/api/tui/execute-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedPayload,
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE,
      });
    } finally {
      await server.close();
    }
  });

  it("applies auth checks before method-not-allowed semantics on api routes", async () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const unauthenticatedResponse = await fetch(`${baseUrl}/api/config`, {
        method: "POST",
      });
      expect(unauthenticatedResponse.status).toBe(401);
      expect(unauthenticatedResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const authenticatedResponse = await fetch(`${baseUrl}/api/config`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedResponse.status).toBe(405);
      await expect(authenticatedResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });
    } finally {
      await server.close();
      delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
      EnvManager.resetInstance();
    }
  });

  it("applies auth checks before method semantics on non-api protected routes", async () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const unauthenticatedResponse = await fetch(`${baseUrl}/sessions`);
      expect(unauthenticatedResponse.status).toBe(401);
      expect(unauthenticatedResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const authenticatedResponse = await fetch(`${baseUrl}/sessions`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedResponse.status).toBe(405);
      await expect(authenticatedResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });
    } finally {
      await server.close();
      delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
      EnvManager.resetInstance();
    }
  });
});

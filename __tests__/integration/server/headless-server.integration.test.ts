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

interface ReconnectJitterMatrixConfig {
  openOrderByCycleMs: readonly number[];
  createByCycleMs: readonly number[];
  invalidPromptBurstByCycle: readonly number[];
}

interface ReconnectJitterMatrix {
  openOrderByCycleMs: readonly number[];
  createByCycleMs: readonly number[];
  invalidPromptBurstByCycle: readonly number[];
}

const createReconnectJitterMatrix = (
  config: ReconnectJitterMatrixConfig
): ReconnectJitterMatrix => {
  return {
    openOrderByCycleMs: [...config.openOrderByCycleMs],
    createByCycleMs: [...config.createByCycleMs],
    invalidPromptBurstByCycle: [...config.invalidPromptBurstByCycle],
  };
};

const delayForMs = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), durationMs);
  });
};

const delayWithModulo = (durationMs: number, modulo: number): Promise<void> => {
  return delayForMs(durationMs % modulo);
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

  it("supports trailing-slash variants for core, api, and session routes", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const healthResponse = await fetch(`${baseUrl}/health/`);
      expect(healthResponse.status).toBe(200);
      await expect(healthResponse.json()).resolves.toEqual({ status: "ok" });

      const configResponse = await fetch(`${baseUrl}/api/config/`);
      expect(configResponse.status).toBe(200);
      await expect(configResponse.json()).resolves.toMatchObject({
        config: expect.any(Object),
      });

      const createResponse = await fetch(`${baseUrl}/sessions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: "mock" }),
      });
      expect(createResponse.status).toBe(200);
      const createPayload = createSessionResponseSchema.parse(await createResponse.json());

      const promptResponse = await fetch(`${baseUrl}/sessions/${createPayload.sessionId}/prompt/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello trailing slash." }),
      });
      expect(promptResponse.status).toBe(200);
      await expect(promptResponse.json()).resolves.toMatchObject({
        stopReason: expect.any(String),
      });

      const messagesResponse = await fetch(
        `${baseUrl}/sessions/${createPayload.sessionId}/messages/`
      );
      expect(messagesResponse.status).toBe(200);
      await expect(messagesResponse.json()).resolves.toMatchObject({
        messages: expect.any(Array),
      });
    } finally {
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

      const apiRootResponse = await fetch(`${baseUrl}/api`);
      expect(apiRootResponse.status).toBe(404);
      await expect(apiRootResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const apiRootWithQueryResponse = await fetch(`${baseUrl}/api?scope=all`);
      expect(apiRootWithQueryResponse.status).toBe(404);
      await expect(apiRootWithQueryResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const apiRootWithTrailingSlashResponse = await fetch(`${baseUrl}/api/`);
      expect(apiRootWithTrailingSlashResponse.status).toBe(404);
      await expect(apiRootWithTrailingSlashResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const malformedApiPathResponse = await fetch(`${baseUrl}/api//config`, {
        method: "POST",
      });
      expect(malformedApiPathResponse.status).toBe(404);
      await expect(malformedApiPathResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const malformedApiSessionPathResponse = await fetch(`${baseUrl}/api/sessions//messages`, {
        method: "POST",
      });
      expect(malformedApiSessionPathResponse.status).toBe(404);
      await expect(malformedApiSessionPathResponse.json()).resolves.toEqual({
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

      const missingActionGetResponse = await fetch(`${baseUrl}/sessions/session-1`);
      expect(missingActionGetResponse.status).toBe(404);
      await expect(missingActionGetResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const missingActionPostResponse = await fetch(`${baseUrl}/sessions/session-1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(missingActionPostResponse.status).toBe(404);
      await expect(missingActionPostResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const missingActionTrailingSlashResponse = await fetch(`${baseUrl}/sessions/session-1/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(missingActionTrailingSlashResponse.status).toBe(404);
      await expect(missingActionTrailingSlashResponse.json()).resolves.toEqual({
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

      const blankSessionPromptRoute = await fetch(`${baseUrl}/sessions//prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(blankSessionPromptRoute.status).toBe(404);
      await expect(blankSessionPromptRoute.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const blankSessionMessagesRoute = await fetch(`${baseUrl}/sessions//messages`);
      expect(blankSessionMessagesRoute.status).toBe(404);
      await expect(blankSessionMessagesRoute.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const blankActionSegmentPromptRoute = await fetch(`${baseUrl}/sessions/session-1//prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });
      expect(blankActionSegmentPromptRoute.status).toBe(404);
      await expect(blankActionSegmentPromptRoute.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const blankActionSegmentMessagesRoute = await fetch(
        `${baseUrl}/sessions/session-1//messages`
      );
      expect(blankActionSegmentMessagesRoute.status).toBe(404);
      await expect(blankActionSegmentMessagesRoute.json()).resolves.toEqual({
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

        await delayForMs(cycleIndex % 2 === 0 ? 1 : 0);

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

        await delayWithModulo(cycleIndex, 3);

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

          await delayWithModulo(cycleIndex + reconnectIndex, 3);

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

            await delayWithModulo(cycleIndex + websocketSegmentCreateIndex + createRequestIndex, 3);

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
      const websocketOpenJitterByCycleMs = [0, 3, 0, 3] as const;
      const sseOpenJitterByCycleMs = [3, 0, 3, 0] as const;
      const createJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const createJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const recoveryJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const recoveryJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const invalidBurstSpacingSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const invalidBurstSpacingWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postRecoveryDelaySseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postRecoveryDelayWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const cycleCooldownSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const cycleCooldownWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const websocketCloseDelaySseFirstByCycleMs = [0, 3, 0, 3] as const;
      const websocketCloseDelayWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const sseCloseDelaySseFirstByCycleMs = [0, 2, 0, 2] as const;
      const sseCloseDelayWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const closeInterleaveDelaySseFirstByCycleMs = [0, 2, 0, 2] as const;
      const closeInterleaveDelayWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseCreateJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseCreateJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseRecoveryJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseRecoveryJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postCloseCycleTransitionJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postCloseCycleTransitionJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseSegmentOpenGatingJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseSegmentOpenGatingJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postCloseSegmentRearmJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postCloseSegmentRearmJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseInvalidBurstRampJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseInvalidBurstRampJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postCloseValidPromptRampJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postCloseValidPromptRampJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseRecoveryConfirmJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseRecoveryConfirmJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postCloseRecoverySettleJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postCloseRecoverySettleJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseCycleHandoffJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseCycleHandoffJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postCloseCycleCooldownHandoffJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postCloseCycleCooldownHandoffJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseCycleTransitionHandoffJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseCycleTransitionHandoffJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postCloseSegmentOpenHandoffJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postCloseSegmentOpenHandoffJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postCloseSegmentRearmHandoffJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postCloseSegmentRearmHandoffJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstHandoffJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstHandoffJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoverySettleJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoverySettleJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryConfirmJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryConfirmJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryHandoffJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryHandoffJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryCooldownJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCooldownJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryDriftJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryDriftJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryTransitionJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryTransitionJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryCheckpointJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryCheckpointJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryFinalizeJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryFinalizeJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryAnchorJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryAnchorJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoverySealJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoverySealJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryGuardJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGuardJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryLockJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryLockJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryBoltJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBoltJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryClampJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryClampJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryBraceJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBraceJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryLatchJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryLatchJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryRivetJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryRivetJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryPinJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryPinJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryStudJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryStudJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoverySpikeJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoverySpikeJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryNotchJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryNotchJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryGrooveJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryGrooveJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryRidgeJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryRidgeJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryBannerJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryBannerJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryPeakJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPeakJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoverySummitJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoverySummitJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryApexJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryApexJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryCrownJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCrownJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryTiaraJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryTiaraJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryDiademJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryDiademJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryCoronetJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryCoronetJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryCircletJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCircletJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryBandJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBandJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryBangleJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryBangleJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryBraceletJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBraceletJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryAnkletJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryAnkletJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryToeRingJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryToeRingJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryCharmJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCharmJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryPendantJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPendantJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryLocketJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryLocketJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryMedallionJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryMedallionJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryAmuletJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryAmuletJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryTalismanJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryTalismanJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryTotemJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryTotemJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryRelicJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryRelicJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoverySigilJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoverySigilJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryGlyphJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGlyphJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryRuneJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryRuneJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryInsigniaJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryInsigniaJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryEmblemJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryEmblemJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryBadgeJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBadgeJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryCrestJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCrestJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryStandardJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryStandardJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryFlagJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryFlagJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryPennantJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPennantJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryGuidonJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryGuidonJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryBurgeeJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBurgeeJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryStreamerJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryStreamerJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryPennonJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPennonJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryEnsignJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryEnsignJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryGonfalonJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGonfalonJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryOriflammeJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryOriflammeJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryVexillumJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryVexillumJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryLabarumJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryLabarumJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryDracoJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryDracoJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoverySignumJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoverySignumJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryVexiloidJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryVexiloidJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryBanderoleJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryBanderoleJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryPennoncelleJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPennoncelleJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryStreameretJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryStreameretJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryGuidonetJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGuidonetJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryCornetteJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCornetteJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryFanionJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryFanionJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryChapeauJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryChapeauJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryBanneretJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBanneretJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryBaucanJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryBaucanJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryGonfanonJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGonfanonJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryRibbandJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryRibbandJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryPencelJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPencelJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryRibbonetJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryRibbonetJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryTasselJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryTasselJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryInescutcheonJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryInescutcheonJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryEscarbuncleJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryEscarbuncleJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryRoundelJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryRoundelJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryBilletteJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBilletteJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryLozengeJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryLozengeJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryFusilJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryFusilJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryMascleJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryMascleJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryRustreJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryRustreJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryAnnuletJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryAnnuletJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryTorteauJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryTorteauJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryBezantJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryBezantJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryPlateJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPlateJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryPelletJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryPelletJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryHurtJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryHurtJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryPommeJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryPommeJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryGolpeJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGolpeJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryOgressJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryOgressJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryFountainJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryFountainJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryGurgesJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryGurgesJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryBarryJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryBarryJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryBendJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryBendJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryFlaunchesJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryFlaunchesJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryPaleJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryPaleJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryFessJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryFessJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryChevronJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryChevronJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryChiefJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryChiefJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryPallJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryPallJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoverySaltireJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoverySaltireJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryPileJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryPileJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryCrossJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryCrossJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryFretJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryFretJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryGyronJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryGyronJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryOrleJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryOrleJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryTressureJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryTressureJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryTrefoilJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryTrefoilJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryLabelJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryLabelJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryMottoJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryMottoJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoverySupporterJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoverySupporterJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryCompartmentJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCompartmentJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryTorseJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryTorseJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryCaparisonJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCaparisonJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryPavilionJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryPavilionJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryLiveryJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryLiveryJitterWebsocketFirstByCycleMs = [2, 0, 2, 0] as const;
      const postClosePromptBurstRecoveryEscutcheonJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryEscutcheonJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
      const postClosePromptBurstRecoveryMantlingJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryMantlingJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryHelmJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryHelmJitterWebsocketFirstByCycleMs = [3, 0, 3, 0] as const;
      const postClosePromptBurstRecoveryCartoucheJitterSseFirstByCycleMs = [0, 2, 0, 2] as const;
      const postClosePromptBurstRecoveryCartoucheJitterWebsocketFirstByCycleMs = [
        2, 0, 2, 0,
      ] as const;
      const postClosePromptBurstRecoveryVamplateJitterSseFirstByCycleMs = [0, 3, 0, 3] as const;
      const postClosePromptBurstRecoveryVamplateJitterWebsocketFirstByCycleMs = [
        3, 0, 3, 0,
      ] as const;
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
        expect(websocketOpenJitterByCycleMs[cycleIndex]).not.toBe(
          sseOpenJitterByCycleMs[cycleIndex]
        );
        expect(createJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          createJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(recoveryJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          recoveryJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(invalidBurstSpacingSseFirstByCycleMs[cycleIndex]).not.toBe(
          invalidBurstSpacingWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postRecoveryDelaySseFirstByCycleMs[cycleIndex]).not.toBe(
          postRecoveryDelayWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(cycleCooldownSseFirstByCycleMs[cycleIndex]).not.toBe(
          cycleCooldownWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(websocketCloseDelaySseFirstByCycleMs[cycleIndex]).not.toBe(
          websocketCloseDelayWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(sseCloseDelaySseFirstByCycleMs[cycleIndex]).not.toBe(
          sseCloseDelayWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(closeInterleaveDelaySseFirstByCycleMs[cycleIndex]).not.toBe(
          closeInterleaveDelayWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseCreateJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseCreateJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseRecoveryJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseRecoveryJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseCycleTransitionJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseCycleTransitionJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseSegmentOpenGatingJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseSegmentOpenGatingJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseSegmentRearmJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseSegmentRearmJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseInvalidBurstRampJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseInvalidBurstRampJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseValidPromptRampJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseValidPromptRampJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseRecoveryConfirmJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseRecoveryConfirmJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseRecoverySettleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseRecoverySettleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseCycleHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseCycleHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseCycleCooldownHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseCycleCooldownHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseCycleTransitionHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseCycleTransitionHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseSegmentOpenHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseSegmentOpenHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postCloseSegmentRearmHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postCloseSegmentRearmHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySettleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySettleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryConfirmJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryConfirmJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryHandoffJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryHandoffJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCooldownJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCooldownJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryDriftJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryDriftJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTransitionJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTransitionJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCheckpointJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCheckpointJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFinalizeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFinalizeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryAnchorJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryAnchorJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySealJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySealJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGuardJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGuardJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLockJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLockJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBoltJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBoltJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryClampJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryClampJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBraceJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBraceJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLatchJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLatchJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRivetJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRivetJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPinJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPinJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryStudJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryStudJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySpikeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySpikeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryNotchJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryNotchJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGrooveJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGrooveJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRidgeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRidgeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBannerJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBannerJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPeakJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPeakJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySummitJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySummitJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryApexJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryApexJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCrownJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCrownJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTiaraJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTiaraJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryDiademJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryDiademJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCoronetJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCoronetJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCircletJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCircletJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBandJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBandJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBangleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBangleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBraceletJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBraceletJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryAnkletJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryAnkletJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryToeRingJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryToeRingJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCharmJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCharmJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPendantJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPendantJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLocketJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLocketJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryMedallionJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryMedallionJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryAmuletJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryAmuletJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTalismanJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTalismanJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTotemJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTotemJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRelicJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRelicJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySigilJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySigilJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGlyphJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGlyphJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRuneJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRuneJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryInsigniaJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryInsigniaJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryEmblemJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryEmblemJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBadgeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBadgeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCrestJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCrestJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryStandardJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryStandardJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFlagJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFlagJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPennantJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPennantJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGuidonJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGuidonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBurgeeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBurgeeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryStreamerJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryStreamerJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPennonJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPennonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryEnsignJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryEnsignJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGonfalonJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGonfalonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryOriflammeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryOriflammeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryVexillumJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryVexillumJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLabarumJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLabarumJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryDracoJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryDracoJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySignumJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySignumJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryVexiloidJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryVexiloidJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBanderoleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBanderoleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPennoncelleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPennoncelleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryStreameretJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryStreameretJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGuidonetJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGuidonetJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCornetteJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCornetteJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFanionJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFanionJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryChapeauJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryChapeauJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBanneretJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBanneretJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBaucanJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBaucanJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGonfanonJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGonfanonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRibbandJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRibbandJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPencelJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPencelJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRibbonetJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRibbonetJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTasselJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTasselJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(
          postClosePromptBurstRecoveryInescutcheonJitterSseFirstByCycleMs[cycleIndex]
        ).not.toBe(
          postClosePromptBurstRecoveryInescutcheonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryEscarbuncleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryEscarbuncleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRoundelJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRoundelJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBilletteJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBilletteJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLozengeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLozengeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFusilJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFusilJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGyronJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGyronJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryOrleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryOrleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTressureJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTressureJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTrefoilJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTrefoilJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLabelJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLabelJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryMottoJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryMottoJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySupporterJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySupporterJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCompartmentJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCompartmentJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTorseJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTorseJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCaparisonJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCaparisonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPavilionJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPavilionJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryLiveryJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryLiveryJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryEscutcheonJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryEscutcheonJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryMantlingJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryMantlingJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryHelmJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryHelmJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCartoucheJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCartoucheJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryVamplateJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryVamplateJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryRustreJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryRustreJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryAnnuletJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryAnnuletJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryTorteauJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryTorteauJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBezantJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBezantJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPlateJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPlateJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPelletJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPelletJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryHurtJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryHurtJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPommeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPommeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGolpeJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGolpeJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryOgressJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryOgressJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFountainJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFountainJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryGurgesJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryGurgesJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBarryJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBarryJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryBendJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryBendJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFlaunchesJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFlaunchesJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPaleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPaleJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFessJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFessJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryChevronJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryChevronJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryChiefJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryChiefJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPallJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPallJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoverySaltireJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoverySaltireJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryPileJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryPileJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryCrossJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryCrossJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryFretJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryFretJitterWebsocketFirstByCycleMs[cycleIndex]
        );
        expect(postClosePromptBurstRecoveryMascleJitterSseFirstByCycleMs[cycleIndex]).not.toBe(
          postClosePromptBurstRecoveryMascleJitterWebsocketFirstByCycleMs[cycleIndex]
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
          await delayWithModulo(
            websocketOpenJitterByCycleMs[cycleIndex] + cycleIndex + websocketSegmentIndex,
            4
          );
          activeSocket = new WebSocket(`ws://${host}:${port}`);
          await waitForOpen(activeSocket);
          websocketSegmentRemaining = expectedCount;
          websocketSegmentSessionIds = [];
          websocketSegmentPromise = collectSessionCreatedEvents(activeSocket, expectedCount);
        };

        const openNextSseSegment = async (): Promise<void> => {
          sseSegmentExpectedCount = sseSegmentSizes[sseSegmentIndex];
          sseSegmentIndex += 1;
          await delayWithModulo(
            sseOpenJitterByCycleMs[cycleIndex] + cycleIndex + sseSegmentIndex + 1,
            4
          );
          sseSegmentRemaining = sseSegmentExpectedCount;
          stateUpdatePromise = (async (): Promise<Array<Record<string, unknown>>> => {
            const stateUpdateResponse = await fetch(`${baseUrl}/api/events`);
            expect(stateUpdateResponse.status).toBe(200);
            const contentType = stateUpdateResponse.headers.get("content-type") ?? "";
            expect(contentType).toContain("text/event-stream");
            return collectStateUpdateEvents(stateUpdateResponse, sseSegmentExpectedCount);
          })();
        };

        const closeWebsocketSegment = async (): Promise<void> => {
          await expect(websocketSegmentPromise).resolves.toEqual(websocketSegmentSessionIds);
          await new Promise<void>((resolve) => {
            const websocketCloseDelayByCycle = openSseFirstByCycle[cycleIndex]
              ? websocketCloseDelaySseFirstByCycleMs[cycleIndex]
              : websocketCloseDelayWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(() => resolve(), websocketCloseDelayByCycle % 4);
          });
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
        };

        const closeSseSegment = async (): Promise<void> => {
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
          await new Promise<void>((resolve) => {
            const sseCloseDelayByCycle = openSseFirstByCycle[cycleIndex]
              ? sseCloseDelaySseFirstByCycleMs[cycleIndex]
              : sseCloseDelayWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(() => resolve(), sseCloseDelayByCycle % 3);
          });
        };

        for (let cycleCreateIndex = 0; cycleCreateIndex < cycleCreateCount; cycleCreateIndex += 1) {
          if (cycleCreateIndex === 0 && cycleIndex > 0) {
            await new Promise<void>((resolve) => {
              const postCloseSegmentOpenHandoffJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postCloseSegmentOpenHandoffJitterSseFirstByCycleMs[cycleIndex]
                : postCloseSegmentOpenHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postCloseSegmentOpenHandoffJitterByCycle + cycleIndex + cycleCreateIndex + 1) % 4
              );
            });
          }
          if (
            cycleCreateIndex > 0 &&
            websocketSegmentRemaining === 0 &&
            sseSegmentRemaining === 0
          ) {
            await new Promise<void>((resolve) => {
              const postCloseSegmentOpenGatingJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postCloseSegmentOpenGatingJitterSseFirstByCycleMs[cycleIndex]
                : postCloseSegmentOpenGatingJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postCloseSegmentOpenGatingJitterByCycle + cycleCreateIndex + cycleIndex) % 4
              );
            });
          }
          if (
            cycleCreateIndex > 0 &&
            (websocketSegmentRemaining === 0) !== (sseSegmentRemaining === 0)
          ) {
            if (cycleIndex > 0) {
              await new Promise<void>((resolve) => {
                const postCloseSegmentRearmHandoffJitterByCycle = openSseFirstByCycle[cycleIndex]
                  ? postCloseSegmentRearmHandoffJitterSseFirstByCycleMs[cycleIndex]
                  : postCloseSegmentRearmHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
                setTimeout(
                  () => resolve(),
                  (postCloseSegmentRearmHandoffJitterByCycle + cycleCreateIndex + cycleIndex) % 4
                );
              });
            }
            await new Promise<void>((resolve) => {
              const postCloseSegmentRearmJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postCloseSegmentRearmJitterSseFirstByCycleMs[cycleIndex]
                : postCloseSegmentRearmJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postCloseSegmentRearmJitterByCycle + cycleCreateIndex + cycleIndex + 1) % 4
              );
            });
          }
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
            const createJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? createJitterSseFirstByCycleMs[cycleIndex]
              : createJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (createJitterByCycle + cycleCreateIndex + createRequestIndex) % 4
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
          const shouldCloseWebsocketSegment = websocketSegmentRemaining === 0;
          const shouldCloseSseSegment = sseSegmentRemaining === 0;
          const closeInterleaveDelayByCycle = openSseFirstByCycle[cycleIndex]
            ? closeInterleaveDelaySseFirstByCycleMs[cycleIndex]
            : closeInterleaveDelayWebsocketFirstByCycleMs[cycleIndex];
          if (shouldCloseWebsocketSegment && shouldCloseSseSegment) {
            if (openSseFirstByCycle[cycleIndex]) {
              await closeSseSegment();
              await delayWithModulo(closeInterleaveDelayByCycle, 3);
              await closeWebsocketSegment();
            } else {
              await closeWebsocketSegment();
              await delayWithModulo(closeInterleaveDelayByCycle, 3);
              await closeSseSegment();
            }
          } else if (shouldCloseWebsocketSegment) {
            await closeWebsocketSegment();
          } else if (shouldCloseSseSegment) {
            await closeSseSegment();
          }
          if (shouldCloseWebsocketSegment || shouldCloseSseSegment) {
            const postCloseCreateJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseCreateJitterSseFirstByCycleMs[cycleIndex]
              : postCloseCreateJitterWebsocketFirstByCycleMs[cycleIndex];
            await delayWithModulo(postCloseCreateJitterByCycle, 4);
          }
        }

        expect(websocketSegmentIndex).toBe(websocketSegmentSizes.length);
        expect(sseSegmentIndex).toBe(sseSegmentSizes.length);

        for (const [cycleSessionIndex, sessionId] of cycleSessionIds.entries()) {
          if (cycleSessionIndex > 0) {
            await new Promise<void>((resolve) => {
              const postClosePromptBurstHandoffJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstHandoffJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstHandoffJitterByCycle + cycleSessionIndex + cycleIndex) % 4
              );
            });
          }
          await new Promise<void>((resolve) => {
            const postClosePromptJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postClosePromptJitterSseFirstByCycleMs[cycleIndex]
              : postClosePromptJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postClosePromptJitterByCycle + cycleSessionIndex + cycleIndex) % 4
            );
          });
          await new Promise<void>((resolve) => {
            const postCloseInvalidBurstRampJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseInvalidBurstRampJitterSseFirstByCycleMs[cycleIndex]
              : postCloseInvalidBurstRampJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseInvalidBurstRampJitterByCycle + cycleSessionIndex + cycleIndex + 1) % 4
            );
          });
          const invalidBurstSpacingByCycle = openSseFirstByCycle[cycleIndex]
            ? invalidBurstSpacingSseFirstByCycleMs[cycleIndex]
            : invalidBurstSpacingWebsocketFirstByCycleMs[cycleIndex];
          for (
            let invalidAttemptIndex = 0;
            invalidAttemptIndex < invalidPromptBurstByCycle[cycleIndex];
            invalidAttemptIndex += 1
          ) {
            await delayWithModulo(invalidBurstSpacingByCycle + invalidAttemptIndex + cycleIndex, 3);
            const invalidPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            expect(invalidPromptResponse.status).toBe(400);
          }
          await new Promise<void>((resolve) => {
            const postClosePromptBurstRecoverySettleJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postClosePromptBurstRecoverySettleJitterSseFirstByCycleMs[cycleIndex]
              : postClosePromptBurstRecoverySettleJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postClosePromptBurstRecoverySettleJitterByCycle + cycleSessionIndex + cycleIndex) % 4
            );
          });
          await new Promise<void>((resolve) => {
            const postCloseRecoveryJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseRecoveryJitterSseFirstByCycleMs[cycleIndex]
              : postCloseRecoveryJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseRecoveryJitterByCycle + cycleSessionIndex + cycleIndex + 1) % 4
            );
          });

          await new Promise<void>((resolve) => {
            const recoveryJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? recoveryJitterSseFirstByCycleMs[cycleIndex]
              : recoveryJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(() => resolve(), recoveryJitterByCycle % 3);
          });
          await new Promise<void>((resolve) => {
            const postCloseValidPromptRampJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseValidPromptRampJitterSseFirstByCycleMs[cycleIndex]
              : postCloseValidPromptRampJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseValidPromptRampJitterByCycle + cycleSessionIndex + cycleIndex + 1) % 4
            );
          });

          const validPromptResponse = await fetch(`${baseUrl}/sessions/${sessionId}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Reconnect-order inversion prompt cycle ${cycleIndex + 1}.`,
            }),
          });
          expect(validPromptResponse.status).toBe(200);
          await new Promise<void>((resolve) => {
            const postClosePromptBurstRecoveryConfirmJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postClosePromptBurstRecoveryConfirmJitterSseFirstByCycleMs[cycleIndex]
              : postClosePromptBurstRecoveryConfirmJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postClosePromptBurstRecoveryConfirmJitterByCycle + cycleSessionIndex + cycleIndex) %
                4
            );
          });
          await new Promise<void>((resolve) => {
            const postCloseRecoveryConfirmJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseRecoveryConfirmJitterSseFirstByCycleMs[cycleIndex]
              : postCloseRecoveryConfirmJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseRecoveryConfirmJitterByCycle + cycleSessionIndex + cycleIndex + 1) % 4
            );
          });
          if (cycleSessionIndex < cycleSessionIds.length - 1) {
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryHandoffJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryHandoffJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryHandoffJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
          }

          await new Promise<void>((resolve) => {
            const postRecoveryDelayByCycle = openSseFirstByCycle[cycleIndex]
              ? postRecoveryDelaySseFirstByCycleMs[cycleIndex]
              : postRecoveryDelayWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(() => resolve(), postRecoveryDelayByCycle % 4);
          });
          await new Promise<void>((resolve) => {
            const postCloseRecoverySettleJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseRecoverySettleJitterSseFirstByCycleMs[cycleIndex]
              : postCloseRecoverySettleJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseRecoverySettleJitterByCycle + cycleSessionIndex + cycleIndex + 1) % 4
            );
          });
          if (cycleSessionIndex < cycleSessionIds.length - 1) {
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCooldownJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCooldownJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCooldownJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCooldownJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postCloseCycleHandoffJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postCloseCycleHandoffJitterSseFirstByCycleMs[cycleIndex]
                : postCloseCycleHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postCloseCycleHandoffJitterByCycle + cycleSessionIndex + cycleIndex + 2) % 4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryDriftJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryDriftJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryDriftJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryDriftJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTransitionJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryTransitionJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTransitionJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTransitionJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCheckpointJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCheckpointJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCheckpointJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCheckpointJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFinalizeJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryFinalizeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFinalizeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFinalizeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryAnchorJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryAnchorJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryAnchorJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryAnchorJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySealJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoverySealJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySealJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySealJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGuardJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryGuardJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGuardJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGuardJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLockJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryLockJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLockJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLockJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBoltJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryBoltJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBoltJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBoltJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryClampJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryClampJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryClampJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryClampJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBraceJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryBraceJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBraceJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBraceJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLatchJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryLatchJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLatchJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLatchJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRivetJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryRivetJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRivetJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRivetJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPinJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPinJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPinJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPinJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryStudJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryStudJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryStudJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryStudJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySpikeJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoverySpikeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySpikeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySpikeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryNotchJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryNotchJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryNotchJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryNotchJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGrooveJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryGrooveJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGrooveJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGrooveJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRidgeJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryRidgeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRidgeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRidgeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCrestJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryCrestJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCrestJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCrestJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPeakJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPeakJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPeakJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPeakJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySummitJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoverySummitJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySummitJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySummitJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryApexJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryApexJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryApexJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryApexJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCrownJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryCrownJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCrownJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCrownJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTiaraJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryTiaraJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTiaraJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTiaraJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryDiademJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryDiademJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryDiademJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryDiademJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  1) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCoronetJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCoronetJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCoronetJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCoronetJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCircletJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCircletJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCircletJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCircletJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBandJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryBandJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBandJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBandJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBangleJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBangleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBangleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBangleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBraceletJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBraceletJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBraceletJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBraceletJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryAnkletJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryAnkletJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryAnkletJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryAnkletJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryToeRingJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryToeRingJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryToeRingJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryToeRingJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCharmJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryCharmJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCharmJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCharmJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPendantJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPendantJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPendantJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPendantJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLocketJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryLocketJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLocketJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLocketJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryMedallionJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryMedallionJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryMedallionJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryMedallionJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryAmuletJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryAmuletJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryAmuletJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryAmuletJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTalismanJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryTalismanJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTalismanJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTalismanJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTotemJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryTotemJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTotemJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTotemJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRelicJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryRelicJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRelicJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRelicJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySigilJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoverySigilJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySigilJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySigilJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGlyphJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryGlyphJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGlyphJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGlyphJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRuneJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryRuneJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRuneJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRuneJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryInsigniaJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryInsigniaJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryInsigniaJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryInsigniaJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryEmblemJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryEmblemJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryEmblemJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryEmblemJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBadgeJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryBadgeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBadgeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBadgeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBannerJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBannerJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBannerJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBannerJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryStandardJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryStandardJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryStandardJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryStandardJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFlagJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryFlagJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFlagJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFlagJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPennantJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPennantJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPennantJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPennantJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryChapeauJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryChapeauJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryChapeauJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryChapeauJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBanneretJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBanneretJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBanneretJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBanneretJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBaucanJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBaucanJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBaucanJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBaucanJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGonfanonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryGonfanonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGonfanonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGonfanonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRibbandJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryRibbandJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRibbandJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRibbandJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPencelJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPencelJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPencelJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPencelJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRibbonetJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryRibbonetJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRibbonetJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRibbonetJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTasselJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryTasselJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTasselJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTasselJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryInescutcheonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryInescutcheonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryInescutcheonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryInescutcheonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryEscarbuncleJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryEscarbuncleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryEscarbuncleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryEscarbuncleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRoundelJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryRoundelJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRoundelJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRoundelJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBilletteJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBilletteJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBilletteJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBilletteJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLozengeJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryLozengeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLozengeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLozengeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFusilJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryFusilJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFusilJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFusilJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryMascleJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryMascleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryMascleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryMascleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryRustreJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryRustreJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryRustreJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryRustreJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryAnnuletJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryAnnuletJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryAnnuletJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryAnnuletJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTorteauJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryTorteauJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTorteauJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTorteauJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBezantJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBezantJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBezantJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBezantJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPlateJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPlateJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPlateJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPlateJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPelletJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPelletJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPelletJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPelletJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryHurtJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryHurtJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryHurtJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryHurtJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPommeJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPommeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPommeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPommeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGolpeJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryGolpeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGolpeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGolpeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryOgressJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryOgressJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryOgressJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryOgressJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFountainJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryFountainJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFountainJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFountainJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGurgesJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryGurgesJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGurgesJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGurgesJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBarryJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryBarryJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBarryJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBarryJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBendJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryBendJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBendJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBendJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFlaunchesJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryFlaunchesJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFlaunchesJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFlaunchesJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPaleJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPaleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPaleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPaleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFessJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryFessJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFessJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFessJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryChevronJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryChevronJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryChevronJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryChevronJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryChiefJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryChiefJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryChiefJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryChiefJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPallJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPallJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPallJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPallJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySaltireJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoverySaltireJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySaltireJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySaltireJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPileJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryPileJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPileJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPileJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCrossJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryCrossJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCrossJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCrossJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFretJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryFretJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFretJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFretJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGyronJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryGyronJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGyronJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGyronJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryOrleJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryOrleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryOrleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryOrleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTressureJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryTressureJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTressureJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTressureJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTrefoilJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryTrefoilJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTrefoilJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTrefoilJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLabelJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryLabelJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLabelJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLabelJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryMottoJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryMottoJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryMottoJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryMottoJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySupporterJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoverySupporterJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySupporterJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySupporterJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCompartmentJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCompartmentJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCompartmentJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCompartmentJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryTorseJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryTorseJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryTorseJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryTorseJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCaparisonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCaparisonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCaparisonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCaparisonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPavilionJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPavilionJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPavilionJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPavilionJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLiveryJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryLiveryJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLiveryJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLiveryJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryEscutcheonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryEscutcheonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryEscutcheonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryEscutcheonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryMantlingJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryMantlingJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryMantlingJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryMantlingJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryHelmJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryHelmJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryHelmJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryHelmJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCartoucheJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCartoucheJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCartoucheJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCartoucheJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryVamplateJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryVamplateJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryVamplateJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryVamplateJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBurgeeJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBurgeeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBurgeeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBurgeeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryStreamerJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryStreamerJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryStreamerJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryStreamerJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPennonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPennonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPennonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPennonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryEnsignJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryEnsignJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryEnsignJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryEnsignJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGonfalonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryGonfalonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGonfalonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGonfalonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryOriflammeJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryOriflammeJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryOriflammeJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryOriflammeJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryVexillumJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryVexillumJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryVexillumJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryVexillumJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryLabarumJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryLabarumJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryLabarumJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryLabarumJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryDracoJitterByCycle = openSseFirstByCycle[cycleIndex]
                ? postClosePromptBurstRecoveryDracoJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryDracoJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryDracoJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoverySignumJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoverySignumJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoverySignumJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoverySignumJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryVexiloidJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryVexiloidJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryVexiloidJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryVexiloidJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryBanderoleJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryBanderoleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryBanderoleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryBanderoleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryPennoncelleJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryPennoncelleJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryPennoncelleJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryPennoncelleJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryStreameretJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryStreameretJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryStreameretJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryStreameretJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGuidonetJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryGuidonetJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGuidonetJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGuidonetJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryCornetteJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryCornetteJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryCornetteJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryCornetteJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryFanionJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryFanionJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryFanionJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryFanionJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  3) %
                  4
              );
            });
            await new Promise<void>((resolve) => {
              const postClosePromptBurstRecoveryGuidonJitterByCycle = openSseFirstByCycle[
                cycleIndex
              ]
                ? postClosePromptBurstRecoveryGuidonJitterSseFirstByCycleMs[cycleIndex]
                : postClosePromptBurstRecoveryGuidonJitterWebsocketFirstByCycleMs[cycleIndex];
              setTimeout(
                () => resolve(),
                (postClosePromptBurstRecoveryGuidonJitterByCycle +
                  cycleSessionIndex +
                  cycleIndex +
                  2) %
                  4
              );
            });
          }
        }

        await new Promise<void>((resolve) => {
          const cycleCooldownByCycle = openSseFirstByCycle[cycleIndex]
            ? cycleCooldownSseFirstByCycleMs[cycleIndex]
            : cycleCooldownWebsocketFirstByCycleMs[cycleIndex];
          setTimeout(() => resolve(), (cycleCooldownByCycle + cycleIndex + 1) % 3);
        });
        if (cycleIndex < createCountByCycle.length - 1) {
          await new Promise<void>((resolve) => {
            const postCloseCycleCooldownHandoffJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseCycleCooldownHandoffJitterSseFirstByCycleMs[cycleIndex]
              : postCloseCycleCooldownHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseCycleCooldownHandoffJitterByCycle + cycleIndex + 2) % 4
            );
          });
        }
        await new Promise<void>((resolve) => {
          const postCloseCycleTransitionJitterByCycle = openSseFirstByCycle[cycleIndex]
            ? postCloseCycleTransitionJitterSseFirstByCycleMs[cycleIndex]
            : postCloseCycleTransitionJitterWebsocketFirstByCycleMs[cycleIndex];
          setTimeout(() => resolve(), (postCloseCycleTransitionJitterByCycle + cycleIndex) % 4);
        });
        if (cycleIndex < createCountByCycle.length - 1) {
          await new Promise<void>((resolve) => {
            const postCloseCycleTransitionHandoffJitterByCycle = openSseFirstByCycle[cycleIndex]
              ? postCloseCycleTransitionHandoffJitterSseFirstByCycleMs[cycleIndex]
              : postCloseCycleTransitionHandoffJitterWebsocketFirstByCycleMs[cycleIndex];
            setTimeout(
              () => resolve(),
              (postCloseCycleTransitionHandoffJitterByCycle + cycleIndex + 1) % 4
            );
          });
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
      const jitterMatrix = createReconnectJitterMatrix({
        openOrderByCycleMs: [0, 1, 2],
        createByCycleMs: [2, 0, 1],
        invalidPromptBurstByCycle: [1, 2, 1],
      });
      const openOrderJitterByCycleMs = jitterMatrix.openOrderByCycleMs;
      const createJitterByCycleMs = jitterMatrix.createByCycleMs;
      const invalidPromptBurstByCycle = jitterMatrix.invalidPromptBurstByCycle;
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
          await delayWithModulo(openOrderJitterByCycleMs[cycleIndex] + websocketSegmentIndex, 3);
          activeSocket = new WebSocket(`ws://${host}:${port}`);
          await waitForOpen(activeSocket);
          websocketSegmentRemaining = expectedCount;
          websocketSegmentSessionIds = [];
          websocketSegmentPromise = collectSessionCreatedEvents(activeSocket, expectedCount);
        };

        const openNextSseSegment = async (): Promise<void> => {
          sseSegmentExpectedCount = sseSegmentSizes[sseSegmentIndex];
          sseSegmentIndex += 1;
          await delayWithModulo(openOrderJitterByCycleMs[cycleIndex] + sseSegmentIndex + 1, 3);
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

          await delayWithModulo(
            createJitterByCycleMs[cycleIndex] + cycleCreateIndex + createRequestIndex,
            3
          );

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

  it("rejects compressed json payloads with invalid-request errors", async () => {
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const createResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
        },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(createResponse.status).toBe(400);
      await expect(createResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });

      const baselineSessionResponse = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harnessId: HARNESS_DEFAULT.MOCK_ID }),
      });
      expect(baselineSessionResponse.status).toBe(200);
      const baselineSessionPayload = createSessionResponseSchema.parse(
        await baselineSessionResponse.json()
      );

      const promptResponse = await fetch(
        `${baseUrl}/sessions/${baselineSessionPayload.sessionId}/prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
          },
          body: JSON.stringify({ prompt: "hello" }),
        }
      );
      expect(promptResponse.status).toBe(400);
      await expect(promptResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      });

      const apiResponse = await fetch(`${baseUrl}/api/tui/execute-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
        },
        body: JSON.stringify({ command: "echo hi" }),
      });
      expect(apiResponse.status).toBe(400);
      await expect(apiResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
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

      const trailingConfigResponse = await fetch(`${baseUrl}/api/config/`, {
        method: "POST",
      });
      expect(trailingConfigResponse.status).toBe(405);
      await expect(trailingConfigResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const configResponseWithQuery = await fetch(`${baseUrl}/api/config?scope=all`, {
        method: "POST",
      });
      expect(configResponseWithQuery.status).toBe(405);
      await expect(configResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const configResponseWithHash = await fetch(`${baseUrl}/api/config#summary`, {
        method: "POST",
      });
      expect(configResponseWithHash.status).toBe(405);
      await expect(configResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingConfigResponseWithQuery = await fetch(`${baseUrl}/api/config/?scope=all`, {
        method: "POST",
      });
      expect(trailingConfigResponseWithQuery.status).toBe(405);
      await expect(trailingConfigResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingConfigResponseWithHash = await fetch(`${baseUrl}/api/config/#summary`, {
        method: "POST",
      });
      expect(trailingConfigResponseWithHash.status).toBe(405);
      await expect(trailingConfigResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const executeResponse = await fetch(`${baseUrl}/api/tui/execute-command`);
      expect(executeResponse.status).toBe(405);
      await expect(executeResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingExecuteResponse = await fetch(`${baseUrl}/api/tui/execute-command/`);
      expect(trailingExecuteResponse.status).toBe(405);
      await expect(trailingExecuteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const executeResponseWithQuery = await fetch(`${baseUrl}/api/tui/execute-command?scope=all`);
      expect(executeResponseWithQuery.status).toBe(405);
      await expect(executeResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const executeResponseWithHash = await fetch(`${baseUrl}/api/tui/execute-command#summary`);
      expect(executeResponseWithHash.status).toBe(405);
      await expect(executeResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingExecuteResponseWithQuery = await fetch(
        `${baseUrl}/api/tui/execute-command/?scope=all`
      );
      expect(trailingExecuteResponseWithQuery.status).toBe(405);
      await expect(trailingExecuteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingExecuteResponseWithHash = await fetch(
        `${baseUrl}/api/tui/execute-command/#summary`
      );
      expect(trailingExecuteResponseWithHash.status).toBe(405);
      await expect(trailingExecuteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionRouteResponse = await fetch(`${baseUrl}/api/sessions/session-1`, {
        method: "POST",
      });
      expect(sessionRouteResponse.status).toBe(405);
      await expect(sessionRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionRouteResponse = await fetch(`${baseUrl}/api/sessions/session-1/`, {
        method: "POST",
      });
      expect(trailingSessionRouteResponse.status).toBe(405);
      await expect(trailingSessionRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1?scope=all`,
        {
          method: "POST",
        }
      );
      expect(sessionRouteResponseWithQuery.status).toBe(405);
      await expect(sessionRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1#summary`,
        {
          method: "POST",
        }
      );
      expect(sessionRouteResponseWithHash.status).toBe(405);
      await expect(sessionRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(trailingSessionRouteResponseWithQuery.status).toBe(405);
      await expect(trailingSessionRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/#summary`,
        {
          method: "POST",
        }
      );
      expect(trailingSessionRouteResponseWithHash.status).toBe(405);
      await expect(trailingSessionRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionMessagesRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/messages`,
        {
          method: "POST",
        }
      );
      expect(sessionMessagesRouteResponse.status).toBe(405);
      await expect(sessionMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionMessagesRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/`,
        {
          method: "POST",
        }
      );
      expect(trailingSessionMessagesRouteResponse.status).toBe(405);
      await expect(trailingSessionMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/messages?scope=all`,
        {
          method: "POST",
        }
      );
      expect(sessionMessagesRouteResponseWithQuery.status).toBe(405);
      await expect(sessionMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/messages#summary`,
        {
          method: "POST",
        }
      );
      expect(sessionMessagesRouteResponseWithHash.status).toBe(405);
      await expect(sessionMessagesRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(trailingSessionMessagesRouteResponseWithQuery.status).toBe(405);
      await expect(trailingSessionMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/#summary`,
        {
          method: "POST",
        }
      );
      expect(trailingSessionMessagesRouteResponseWithHash.status).toBe(405);
      await expect(trailingSessionMessagesRouteResponseWithHash.json()).resolves.toEqual({
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

      const healthResponseWithQuery = await fetch(`${baseUrl}/health?probe=1`, {
        method: "POST",
      });
      expect(healthResponseWithQuery.status).toBe(405);
      await expect(healthResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const healthResponseWithHash = await fetch(`${baseUrl}/health#summary`, {
        method: "POST",
      });
      expect(healthResponseWithHash.status).toBe(405);
      await expect(healthResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingHealthResponseWithQuery = await fetch(`${baseUrl}/health/?probe=1`, {
        method: "POST",
      });
      expect(trailingHealthResponseWithQuery.status).toBe(405);
      await expect(trailingHealthResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingHealthResponseWithHash = await fetch(`${baseUrl}/health/#summary`, {
        method: "POST",
      });
      expect(trailingHealthResponseWithHash.status).toBe(405);
      await expect(trailingHealthResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionsResponse = await fetch(`${baseUrl}/sessions`);
      expect(sessionsResponse.status).toBe(405);
      await expect(sessionsResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionsResponse = await fetch(`${baseUrl}/sessions/`);
      expect(trailingSessionsResponse.status).toBe(405);
      await expect(trailingSessionsResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionsResponseWithQuery = await fetch(`${baseUrl}/sessions?scope=all`);
      expect(sessionsResponseWithQuery.status).toBe(405);
      await expect(sessionsResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const sessionsResponseWithHash = await fetch(`${baseUrl}/sessions#summary`);
      expect(sessionsResponseWithHash.status).toBe(405);
      await expect(sessionsResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionsResponseWithQuery = await fetch(`${baseUrl}/sessions/?scope=all`);
      expect(trailingSessionsResponseWithQuery.status).toBe(405);
      await expect(trailingSessionsResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingSessionsResponseWithHash = await fetch(`${baseUrl}/sessions/#summary`);
      expect(trailingSessionsResponseWithHash.status).toBe(405);
      await expect(trailingSessionsResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const promptResponse = await fetch(`${baseUrl}/sessions/session-1/prompt`);
      expect(promptResponse.status).toBe(405);
      await expect(promptResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingPromptResponse = await fetch(`${baseUrl}/sessions/session-1/prompt/`);
      expect(trailingPromptResponse.status).toBe(405);
      await expect(trailingPromptResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const promptResponseWithQuery = await fetch(`${baseUrl}/sessions/session-1/prompt?scope=all`);
      expect(promptResponseWithQuery.status).toBe(405);
      await expect(promptResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const promptResponseWithHash = await fetch(`${baseUrl}/sessions/session-1/prompt#summary`);
      expect(promptResponseWithHash.status).toBe(405);
      await expect(promptResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingPromptResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/prompt/?scope=all`
      );
      expect(trailingPromptResponseWithQuery.status).toBe(405);
      await expect(trailingPromptResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingPromptResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/prompt/#summary`
      );
      expect(trailingPromptResponseWithHash.status).toBe(405);
      await expect(trailingPromptResponseWithHash.json()).resolves.toEqual({
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

      const trailingMessagesResponse = await fetch(`${baseUrl}/sessions/session-1/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "ignored" }),
      });
      expect(trailingMessagesResponse.status).toBe(405);
      await expect(trailingMessagesResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const messagesResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/messages?scope=all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(messagesResponseWithQuery.status).toBe(405);
      await expect(messagesResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const messagesResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/messages#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(messagesResponseWithHash.status).toBe(405);
      await expect(messagesResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingMessagesResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/messages/?scope=all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(trailingMessagesResponseWithQuery.status).toBe(405);
      await expect(trailingMessagesResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const trailingMessagesResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/messages/#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(trailingMessagesResponseWithHash.status).toBe(405);
      await expect(trailingMessagesResponseWithHash.json()).resolves.toEqual({
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

      const unauthenticatedTrailingResponse = await fetch(`${baseUrl}/api/config/`, {
        method: "POST",
      });
      expect(unauthenticatedTrailingResponse.status).toBe(401);
      expect(unauthenticatedTrailingResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedTrailingResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedResponseWithQuery = await fetch(`${baseUrl}/api/config?scope=all`, {
        method: "POST",
      });
      expect(unauthenticatedResponseWithQuery.status).toBe(401);
      expect(unauthenticatedResponseWithQuery.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedResponseWithHash = await fetch(`${baseUrl}/api/config#summary`, {
        method: "POST",
      });
      expect(unauthenticatedResponseWithHash.status).toBe(401);
      expect(unauthenticatedResponseWithHash.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingResponseWithQuery = await fetch(
        `${baseUrl}/api/config/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingResponseWithQuery.status).toBe(401);
      expect(unauthenticatedTrailingResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingResponseWithHash = await fetch(
        `${baseUrl}/api/config/#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingResponseWithHash.status).toBe(401);
      expect(unauthenticatedTrailingResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedExecuteRouteResponse = await fetch(`${baseUrl}/api/tui/execute-command`);
      expect(unauthenticatedExecuteRouteResponse.status).toBe(401);
      expect(unauthenticatedExecuteRouteResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedExecuteRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingExecuteRouteResponse = await fetch(
        `${baseUrl}/api/tui/execute-command/`
      );
      expect(unauthenticatedTrailingExecuteRouteResponse.status).toBe(401);
      expect(unauthenticatedTrailingExecuteRouteResponse.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingExecuteRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedExecuteRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/tui/execute-command?scope=all`
      );
      expect(unauthenticatedExecuteRouteResponseWithQuery.status).toBe(401);
      expect(unauthenticatedExecuteRouteResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedExecuteRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedExecuteRouteResponseWithHash = await fetch(
        `${baseUrl}/api/tui/execute-command#summary`
      );
      expect(unauthenticatedExecuteRouteResponseWithHash.status).toBe(401);
      expect(unauthenticatedExecuteRouteResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedExecuteRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingExecuteRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/tui/execute-command/?scope=all`
      );
      expect(unauthenticatedTrailingExecuteRouteResponseWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingExecuteRouteResponseWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingExecuteRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingExecuteRouteResponseWithHash = await fetch(
        `${baseUrl}/api/tui/execute-command/#summary`
      );
      expect(unauthenticatedTrailingExecuteRouteResponseWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingExecuteRouteResponseWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingExecuteRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionRouteResponse = await fetch(`${baseUrl}/api/sessions/session-1`, {
        method: "POST",
      });
      expect(unauthenticatedSessionRouteResponse.status).toBe(401);
      expect(unauthenticatedSessionRouteResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingSessionRouteResponse.status).toBe(401);
      expect(unauthenticatedTrailingSessionRouteResponse.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedSessionRouteResponseWithQuery.status).toBe(401);
      expect(unauthenticatedSessionRouteResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedSessionRouteResponseWithHash.status).toBe(401);
      expect(unauthenticatedSessionRouteResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingSessionRouteResponseWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionRouteResponseWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingSessionRouteResponseWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionRouteResponseWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMessagesRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMessagesRouteResponse.status).toBe(401);
      expect(unauthenticatedMessagesRouteResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedNonTrailingMessagesRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/messages`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedNonTrailingMessagesRouteResponse.status).toBe(401);
      expect(unauthenticatedNonTrailingMessagesRouteResponse.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedNonTrailingMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/messages?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMessagesRouteResponseWithQuery.status).toBe(401);
      expect(unauthenticatedMessagesRouteResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/messages#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMessagesRouteResponseWithHash.status).toBe(401);
      expect(unauthenticatedMessagesRouteResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMessagesRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMessagesRouteResponseWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingMessagesRouteResponseWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMessagesRouteResponseWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingMessagesRouteResponseWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMessagesRouteResponseWithHash.json()).resolves.toEqual({
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

      const authenticatedTrailingResponse = await fetch(`${baseUrl}/api/config/`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingResponse.status).toBe(405);
      await expect(authenticatedTrailingResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedResponseWithQuery = await fetch(`${baseUrl}/api/config?scope=all`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedResponseWithQuery.status).toBe(405);
      await expect(authenticatedResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedResponseWithHash = await fetch(`${baseUrl}/api/config#summary`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedResponseWithHash.status).toBe(405);
      await expect(authenticatedResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingResponseWithQuery = await fetch(
        `${baseUrl}/api/config/?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingResponseWithHash = await fetch(`${baseUrl}/api/config/#summary`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedExecuteRouteResponse = await fetch(`${baseUrl}/api/tui/execute-command`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedExecuteRouteResponse.status).toBe(405);
      await expect(authenticatedExecuteRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingExecuteRouteResponse = await fetch(
        `${baseUrl}/api/tui/execute-command/`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingExecuteRouteResponse.status).toBe(405);
      await expect(authenticatedTrailingExecuteRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedExecuteRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/tui/execute-command?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedExecuteRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedExecuteRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedExecuteRouteResponseWithHash = await fetch(
        `${baseUrl}/api/tui/execute-command#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedExecuteRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedExecuteRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingExecuteRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/tui/execute-command/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingExecuteRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingExecuteRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingExecuteRouteResponseWithHash = await fetch(
        `${baseUrl}/api/tui/execute-command/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingExecuteRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingExecuteRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedSessionRouteResponse = await fetch(`${baseUrl}/api/sessions/session-1`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedSessionRouteResponse.status).toBe(405);
      await expect(authenticatedSessionRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingSessionRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionRouteResponse.status).toBe(405);
      await expect(authenticatedTrailingSessionRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedSessionRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedSessionRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedSessionRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedSessionRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingSessionRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingSessionRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingSessionRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingSessionRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedMessagesRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMessagesRouteResponse.status).toBe(405);
      await expect(authenticatedMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedNonTrailingMessagesRouteResponse = await fetch(
        `${baseUrl}/api/sessions/session-1/messages`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedNonTrailingMessagesRouteResponse.status).toBe(405);
      await expect(authenticatedNonTrailingMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/messages?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMessagesRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/messages#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMessagesRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedMessagesRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMessagesRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/api/sessions/session-1/messages/#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMessagesRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingMessagesRouteResponseWithHash.json()).resolves.toEqual({
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

      const unauthenticatedTrailingSessionsResponse = await fetch(`${baseUrl}/sessions/`);
      expect(unauthenticatedTrailingSessionsResponse.status).toBe(401);
      expect(unauthenticatedTrailingSessionsResponse.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionsResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionsResponseWithQuery = await fetch(`${baseUrl}/sessions?scope=all`);
      expect(unauthenticatedSessionsResponseWithQuery.status).toBe(401);
      expect(unauthenticatedSessionsResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionsResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionsResponseWithHash = await fetch(`${baseUrl}/sessions#summary`);
      expect(unauthenticatedSessionsResponseWithHash.status).toBe(401);
      expect(unauthenticatedSessionsResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionsResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionsResponseWithQuery = await fetch(
        `${baseUrl}/sessions/?scope=all`
      );
      expect(unauthenticatedTrailingSessionsResponseWithQuery.status).toBe(401);
      expect(unauthenticatedTrailingSessionsResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionsResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionsResponseWithHash = await fetch(
        `${baseUrl}/sessions/#summary`
      );
      expect(unauthenticatedTrailingSessionsResponseWithHash.status).toBe(401);
      expect(unauthenticatedTrailingSessionsResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionsResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedPromptRouteResponse = await fetch(
        `${baseUrl}/sessions/session-1/prompt`
      );
      expect(unauthenticatedPromptRouteResponse.status).toBe(401);
      expect(unauthenticatedPromptRouteResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedPromptRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingPromptRouteResponse = await fetch(
        `${baseUrl}/sessions/session-1/prompt/`
      );
      expect(unauthenticatedTrailingPromptRouteResponse.status).toBe(401);
      expect(unauthenticatedTrailingPromptRouteResponse.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingPromptRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedPromptRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/prompt?scope=all`
      );
      expect(unauthenticatedPromptRouteResponseWithQuery.status).toBe(401);
      expect(unauthenticatedPromptRouteResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedPromptRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedPromptRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/prompt#summary`
      );
      expect(unauthenticatedPromptRouteResponseWithHash.status).toBe(401);
      expect(unauthenticatedPromptRouteResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedPromptRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingPromptRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/prompt/?scope=all`
      );
      expect(unauthenticatedTrailingPromptRouteResponseWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingPromptRouteResponseWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingPromptRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingPromptRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/prompt/#summary`
      );
      expect(unauthenticatedTrailingPromptRouteResponseWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingPromptRouteResponseWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingPromptRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMessagesRouteResponse = await fetch(
        `${baseUrl}/sessions/session-1/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedMessagesRouteResponse.status).toBe(401);
      expect(unauthenticatedMessagesRouteResponse.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMessagesRouteResponse = await fetch(
        `${baseUrl}/sessions/session-1/messages/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedTrailingMessagesRouteResponse.status).toBe(401);
      expect(unauthenticatedTrailingMessagesRouteResponse.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/messages?scope=all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedMessagesRouteResponseWithQuery.status).toBe(401);
      expect(unauthenticatedMessagesRouteResponseWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/messages#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedMessagesRouteResponseWithHash.status).toBe(401);
      expect(unauthenticatedMessagesRouteResponseWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMessagesRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/messages/?scope=all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedTrailingMessagesRouteResponseWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingMessagesRouteResponseWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/messages/#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedTrailingMessagesRouteResponseWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingMessagesRouteResponseWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMessagesRouteResponseWithHash.json()).resolves.toEqual({
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

      const authenticatedTrailingSessionsResponse = await fetch(`${baseUrl}/sessions/`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingSessionsResponse.status).toBe(405);
      await expect(authenticatedTrailingSessionsResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedSessionsResponseWithQuery = await fetch(`${baseUrl}/sessions?scope=all`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedSessionsResponseWithQuery.status).toBe(405);
      await expect(authenticatedSessionsResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedSessionsResponseWithHash = await fetch(`${baseUrl}/sessions#summary`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedSessionsResponseWithHash.status).toBe(405);
      await expect(authenticatedSessionsResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingSessionsResponseWithQuery = await fetch(
        `${baseUrl}/sessions/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionsResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingSessionsResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingSessionsResponseWithHash = await fetch(
        `${baseUrl}/sessions/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionsResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingSessionsResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedPromptRouteResponse = await fetch(
        `${baseUrl}/sessions/session-1/prompt/`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedPromptRouteResponse.status).toBe(405);
      await expect(authenticatedPromptRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedPromptRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/prompt?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedPromptRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedPromptRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedPromptRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/prompt#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedPromptRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedPromptRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingPromptRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/prompt/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingPromptRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingPromptRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingPromptRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/prompt/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingPromptRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingPromptRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedMessagesRouteResponse = await fetch(
        `${baseUrl}/sessions/session-1/messages/`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedMessagesRouteResponse.status).toBe(405);
      await expect(authenticatedMessagesRouteResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/messages?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedMessagesRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/messages#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedMessagesRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedMessagesRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingMessagesRouteResponseWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/messages/?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedTrailingMessagesRouteResponseWithQuery.status).toBe(405);
      await expect(authenticatedTrailingMessagesRouteResponseWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const authenticatedTrailingMessagesRouteResponseWithHash = await fetch(
        `${baseUrl}/sessions/session-1/messages/#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedTrailingMessagesRouteResponseWithHash.status).toBe(405);
      await expect(authenticatedTrailingMessagesRouteResponseWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });
    } finally {
      await server.close();
      delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
      EnvManager.resetInstance();
    }
  });

  it("keeps health-route auth bypass semantics under password protection", async () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const healthOkResponse = await fetch(`${baseUrl}/health`);
      expect(healthOkResponse.status).toBe(200);
      await expect(healthOkResponse.json()).resolves.toEqual({ status: "ok" });

      const healthTrailingSlashResponse = await fetch(`${baseUrl}/health/`);
      expect(healthTrailingSlashResponse.status).toBe(200);
      await expect(healthTrailingSlashResponse.json()).resolves.toEqual({ status: "ok" });

      const healthQueryResponse = await fetch(`${baseUrl}/health?probe=1`);
      expect(healthQueryResponse.status).toBe(200);
      await expect(healthQueryResponse.json()).resolves.toEqual({ status: "ok" });

      const healthHashResponse = await fetch(`${baseUrl}/health#summary`);
      expect(healthHashResponse.status).toBe(200);
      await expect(healthHashResponse.json()).resolves.toEqual({ status: "ok" });

      const healthTrailingSlashQueryResponse = await fetch(`${baseUrl}/health/?probe=1`);
      expect(healthTrailingSlashQueryResponse.status).toBe(200);
      await expect(healthTrailingSlashQueryResponse.json()).resolves.toEqual({ status: "ok" });

      const healthTrailingSlashHashResponse = await fetch(`${baseUrl}/health/#summary`);
      expect(healthTrailingSlashHashResponse.status).toBe(200);
      await expect(healthTrailingSlashHashResponse.json()).resolves.toEqual({ status: "ok" });

      const unsupportedMethodResponse = await fetch(`${baseUrl}/health`, {
        method: "POST",
      });
      expect(unsupportedMethodResponse.status).toBe(405);
      expect(unsupportedMethodResponse.headers.get("www-authenticate")).toBeNull();
      await expect(unsupportedMethodResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const unsupportedTrailingSlashResponse = await fetch(`${baseUrl}/health/`, {
        method: "POST",
      });
      expect(unsupportedTrailingSlashResponse.status).toBe(405);
      expect(unsupportedTrailingSlashResponse.headers.get("www-authenticate")).toBeNull();
      await expect(unsupportedTrailingSlashResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const unsupportedMethodQueryResponse = await fetch(`${baseUrl}/health?probe=1`, {
        method: "POST",
      });
      expect(unsupportedMethodQueryResponse.status).toBe(405);
      expect(unsupportedMethodQueryResponse.headers.get("www-authenticate")).toBeNull();
      await expect(unsupportedMethodQueryResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const unsupportedMethodHashResponse = await fetch(`${baseUrl}/health#summary`, {
        method: "POST",
      });
      expect(unsupportedMethodHashResponse.status).toBe(405);
      expect(unsupportedMethodHashResponse.headers.get("www-authenticate")).toBeNull();
      await expect(unsupportedMethodHashResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const unsupportedTrailingSlashQueryResponse = await fetch(`${baseUrl}/health/?probe=1`, {
        method: "POST",
      });
      expect(unsupportedTrailingSlashQueryResponse.status).toBe(405);
      expect(unsupportedTrailingSlashQueryResponse.headers.get("www-authenticate")).toBeNull();
      await expect(unsupportedTrailingSlashQueryResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });

      const unsupportedTrailingSlashHashResponse = await fetch(`${baseUrl}/health/#summary`, {
        method: "POST",
      });
      expect(unsupportedTrailingSlashHashResponse.status).toBe(405);
      expect(unsupportedTrailingSlashHashResponse.headers.get("www-authenticate")).toBeNull();
      await expect(unsupportedTrailingSlashHashResponse.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED,
      });
    } finally {
      await server.close();
      delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
      EnvManager.resetInstance();
    }
  });

  it("applies auth checks before not-found semantics on unknown routes", async () => {
    process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD] = "secret";
    EnvManager.resetInstance();
    const server = await startHeadlessServer({ host: "127.0.0.1", port: 0 });
    const { host, port } = server.address();
    const baseUrl = `http://${host}:${port}`;

    try {
      const unauthenticatedApiUnknown = await fetch(`${baseUrl}/api`);
      expect(unauthenticatedApiUnknown.status).toBe(401);
      expect(unauthenticatedApiUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedApiUnknownWithQuery = await fetch(`${baseUrl}/api?scope=all`);
      expect(unauthenticatedApiUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedApiUnknownWithQuery.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedApiUnknownWithHash = await fetch(`${baseUrl}/api#summary`);
      expect(unauthenticatedApiUnknownWithHash.status).toBe(401);
      expect(unauthenticatedApiUnknownWithHash.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingApiUnknown = await fetch(`${baseUrl}/api/`);
      expect(unauthenticatedTrailingApiUnknown.status).toBe(401);
      expect(unauthenticatedTrailingApiUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedTrailingApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingApiUnknownWithQuery = await fetch(`${baseUrl}/api/?scope=all`);
      expect(unauthenticatedTrailingApiUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedTrailingApiUnknownWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingApiUnknownWithHash = await fetch(`${baseUrl}/api/#summary`);
      expect(unauthenticatedTrailingApiUnknownWithHash.status).toBe(401);
      expect(unauthenticatedTrailingApiUnknownWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingApiUnknown = await fetch(`${baseUrl}/api//`);
      expect(unauthenticatedDoubleTrailingApiUnknown.status).toBe(401);
      expect(unauthenticatedDoubleTrailingApiUnknown.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingApiUnknownWithQuery = await fetch(
        `${baseUrl}/api//?scope=all`
      );
      expect(unauthenticatedDoubleTrailingApiUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedDoubleTrailingApiUnknownWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingApiUnknownWithHash = await fetch(
        `${baseUrl}/api//#summary`
      );
      expect(unauthenticatedDoubleTrailingApiUnknownWithHash.status).toBe(401);
      expect(unauthenticatedDoubleTrailingApiUnknownWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedRootUnknown = await fetch(`${baseUrl}/`);
      expect(unauthenticatedRootUnknown.status).toBe(401);
      expect(unauthenticatedRootUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedRootUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedRootUnknownWithQuery = await fetch(`${baseUrl}/?scope=all`);
      expect(unauthenticatedRootUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedRootUnknownWithQuery.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedRootUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedRootUnknownWithHash = await fetch(`${baseUrl}/#summary`);
      expect(unauthenticatedRootUnknownWithHash.status).toBe(401);
      expect(unauthenticatedRootUnknownWithHash.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedRootUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedCoreUnknown = await fetch(`${baseUrl}/unknown-endpoint`);
      expect(unauthenticatedCoreUnknown.status).toBe(401);
      expect(unauthenticatedCoreUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedCoreUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingCoreUnknown = await fetch(`${baseUrl}/unknown-endpoint/`);
      expect(unauthenticatedTrailingCoreUnknown.status).toBe(401);
      expect(unauthenticatedTrailingCoreUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedTrailingCoreUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedCoreUnknownDirectQuery = await fetch(
        `${baseUrl}/unknown-endpoint?scope=all`
      );
      expect(unauthenticatedCoreUnknownDirectQuery.status).toBe(401);
      expect(unauthenticatedCoreUnknownDirectQuery.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedCoreUnknownDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingCoreUnknownWithQuery = await fetch(
        `${baseUrl}/unknown-endpoint/?scope=all`
      );
      expect(unauthenticatedTrailingCoreUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedTrailingCoreUnknownWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingCoreUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedCoreUnknownWithHash = await fetch(`${baseUrl}/unknown-endpoint#summary`);
      expect(unauthenticatedCoreUnknownWithHash.status).toBe(401);
      expect(unauthenticatedCoreUnknownWithHash.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedCoreUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingCoreUnknownWithHash = await fetch(
        `${baseUrl}/unknown-endpoint/#summary`
      );
      expect(unauthenticatedTrailingCoreUnknownWithHash.status).toBe(401);
      expect(unauthenticatedTrailingCoreUnknownWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingCoreUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingCoreUnknown = await fetch(`${baseUrl}/unknown-endpoint//`);
      expect(unauthenticatedDoubleTrailingCoreUnknown.status).toBe(401);
      expect(unauthenticatedDoubleTrailingCoreUnknown.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingCoreUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingCoreUnknownWithQuery = await fetch(
        `${baseUrl}/unknown-endpoint//?scope=all`
      );
      expect(unauthenticatedDoubleTrailingCoreUnknownWithQuery.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingCoreUnknownWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedDoubleTrailingCoreUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingCoreUnknownWithHash = await fetch(
        `${baseUrl}/unknown-endpoint//#summary`
      );
      expect(unauthenticatedDoubleTrailingCoreUnknownWithHash.status).toBe(401);
      expect(unauthenticatedDoubleTrailingCoreUnknownWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingCoreUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiUnknown = await fetch(`${baseUrl}/api//config`, {
        method: "POST",
      });
      expect(unauthenticatedMalformedApiUnknown.status).toBe(401);
      expect(unauthenticatedMalformedApiUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedMalformedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiUnknownGet = await fetch(`${baseUrl}/api//config`);
      expect(unauthenticatedMalformedApiUnknownGet.status).toBe(401);
      expect(unauthenticatedMalformedApiUnknownGet.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedMalformedApiUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiUnknown = await fetch(`${baseUrl}/api//config/`, {
        method: "POST",
      });
      expect(unauthenticatedTrailingMalformedApiUnknown.status).toBe(401);
      expect(unauthenticatedTrailingMalformedApiUnknown.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingMalformedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiUnknownGet = await fetch(`${baseUrl}/api//config/`);
      expect(unauthenticatedTrailingMalformedApiUnknownGet.status).toBe(401);
      expect(unauthenticatedTrailingMalformedApiUnknownGet.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingMalformedApiUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiUnknownDirectQuery = await fetch(
        `${baseUrl}/api//config?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMalformedApiUnknownDirectQuery.status).toBe(401);
      expect(unauthenticatedMalformedApiUnknownDirectQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMalformedApiUnknownDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiUnknownDirectQueryGet = await fetch(
        `${baseUrl}/api//config?scope=all`
      );
      expect(unauthenticatedMalformedApiUnknownDirectQueryGet.status).toBe(401);
      expect(unauthenticatedMalformedApiUnknownDirectQueryGet.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMalformedApiUnknownDirectQueryGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiUnknownWithQuery = await fetch(
        `${baseUrl}/api//config/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMalformedApiUnknownWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiUnknownWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMalformedApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiUnknownWithQueryGet = await fetch(
        `${baseUrl}/api//config/?scope=all`
      );
      expect(unauthenticatedTrailingMalformedApiUnknownWithQueryGet.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiUnknownWithQueryGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMalformedApiUnknownWithQueryGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiUnknownWithHash = await fetch(
        `${baseUrl}/api//config#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMalformedApiUnknownWithHash.status).toBe(401);
      expect(unauthenticatedMalformedApiUnknownWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMalformedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiUnknownWithHashGet = await fetch(
        `${baseUrl}/api//config#summary`
      );
      expect(unauthenticatedMalformedApiUnknownWithHashGet.status).toBe(401);
      expect(unauthenticatedMalformedApiUnknownWithHashGet.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMalformedApiUnknownWithHashGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiUnknownWithHash = await fetch(
        `${baseUrl}/api//config/#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMalformedApiUnknownWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiUnknownWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMalformedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiUnknownWithHashGet = await fetch(
        `${baseUrl}/api//config/#summary`
      );
      expect(unauthenticatedTrailingMalformedApiUnknownWithHashGet.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiUnknownWithHashGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMalformedApiUnknownWithHashGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiUnknown = await fetch(
        `${baseUrl}/api//config//`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedDoubleTrailingMalformedApiUnknown.status).toBe(401);
      expect(unauthenticatedDoubleTrailingMalformedApiUnknown.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingMalformedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiUnknownWithQuery = await fetch(
        `${baseUrl}/api//config//?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedDoubleTrailingMalformedApiUnknownWithQuery.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiUnknownWithQueryGet = await fetch(
        `${baseUrl}/api//config//?scope=all`
      );
      expect(unauthenticatedDoubleTrailingMalformedApiUnknownWithQueryGet.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithQueryGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithQueryGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiUnknownWithHash = await fetch(
        `${baseUrl}/api//config//#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedDoubleTrailingMalformedApiUnknownWithHash.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithHash.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiUnknownWithHashGet = await fetch(
        `${baseUrl}/api//config//#summary`
      );
      expect(unauthenticatedDoubleTrailingMalformedApiUnknownWithHashGet.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithHashGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiUnknownWithHashGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiSessionUnknown = await fetch(
        `${baseUrl}/api/sessions//messages`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMalformedApiSessionUnknown.status).toBe(401);
      expect(unauthenticatedMalformedApiSessionUnknown.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMalformedApiSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiSessionUnknownGet = await fetch(
        `${baseUrl}/api/sessions//messages`
      );
      expect(unauthenticatedMalformedApiSessionUnknownGet.status).toBe(401);
      expect(unauthenticatedMalformedApiSessionUnknownGet.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedMalformedApiSessionUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiSessionUnknown = await fetch(
        `${baseUrl}/api/sessions//messages/`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMalformedApiSessionUnknown.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiSessionUnknown.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMalformedApiSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiSessionUnknownGet = await fetch(
        `${baseUrl}/api/sessions//messages/`
      );
      expect(unauthenticatedTrailingMalformedApiSessionUnknownGet.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiSessionUnknownGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingMalformedApiSessionUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiSessionUnknownDirectQuery = await fetch(
        `${baseUrl}/api/sessions//messages?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMalformedApiSessionUnknownDirectQuery.status).toBe(401);
      expect(
        unauthenticatedMalformedApiSessionUnknownDirectQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedMalformedApiSessionUnknownDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiSessionUnknownDirectQueryGet = await fetch(
        `${baseUrl}/api/sessions//messages?scope=all`
      );
      expect(unauthenticatedMalformedApiSessionUnknownDirectQueryGet.status).toBe(401);
      expect(
        unauthenticatedMalformedApiSessionUnknownDirectQueryGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedMalformedApiSessionUnknownDirectQueryGet.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
        }
      );

      const unauthenticatedTrailingMalformedApiSessionUnknownWithQuery = await fetch(
        `${baseUrl}/api/sessions//messages/?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMalformedApiSessionUnknownWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiSessionUnknownWithQueryGet = await fetch(
        `${baseUrl}/api/sessions//messages/?scope=all`
      );
      expect(unauthenticatedTrailingMalformedApiSessionUnknownWithQueryGet.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithQueryGet.headers.get(
          "www-authenticate"
        )
      ).toBe("Bearer");
      await expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithQueryGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiSessionUnknownWithHash = await fetch(
        `${baseUrl}/api/sessions//messages#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedMalformedApiSessionUnknownWithHash.status).toBe(401);
      expect(
        unauthenticatedMalformedApiSessionUnknownWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedMalformedApiSessionUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedMalformedApiSessionUnknownWithHashGet = await fetch(
        `${baseUrl}/api/sessions//messages#summary`
      );
      expect(unauthenticatedMalformedApiSessionUnknownWithHashGet.status).toBe(401);
      expect(
        unauthenticatedMalformedApiSessionUnknownWithHashGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedMalformedApiSessionUnknownWithHashGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiSessionUnknownWithHash = await fetch(
        `${baseUrl}/api/sessions//messages/#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedTrailingMalformedApiSessionUnknownWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithHash.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingMalformedApiSessionUnknownWithHashGet = await fetch(
        `${baseUrl}/api/sessions//messages/#summary`
      );
      expect(unauthenticatedTrailingMalformedApiSessionUnknownWithHashGet.status).toBe(401);
      expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithHashGet.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedTrailingMalformedApiSessionUnknownWithHashGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiSessionUnknown = await fetch(
        `${baseUrl}/api/sessions//messages//`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedDoubleTrailingMalformedApiSessionUnknown.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknown.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedDoubleTrailingMalformedApiSessionUnknown.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
        }
      );

      const unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery = await fetch(
        `${baseUrl}/api/sessions//messages//?scope=all`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery.headers.get(
          "www-authenticate"
        )
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet = await fetch(
        `${baseUrl}/api/sessions//messages//?scope=all`
      );
      expect(unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet.headers.get(
          "www-authenticate"
        )
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHash = await fetch(
        `${baseUrl}/api/sessions//messages//#summary`,
        {
          method: "POST",
        }
      );
      expect(unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHash.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHash.headers.get(
          "www-authenticate"
        )
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHash.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet = await fetch(
        `${baseUrl}/api/sessions//messages//#summary`
      );
      expect(unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet.headers.get(
          "www-authenticate"
        )
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionUnknown = await fetch(
        `${baseUrl}/sessions/session-1/unsupported`
      );
      expect(unauthenticatedSessionUnknown.status).toBe(401);
      expect(unauthenticatedSessionUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionUnknownWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/unsupported?scope=all`
      );
      expect(unauthenticatedSessionUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedSessionUnknownWithQuery.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionUnknown = await fetch(
        `${baseUrl}/sessions/session-1/unsupported/`
      );
      expect(unauthenticatedTrailingSessionUnknown.status).toBe(401);
      expect(unauthenticatedTrailingSessionUnknown.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionUnknownWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/unsupported/?scope=all`
      );
      expect(unauthenticatedTrailingSessionUnknownWithQuery.status).toBe(401);
      expect(unauthenticatedTrailingSessionUnknownWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionUnknownWithHash = await fetch(
        `${baseUrl}/sessions/session-1/unsupported#summary`
      );
      expect(unauthenticatedSessionUnknownWithHash.status).toBe(401);
      expect(unauthenticatedSessionUnknownWithHash.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionUnknownWithHash = await fetch(
        `${baseUrl}/sessions/session-1/unsupported/#summary`
      );
      expect(unauthenticatedTrailingSessionUnknownWithHash.status).toBe(401);
      expect(unauthenticatedTrailingSessionUnknownWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionMissingAction = await fetch(`${baseUrl}/sessions/session-1`);
      expect(unauthenticatedSessionMissingAction.status).toBe(401);
      expect(unauthenticatedSessionMissingAction.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionMissingAction.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionMissingActionDirectQuery = await fetch(
        `${baseUrl}/sessions/session-1?scope=all`
      );
      expect(unauthenticatedSessionMissingActionDirectQuery.status).toBe(401);
      expect(unauthenticatedSessionMissingActionDirectQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionMissingActionDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionMissingAction = await fetch(
        `${baseUrl}/sessions/session-1/`
      );
      expect(unauthenticatedTrailingSessionMissingAction.status).toBe(401);
      expect(unauthenticatedTrailingSessionMissingAction.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionMissingAction.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionMissingActionWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/?scope=all`
      );
      expect(unauthenticatedTrailingSessionMissingActionWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionMissingActionWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionMissingActionWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionMissingActionWithHash = await fetch(
        `${baseUrl}/sessions/session-1#summary`
      );
      expect(unauthenticatedSessionMissingActionWithHash.status).toBe(401);
      expect(unauthenticatedSessionMissingActionWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionMissingActionWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionMissingActionWithHash = await fetch(
        `${baseUrl}/sessions/session-1/#summary`
      );
      expect(unauthenticatedTrailingSessionMissingActionWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionMissingActionWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionMissingActionWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionMissingAction = await fetch(
        `${baseUrl}/sessions/session-1//`
      );
      expect(unauthenticatedDoubleTrailingSessionMissingAction.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionMissingAction.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedDoubleTrailingSessionMissingAction.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionMissingActionWithQuery = await fetch(
        `${baseUrl}/sessions/session-1//?scope=all`
      );
      expect(unauthenticatedDoubleTrailingSessionMissingActionWithQuery.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionMissingActionWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingSessionMissingActionWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionMissingActionWithHash = await fetch(
        `${baseUrl}/sessions/session-1//#summary`
      );
      expect(unauthenticatedDoubleTrailingSessionMissingActionWithHash.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionMissingActionWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingSessionMissingActionWithHash.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionBlankPrompt = await fetch(`${baseUrl}/sessions//prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "ignored" }),
      });
      expect(unauthenticatedSessionBlankPrompt.status).toBe(401);
      expect(unauthenticatedSessionBlankPrompt.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionBlankPrompt.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionBlankPrompt = await fetch(
        `${baseUrl}/sessions//prompt/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedTrailingSessionBlankPrompt.status).toBe(401);
      expect(unauthenticatedTrailingSessionBlankPrompt.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionBlankPrompt.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionBlankPromptDirectQuery = await fetch(
        `${baseUrl}/sessions//prompt?tail=1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedSessionBlankPromptDirectQuery.status).toBe(401);
      expect(unauthenticatedSessionBlankPromptDirectQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionBlankPromptDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionBlankPromptWithQuery = await fetch(
        `${baseUrl}/sessions//prompt/?tail=1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedTrailingSessionBlankPromptWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionBlankPromptWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionBlankPromptWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionBlankPromptWithHash = await fetch(
        `${baseUrl}/sessions//prompt#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedSessionBlankPromptWithHash.status).toBe(401);
      expect(unauthenticatedSessionBlankPromptWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionBlankPromptWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionBlankPromptWithHash = await fetch(
        `${baseUrl}/sessions//prompt/#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedTrailingSessionBlankPromptWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionBlankPromptWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionBlankPromptWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionBlankPrompt = await fetch(
        `${baseUrl}/sessions//prompt//`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedDoubleTrailingSessionBlankPrompt.status).toBe(401);
      expect(unauthenticatedDoubleTrailingSessionBlankPrompt.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedDoubleTrailingSessionBlankPrompt.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionBlankPromptWithQuery = await fetch(
        `${baseUrl}/sessions//prompt//?tail=1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedDoubleTrailingSessionBlankPromptWithQuery.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionBlankPromptWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingSessionBlankPromptWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionBlankPromptWithHash = await fetch(
        `${baseUrl}/sessions//prompt//#summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(unauthenticatedDoubleTrailingSessionBlankPromptWithHash.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionBlankPromptWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedDoubleTrailingSessionBlankPromptWithHash.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
        }
      );

      const unauthenticatedSessionBlankMessages = await fetch(`${baseUrl}/sessions//messages`);
      expect(unauthenticatedSessionBlankMessages.status).toBe(401);
      expect(unauthenticatedSessionBlankMessages.headers.get("www-authenticate")).toBe("Bearer");
      await expect(unauthenticatedSessionBlankMessages.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionBlankMessagesWithQuery = await fetch(
        `${baseUrl}/sessions//messages?tail=1`
      );
      expect(unauthenticatedSessionBlankMessagesWithQuery.status).toBe(401);
      expect(unauthenticatedSessionBlankMessagesWithQuery.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionBlankMessagesWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionBlankMessages = await fetch(
        `${baseUrl}/sessions//messages/`
      );
      expect(unauthenticatedTrailingSessionBlankMessages.status).toBe(401);
      expect(unauthenticatedTrailingSessionBlankMessages.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedTrailingSessionBlankMessages.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionBlankMessagesWithQuery = await fetch(
        `${baseUrl}/sessions//messages/?tail=1`
      );
      expect(unauthenticatedTrailingSessionBlankMessagesWithQuery.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionBlankMessagesWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionBlankMessagesWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedSessionBlankMessagesWithHash = await fetch(
        `${baseUrl}/sessions//messages#summary`
      );
      expect(unauthenticatedSessionBlankMessagesWithHash.status).toBe(401);
      expect(unauthenticatedSessionBlankMessagesWithHash.headers.get("www-authenticate")).toBe(
        "Bearer"
      );
      await expect(unauthenticatedSessionBlankMessagesWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedTrailingSessionBlankMessagesWithHash = await fetch(
        `${baseUrl}/sessions//messages/#summary`
      );
      expect(unauthenticatedTrailingSessionBlankMessagesWithHash.status).toBe(401);
      expect(
        unauthenticatedTrailingSessionBlankMessagesWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedTrailingSessionBlankMessagesWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionBlankMessages = await fetch(
        `${baseUrl}/sessions//messages//`
      );
      expect(unauthenticatedDoubleTrailingSessionBlankMessages.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionBlankMessages.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(unauthenticatedDoubleTrailingSessionBlankMessages.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionBlankMessagesWithQuery = await fetch(
        `${baseUrl}/sessions//messages//?tail=1`
      );
      expect(unauthenticatedDoubleTrailingSessionBlankMessagesWithQuery.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionBlankMessagesWithQuery.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingSessionBlankMessagesWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const unauthenticatedDoubleTrailingSessionBlankMessagesWithHash = await fetch(
        `${baseUrl}/sessions//messages//#summary`
      );
      expect(unauthenticatedDoubleTrailingSessionBlankMessagesWithHash.status).toBe(401);
      expect(
        unauthenticatedDoubleTrailingSessionBlankMessagesWithHash.headers.get("www-authenticate")
      ).toBe("Bearer");
      await expect(
        unauthenticatedDoubleTrailingSessionBlankMessagesWithHash.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.AUTHORIZATION_REQUIRED,
      });

      const authenticatedApiUnknown = await fetch(`${baseUrl}/api`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedApiUnknown.status).toBe(404);
      await expect(authenticatedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedApiUnknownWithQuery = await fetch(`${baseUrl}/api?scope=all`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedApiUnknownWithQuery.status).toBe(404);
      await expect(authenticatedApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedApiUnknownWithHash = await fetch(`${baseUrl}/api#summary`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedApiUnknownWithHash.status).toBe(404);
      await expect(authenticatedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingApiUnknown = await fetch(`${baseUrl}/api/`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingApiUnknown.status).toBe(404);
      await expect(authenticatedTrailingApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingApiUnknownWithQuery = await fetch(`${baseUrl}/api/?scope=all`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingApiUnknownWithQuery.status).toBe(404);
      await expect(authenticatedTrailingApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingApiUnknownWithHash = await fetch(`${baseUrl}/api/#summary`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingApiUnknownWithHash.status).toBe(404);
      await expect(authenticatedTrailingApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingApiUnknown = await fetch(`${baseUrl}/api//`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedDoubleTrailingApiUnknown.status).toBe(404);
      await expect(authenticatedDoubleTrailingApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingApiUnknownWithQuery = await fetch(
        `${baseUrl}/api//?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingApiUnknownWithQuery.status).toBe(404);
      await expect(authenticatedDoubleTrailingApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingApiUnknownWithHash = await fetch(
        `${baseUrl}/api//#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingApiUnknownWithHash.status).toBe(404);
      await expect(authenticatedDoubleTrailingApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedRootUnknown = await fetch(`${baseUrl}/`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedRootUnknown.status).toBe(404);
      await expect(authenticatedRootUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedRootUnknownWithQuery = await fetch(`${baseUrl}/?scope=all`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedRootUnknownWithQuery.status).toBe(404);
      await expect(authenticatedRootUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedRootUnknownWithHash = await fetch(`${baseUrl}/#summary`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedRootUnknownWithHash.status).toBe(404);
      await expect(authenticatedRootUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedCoreUnknown = await fetch(`${baseUrl}/unknown-endpoint`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedCoreUnknown.status).toBe(404);
      await expect(authenticatedCoreUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingCoreUnknown = await fetch(`${baseUrl}/unknown-endpoint/`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingCoreUnknown.status).toBe(404);
      await expect(authenticatedTrailingCoreUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedCoreUnknownDirectQuery = await fetch(
        `${baseUrl}/unknown-endpoint?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedCoreUnknownDirectQuery.status).toBe(404);
      await expect(authenticatedCoreUnknownDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingCoreUnknownWithQuery = await fetch(
        `${baseUrl}/unknown-endpoint/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingCoreUnknownWithQuery.status).toBe(404);
      await expect(authenticatedTrailingCoreUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedCoreUnknownWithHash = await fetch(`${baseUrl}/unknown-endpoint#summary`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedCoreUnknownWithHash.status).toBe(404);
      await expect(authenticatedCoreUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingCoreUnknownWithHash = await fetch(
        `${baseUrl}/unknown-endpoint/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingCoreUnknownWithHash.status).toBe(404);
      await expect(authenticatedTrailingCoreUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingCoreUnknown = await fetch(`${baseUrl}/unknown-endpoint//`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedDoubleTrailingCoreUnknown.status).toBe(404);
      await expect(authenticatedDoubleTrailingCoreUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingCoreUnknownWithQuery = await fetch(
        `${baseUrl}/unknown-endpoint//?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingCoreUnknownWithQuery.status).toBe(404);
      await expect(authenticatedDoubleTrailingCoreUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingCoreUnknownWithHash = await fetch(
        `${baseUrl}/unknown-endpoint//#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingCoreUnknownWithHash.status).toBe(404);
      await expect(authenticatedDoubleTrailingCoreUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiUnknown = await fetch(`${baseUrl}/api//config`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedMalformedApiUnknown.status).toBe(404);
      await expect(authenticatedMalformedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiUnknownGet = await fetch(`${baseUrl}/api//config`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedMalformedApiUnknownGet.status).toBe(404);
      await expect(authenticatedMalformedApiUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiUnknown = await fetch(`${baseUrl}/api//config/`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingMalformedApiUnknown.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiUnknownGet = await fetch(`${baseUrl}/api//config/`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedTrailingMalformedApiUnknownGet.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiUnknownDirectQuery = await fetch(
        `${baseUrl}/api//config?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiUnknownDirectQuery.status).toBe(404);
      await expect(authenticatedMalformedApiUnknownDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiUnknownDirectQueryGet = await fetch(
        `${baseUrl}/api//config?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiUnknownDirectQueryGet.status).toBe(404);
      await expect(authenticatedMalformedApiUnknownDirectQueryGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiUnknownWithQuery = await fetch(
        `${baseUrl}/api//config/?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiUnknownWithQuery.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiUnknownWithQueryGet = await fetch(
        `${baseUrl}/api//config/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiUnknownWithQueryGet.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiUnknownWithQueryGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiUnknownWithHash = await fetch(
        `${baseUrl}/api//config#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiUnknownWithHash.status).toBe(404);
      await expect(authenticatedMalformedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiUnknownWithHashGet = await fetch(
        `${baseUrl}/api//config#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiUnknownWithHashGet.status).toBe(404);
      await expect(authenticatedMalformedApiUnknownWithHashGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiUnknownWithHash = await fetch(
        `${baseUrl}/api//config/#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiUnknownWithHash.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiUnknownWithHashGet = await fetch(
        `${baseUrl}/api//config/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiUnknownWithHashGet.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiUnknownWithHashGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiUnknown = await fetch(
        `${baseUrl}/api//config//`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiUnknown.status).toBe(404);
      await expect(authenticatedDoubleTrailingMalformedApiUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiUnknownWithQuery = await fetch(
        `${baseUrl}/api//config//?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiUnknownWithQuery.status).toBe(404);
      await expect(authenticatedDoubleTrailingMalformedApiUnknownWithQuery.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
        }
      );

      const authenticatedDoubleTrailingMalformedApiUnknownWithQueryGet = await fetch(
        `${baseUrl}/api//config//?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiUnknownWithQueryGet.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingMalformedApiUnknownWithQueryGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiUnknownWithHash = await fetch(
        `${baseUrl}/api//config//#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiUnknownWithHash.status).toBe(404);
      await expect(authenticatedDoubleTrailingMalformedApiUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiUnknownWithHashGet = await fetch(
        `${baseUrl}/api//config//#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiUnknownWithHashGet.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingMalformedApiUnknownWithHashGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiSessionUnknown = await fetch(
        `${baseUrl}/api/sessions//messages`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiSessionUnknown.status).toBe(404);
      await expect(authenticatedMalformedApiSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiSessionUnknownGet = await fetch(
        `${baseUrl}/api/sessions//messages`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiSessionUnknownGet.status).toBe(404);
      await expect(authenticatedMalformedApiSessionUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiSessionUnknown = await fetch(
        `${baseUrl}/api/sessions//messages/`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiSessionUnknown.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiSessionUnknownGet = await fetch(
        `${baseUrl}/api/sessions//messages/`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiSessionUnknownGet.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiSessionUnknownGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiSessionUnknownDirectQuery = await fetch(
        `${baseUrl}/api/sessions//messages?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiSessionUnknownDirectQuery.status).toBe(404);
      await expect(authenticatedMalformedApiSessionUnknownDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiSessionUnknownDirectQueryGet = await fetch(
        `${baseUrl}/api/sessions//messages?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiSessionUnknownDirectQueryGet.status).toBe(404);
      await expect(authenticatedMalformedApiSessionUnknownDirectQueryGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiSessionUnknownWithQuery = await fetch(
        `${baseUrl}/api/sessions//messages/?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiSessionUnknownWithQuery.status).toBe(404);
      await expect(
        authenticatedTrailingMalformedApiSessionUnknownWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiSessionUnknownWithQueryGet = await fetch(
        `${baseUrl}/api/sessions//messages/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiSessionUnknownWithQueryGet.status).toBe(404);
      await expect(
        authenticatedTrailingMalformedApiSessionUnknownWithQueryGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiSessionUnknownWithHash = await fetch(
        `${baseUrl}/api/sessions//messages#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiSessionUnknownWithHash.status).toBe(404);
      await expect(authenticatedMalformedApiSessionUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedMalformedApiSessionUnknownWithHashGet = await fetch(
        `${baseUrl}/api/sessions//messages#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedMalformedApiSessionUnknownWithHashGet.status).toBe(404);
      await expect(authenticatedMalformedApiSessionUnknownWithHashGet.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedTrailingMalformedApiSessionUnknownWithHash = await fetch(
        `${baseUrl}/api/sessions//messages/#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiSessionUnknownWithHash.status).toBe(404);
      await expect(authenticatedTrailingMalformedApiSessionUnknownWithHash.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
        }
      );

      const authenticatedTrailingMalformedApiSessionUnknownWithHashGet = await fetch(
        `${baseUrl}/api/sessions//messages/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingMalformedApiSessionUnknownWithHashGet.status).toBe(404);
      await expect(
        authenticatedTrailingMalformedApiSessionUnknownWithHashGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiSessionUnknown = await fetch(
        `${baseUrl}/api/sessions//messages//`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiSessionUnknown.status).toBe(404);
      await expect(authenticatedDoubleTrailingMalformedApiSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery = await fetch(
        `${baseUrl}/api/sessions//messages//?scope=all`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingMalformedApiSessionUnknownWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet = await fetch(
        `${baseUrl}/api/sessions//messages//?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingMalformedApiSessionUnknownWithQueryGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiSessionUnknownWithHash = await fetch(
        `${baseUrl}/api/sessions//messages//#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiSessionUnknownWithHash.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingMalformedApiSessionUnknownWithHash.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet = await fetch(
        `${baseUrl}/api/sessions//messages//#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingMalformedApiSessionUnknownWithHashGet.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.NOT_FOUND,
      });

      const authenticatedSessionUnknown = await fetch(`${baseUrl}/sessions/session-1/unsupported`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedSessionUnknown.status).toBe(404);
      await expect(authenticatedSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionUnknownWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/unsupported?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionUnknownWithQuery.status).toBe(404);
      await expect(authenticatedSessionUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionUnknown = await fetch(
        `${baseUrl}/sessions/session-1/unsupported/`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionUnknown.status).toBe(404);
      await expect(authenticatedTrailingSessionUnknown.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionUnknownWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/unsupported/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionUnknownWithQuery.status).toBe(404);
      await expect(authenticatedTrailingSessionUnknownWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionUnknownWithHash = await fetch(
        `${baseUrl}/sessions/session-1/unsupported#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionUnknownWithHash.status).toBe(404);
      await expect(authenticatedSessionUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionUnknownWithHash = await fetch(
        `${baseUrl}/sessions/session-1/unsupported/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionUnknownWithHash.status).toBe(404);
      await expect(authenticatedTrailingSessionUnknownWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionMissingAction = await fetch(`${baseUrl}/sessions/session-1`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedSessionMissingAction.status).toBe(404);
      await expect(authenticatedSessionMissingAction.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionMissingActionDirectQuery = await fetch(
        `${baseUrl}/sessions/session-1?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionMissingActionDirectQuery.status).toBe(404);
      await expect(authenticatedSessionMissingActionDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionMissingAction = await fetch(
        `${baseUrl}/sessions/session-1/`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionMissingAction.status).toBe(404);
      await expect(authenticatedTrailingSessionMissingAction.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionMissingActionWithQuery = await fetch(
        `${baseUrl}/sessions/session-1/?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionMissingActionWithQuery.status).toBe(404);
      await expect(authenticatedTrailingSessionMissingActionWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionMissingActionWithHash = await fetch(
        `${baseUrl}/sessions/session-1#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionMissingActionWithHash.status).toBe(404);
      await expect(authenticatedSessionMissingActionWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionMissingActionWithHash = await fetch(
        `${baseUrl}/sessions/session-1/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionMissingActionWithHash.status).toBe(404);
      await expect(authenticatedTrailingSessionMissingActionWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionMissingAction = await fetch(
        `${baseUrl}/sessions/session-1//`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingSessionMissingAction.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionMissingAction.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionMissingActionWithQuery = await fetch(
        `${baseUrl}/sessions/session-1//?scope=all`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingSessionMissingActionWithQuery.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingSessionMissingActionWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionMissingActionWithHash = await fetch(
        `${baseUrl}/sessions/session-1//#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingSessionMissingActionWithHash.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionMissingActionWithHash.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
        }
      );

      const authenticatedSessionBlankPrompt = await fetch(`${baseUrl}/sessions//prompt`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "ignored" }),
      });
      expect(authenticatedSessionBlankPrompt.status).toBe(404);
      await expect(authenticatedSessionBlankPrompt.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionBlankPrompt = await fetch(`${baseUrl}/sessions//prompt/`, {
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "ignored" }),
      });
      expect(authenticatedTrailingSessionBlankPrompt.status).toBe(404);
      await expect(authenticatedTrailingSessionBlankPrompt.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionBlankPromptDirectQuery = await fetch(
        `${baseUrl}/sessions//prompt?tail=1`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedSessionBlankPromptDirectQuery.status).toBe(404);
      await expect(authenticatedSessionBlankPromptDirectQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionBlankPromptWithQuery = await fetch(
        `${baseUrl}/sessions//prompt/?tail=1`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedTrailingSessionBlankPromptWithQuery.status).toBe(404);
      await expect(authenticatedTrailingSessionBlankPromptWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionBlankPromptWithHash = await fetch(
        `${baseUrl}/sessions//prompt#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedSessionBlankPromptWithHash.status).toBe(404);
      await expect(authenticatedSessionBlankPromptWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionBlankPromptWithHash = await fetch(
        `${baseUrl}/sessions//prompt/#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedTrailingSessionBlankPromptWithHash.status).toBe(404);
      await expect(authenticatedTrailingSessionBlankPromptWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionBlankPrompt = await fetch(
        `${baseUrl}/sessions//prompt//`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedDoubleTrailingSessionBlankPrompt.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionBlankPrompt.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionBlankPromptWithQuery = await fetch(
        `${baseUrl}/sessions//prompt//?tail=1`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedDoubleTrailingSessionBlankPromptWithQuery.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionBlankPromptWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionBlankPromptWithHash = await fetch(
        `${baseUrl}/sessions//prompt//#summary`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "ignored" }),
        }
      );
      expect(authenticatedDoubleTrailingSessionBlankPromptWithHash.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionBlankPromptWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionBlankMessages = await fetch(`${baseUrl}/sessions//messages`, {
        headers: {
          Authorization: "Bearer secret",
        },
      });
      expect(authenticatedSessionBlankMessages.status).toBe(404);
      await expect(authenticatedSessionBlankMessages.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionBlankMessagesWithQuery = await fetch(
        `${baseUrl}/sessions//messages?tail=1`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionBlankMessagesWithQuery.status).toBe(404);
      await expect(authenticatedSessionBlankMessagesWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionBlankMessages = await fetch(
        `${baseUrl}/sessions//messages/`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionBlankMessages.status).toBe(404);
      await expect(authenticatedTrailingSessionBlankMessages.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionBlankMessagesWithQuery = await fetch(
        `${baseUrl}/sessions//messages/?tail=1`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionBlankMessagesWithQuery.status).toBe(404);
      await expect(authenticatedTrailingSessionBlankMessagesWithQuery.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedSessionBlankMessagesWithHash = await fetch(
        `${baseUrl}/sessions//messages#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedSessionBlankMessagesWithHash.status).toBe(404);
      await expect(authenticatedSessionBlankMessagesWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedTrailingSessionBlankMessagesWithHash = await fetch(
        `${baseUrl}/sessions//messages/#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedTrailingSessionBlankMessagesWithHash.status).toBe(404);
      await expect(authenticatedTrailingSessionBlankMessagesWithHash.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionBlankMessages = await fetch(
        `${baseUrl}/sessions//messages//`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingSessionBlankMessages.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionBlankMessages.json()).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionBlankMessagesWithQuery = await fetch(
        `${baseUrl}/sessions//messages//?tail=1`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingSessionBlankMessagesWithQuery.status).toBe(404);
      await expect(
        authenticatedDoubleTrailingSessionBlankMessagesWithQuery.json()
      ).resolves.toEqual({
        error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
      });

      const authenticatedDoubleTrailingSessionBlankMessagesWithHash = await fetch(
        `${baseUrl}/sessions//messages//#summary`,
        {
          headers: {
            Authorization: "Bearer secret",
          },
        }
      );
      expect(authenticatedDoubleTrailingSessionBlankMessagesWithHash.status).toBe(404);
      await expect(authenticatedDoubleTrailingSessionBlankMessagesWithHash.json()).resolves.toEqual(
        {
          error: SERVER_RESPONSE_MESSAGE.UNKNOWN_ENDPOINT,
        }
      );
    } finally {
      await server.close();
      delete process.env[ENV_KEY.TOADSTOOL_SERVER_PASSWORD];
      EnvManager.resetInstance();
    }
  });
});

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

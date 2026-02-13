import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { z } from "zod";

import { SERVER_CONFIG } from "@/config/server";
import { ENV_KEY } from "@/constants/env-keys";
import { SERVER_EVENT } from "@/constants/server-events";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
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
      const payload = (await invalidPayloadResponse.json()) as { error?: string };
      expect(typeof payload.error).toBe("string");
      expect(payload.error?.length ?? 0).toBeGreaterThan(0);

      const invalidTuiPayloadResponse = await fetch(`${baseUrl}/api/tui/append-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      });
      expect(invalidTuiPayloadResponse.status).toBe(400);
      const tuiPayload = (await invalidTuiPayloadResponse.json()) as { error?: string };
      expect(typeof tuiPayload.error).toBe("string");
      expect(tuiPayload.error?.length ?? 0).toBeGreaterThan(0);
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
});

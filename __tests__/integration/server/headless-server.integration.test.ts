import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { z } from "zod";

import { SERVER_EVENT } from "@/constants/server-events";
import { startHeadlessServer } from "@/server/headless-server";
import { createSessionResponseSchema, serverEventSchema } from "@/server/server-types";

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
});

import http from "node:http";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { PERMISSION } from "@/constants/permissions";
import { type HookIpcEndpoint, HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { afterEach, describe, expect, it } from "vitest";

const postJson = async (endpoint: HookIpcEndpoint, payload: Record<string, unknown>) => {
  if (endpoint.transport === "http" && endpoint.url) {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
});

import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURSOR_HOOK_EVENT } from "../../../src/constants/cursor-hook-events";
import {
  CURSOR_HOOK_IPC_TRANSPORT,
  CURSOR_HOOK_RESPONSE_FIELD,
} from "../../../src/constants/cursor-hook-ipc";
import { CursorHookIpcServer } from "../../../src/core/cursor/hook-ipc-server";
import { CURSOR_HOOK_DECISION } from "../../../src/types/cursor-hooks.types";

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

const baseHookPayload = (hookEventName: string): Record<string, unknown> => ({
  conversation_id: `conversation-${randomUUID()}`,
  generation_id: `generation-${randomUUID()}`,
  hook_event_name: hookEventName,
  model: "opus-4.6-thinking",
  workspace_roots: ["/workspace"],
});

const postJson = async (url: string, payload: Record<string, unknown>): Promise<JsonResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
};

const postUnixJson = async (
  socketPath: string,
  requestPath: string,
  payload: Record<string, unknown>
): Promise<JsonResponse> => {
  return new Promise<JsonResponse>((resolve, reject) => {
    const request = httpRequest(
      {
        socketPath,
        path: requestPath,
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          const parsed = JSON.parse(body) as Record<string, unknown>;
          resolve({
            status: response.statusCode ?? 0,
            body: parsed,
          });
        });
      }
    );
    request.on("error", reject);
    request.end(JSON.stringify(payload));
  });
};

describe("CursorHookIpcServer", () => {
  it("handles sessionStart context and env injection", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      additionalContextProvider: () => "Follow project coding rules.",
      environmentProvider: () => ({ FEATURE_FLAG: "enabled" }),
    });

    try {
      const address = await server.start();
      const response = await postJson(
        address.url ?? "",
        baseHookPayload(CURSOR_HOOK_EVENT.SESSION_START)
      );

      expect(response.status).toBe(200);
      expect(response.body.continue).toBe(true);
      expect(response.body.additional_context).toBe("Follow project coding rules.");
      expect(response.body.env).toEqual({ FEATURE_FLAG: "enabled" });
    } finally {
      await server.stop();
    }
  });

  it("supports event-driven permission approvals", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      permissionTimeoutMs: 2000,
    });

    server.on("permissionRequest", (request) => {
      expect(request.responseField).toBe(CURSOR_HOOK_RESPONSE_FIELD.DECISION);
      server.resolvePermissionRequest(request.requestId, {
        decision: CURSOR_HOOK_DECISION.ALLOW,
        reason: "Approved from test",
      });
    });

    try {
      const address = await server.start();
      const response = await postJson(address.url ?? "", {
        ...baseHookPayload(CURSOR_HOOK_EVENT.PRE_TOOL_USE),
        tool_name: "read_file",
        tool_input: { path: "/workspace/package.json" },
      });

      expect(response.status).toBe(200);
      expect(response.body.decision).toBe(CURSOR_HOOK_DECISION.ALLOW);
      expect(response.body.reason).toBe("Approved from test");
      expect(server.hasPendingPermissionRequests()).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it("applies timeout policy when permission response is not provided", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      permissionTimeoutMs: 20,
      permissionTimeoutDecision: CURSOR_HOOK_DECISION.DENY,
    });

    try {
      const address = await server.start();
      const response = await postJson(address.url ?? "", {
        ...baseHookPayload(CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION),
        command: "rm -rf /tmp/test",
      });

      expect(response.status).toBe(200);
      expect(response.body.permission).toBe(CURSOR_HOOK_DECISION.DENY);
      expect(typeof response.body.reason).toBe("string");
      expect(server.hasPendingPermissionRequests()).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it("returns followup continuation for stop events", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      continuationProvider: () => "Continue by running tests.",
    });

    try {
      const address = await server.start();
      const stopResponse = await postJson(
        address.url ?? "",
        baseHookPayload(CURSOR_HOOK_EVENT.STOP)
      );
      const subagentStopResponse = await postJson(
        address.url ?? "",
        baseHookPayload(CURSOR_HOOK_EVENT.SUBAGENT_STOP)
      );

      expect(stopResponse.status).toBe(200);
      expect(stopResponse.body.followup_message).toBe("Continue by running tests.");
      expect(subagentStopResponse.status).toBe(200);
      expect(subagentStopResponse.body.followup_message).toBe("Continue by running tests.");
    } finally {
      await server.stop();
    }
  });

  it("rejects invalid payloads with a 400 response", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
    });

    try {
      const address = await server.start();
      const response = await postJson(address.url ?? "", {
        hook_event_name: CURSOR_HOOK_EVENT.PRE_TOOL_USE,
      });

      expect(response.status).toBe(400);
      expect(typeof response.body.error).toBe("string");
    } finally {
      await server.stop();
    }
  });

  it("rejects unsupported methods with a 405 response", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
    });

    try {
      const address = await server.start();
      const response = await fetch(address.url ?? "", {
        method: "GET",
      });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(405);
      expect(body.error).toBe("Only POST requests are supported.");
    } finally {
      await server.stop();
    }
  });

  it("rejects unknown hook IPC paths with a 404 response", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
    });

    try {
      const address = await server.start();
      const incorrectPathUrl = (address.url ?? "").replace("/hook", "/unknown");
      const response = await postJson(
        incorrectPathUrl,
        baseHookPayload(CURSOR_HOOK_EVENT.SESSION_START)
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Unknown hook IPC path.");
    } finally {
      await server.stop();
    }
  });

  it("falls back to 500 when thrown statusCode is invalid", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      additionalContextProvider: () => {
        throw Object.assign(new Error("invalid status"), { statusCode: 42 });
      },
    });

    try {
      const address = await server.start();
      const response = await postJson(
        address.url ?? "",
        baseHookPayload(CURSOR_HOOK_EVENT.SESSION_START)
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Hook IPC server error.");
    } finally {
      await server.stop();
    }
  });

  it("rejects oversized payloads with a 413 response", async () => {
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      bodyMaxBytes: 64,
    });

    try {
      const address = await server.start();
      const response = await postJson(address.url ?? "", {
        ...baseHookPayload(CURSOR_HOOK_EVENT.SESSION_START),
        additional_context: "x".repeat(1024),
      });

      expect(response.status).toBe(413);
      expect(response.body.error).toBe("Payload too large.");
    } finally {
      await server.stop();
    }
  });

  it("supports unix socket transport", async () => {
    const socketPath = path.join(tmpdir(), `toadstool-cursor-hook-test-${randomUUID()}.sock`);
    const server = new CursorHookIpcServer({
      transport: CURSOR_HOOK_IPC_TRANSPORT.UNIX,
      socketPath,
    });

    try {
      const address = await server.start();
      const response = await postUnixJson(
        address.socketPath ?? "",
        "/hook",
        baseHookPayload(CURSOR_HOOK_EVENT.SESSION_START)
      );

      expect(address.transport).toBe(CURSOR_HOOK_IPC_TRANSPORT.UNIX);
      expect(response.status).toBe(200);
      expect(response.body.continue).toBe(true);
    } finally {
      await server.stop();
    }
  });
});

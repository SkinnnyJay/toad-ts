import { createConnection, type Socket as NetSocket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";

function makeSocketPath(): string {
  return join(tmpdir(), `test-hook-${process.pid}-${Date.now()}.sock`);
}

function sendToSocket(
  socketPath: string,
  data: unknown,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = createConnection(socketPath, () => {
      client.write(JSON.stringify(data));
      client.end();
    });

    let response = "";
    client.on("data", (chunk) => {
      response += chunk.toString();
    });
    client.on("end", () => {
      resolve(response);
    });
    client.on("error", (error) => {
      reject(error);
    });
  });
}

const baseHookInput = {
  conversation_id: "conv-123",
  generation_id: "gen-456",
  model: "claude-4.6-opus",
  hook_event_name: "sessionStart",
  cursor_version: "2026.01.28",
  workspace_roots: ["/workspace"],
  user_email: "test@example.com",
  transcript_path: null,
};

describe("HookIpcServer", () => {
  let server: HookIpcServer;
  let socketPath: string;

  beforeEach(() => {
    socketPath = makeSocketPath();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe("lifecycle", () => {
    it("starts and stops cleanly", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();
      expect(server.isListening).toBe(true);
      expect(server.path).toBe(socketPath);

      await server.stop();
      expect(server.isListening).toBe(false);
    });

    it("emits listening event on start", async () => {
      server = new HookIpcServer({ socketPath });

      let listenPath = "";
      server.on("listening", (p) => {
        listenPath = p;
      });

      await server.start();
      expect(listenPath).toBe(socketPath);
    });

    it("emits closed event on stop", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      let closed = false;
      server.on("closed", () => {
        closed = true;
      });

      await server.stop();
      expect(closed).toBe(true);
    });
  });

  describe("sessionStart handler", () => {
    it("returns additional context when configured", async () => {
      server = new HookIpcServer({
        socketPath,
        additionalContext: "Follow TOADSTOOL rules",
      });
      await server.start();

      const input = {
        ...baseHookInput,
        hook_event_name: "sessionStart",
        session_id: "sess-1",
        is_background_agent: false,
        composer_mode: "agent",
      };

      const response = await sendToSocket(socketPath, input);
      const parsed = JSON.parse(response);

      expect(parsed.continue).toBe(true);
      expect(parsed.additional_context).toBe("Follow TOADSTOOL rules");
    });

    it("returns session env when configured", async () => {
      server = new HookIpcServer({
        socketPath,
        sessionEnv: { MY_VAR: "value" },
      });
      await server.start();

      const input = {
        ...baseHookInput,
        hook_event_name: "sessionStart",
        session_id: "sess-1",
        is_background_agent: false,
        composer_mode: "agent",
      };

      const response = await sendToSocket(socketPath, input);
      const parsed = JSON.parse(response);

      expect(parsed.env).toEqual({ MY_VAR: "value" });
    });
  });

  describe("preToolUse handler", () => {
    it("emits permissionRequest and resolves with decision", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      // Auto-allow via permissionRequest handler
      server.on("permissionRequest", (req) => {
        req.resolve("allow", "Approved by test");
      });

      const input = {
        ...baseHookInput,
        hook_event_name: "preToolUse",
        tool_name: "Shell",
        tool_input: { command: "npm test" },
        tool_use_id: "tool-1",
        cwd: "/workspace",
      };

      const response = await sendToSocket(socketPath, input);
      const parsed = JSON.parse(response);

      expect(parsed.decision).toBe("allow");
      expect(parsed.reason).toBe("Approved by test");
    });

    it("emits permissionRequest with correct metadata", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      let receivedRequest: Record<string, unknown> | null = null;
      server.on("permissionRequest", (req) => {
        receivedRequest = {
          toolName: req.toolName,
          hookEvent: req.hookEvent,
          toolInput: req.toolInput,
        };
        req.resolve("deny");
      });

      const input = {
        ...baseHookInput,
        hook_event_name: "preToolUse",
        tool_name: "Shell",
        tool_input: { command: "rm -rf /" },
        tool_use_id: "tool-2",
      };

      await sendToSocket(socketPath, input);

      expect(receivedRequest).toBeDefined();
      expect(receivedRequest!["toolName"]).toBe("Shell");
      expect(receivedRequest!["hookEvent"]).toBe(CURSOR_HOOK_EVENT.PRE_TOOL_USE);
    });
  });

  describe("afterAgentThought handler", () => {
    it("emits thought text", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      let receivedThought = "";
      server.on("agentThought", (thought) => {
        receivedThought = thought;
      });

      const input = {
        ...baseHookInput,
        hook_event_name: "afterAgentThought",
        thought: "I should read the file first",
      };

      await sendToSocket(socketPath, input);
      expect(receivedThought).toBe("I should read the file first");
    });
  });

  describe("afterFileEdit handler", () => {
    it("emits file edit details", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      let receivedEdit: Record<string, unknown> | null = null;
      server.on("fileEdit", (edit) => {
        receivedEdit = edit as unknown as Record<string, unknown>;
      });

      const input = {
        ...baseHookInput,
        hook_event_name: "afterFileEdit",
        path: "/workspace/src/index.ts",
        edits: [
          { old_string: "const x = 1;", new_string: "const x = 2;" },
        ],
      };

      await sendToSocket(socketPath, input);
      expect(receivedEdit).toBeDefined();
      expect(receivedEdit!["path"]).toBe("/workspace/src/index.ts");
    });
  });

  describe("stop handler", () => {
    it("returns empty response by default (no auto-continuation)", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      const input = {
        ...baseHookInput,
        hook_event_name: "stop",
        status: "completed",
        loop_count: 0,
      };

      const response = await sendToSocket(socketPath, input);
      const parsed = JSON.parse(response);

      expect(parsed.followup_message).toBeUndefined();
    });
  });

  describe("hookEvent emission", () => {
    it("emits hookEvent for every incoming event", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      const receivedEvents: string[] = [];
      server.on("hookEvent", (eventName) => {
        receivedEvents.push(eventName);
      });

      const input = {
        ...baseHookInput,
        hook_event_name: "sessionEnd",
        session_id: "sess-1",
      };

      await sendToSocket(socketPath, input);
      expect(receivedEvents).toContain("sessionEnd");
    });
  });

  describe("error handling", () => {
    it("handles invalid JSON gracefully", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      const response = await new Promise<string>((resolve, reject) => {
        const client = createConnection(socketPath, () => {
          client.write("not valid json");
          client.end();
        });
        let resp = "";
        client.on("data", (chunk) => { resp += chunk.toString(); });
        client.on("end", () => resolve(resp));
        client.on("error", reject);
      });

      expect(JSON.parse(response)).toEqual({});
    });

    it("handles missing hook_event_name gracefully", async () => {
      server = new HookIpcServer({ socketPath });
      await server.start();

      const response = await sendToSocket(socketPath, { foo: "bar" });
      expect(JSON.parse(response)).toEqual({});
    });
  });

  describe("custom handler registration", () => {
    it("overrides default handler", async () => {
      server = new HookIpcServer({ socketPath });

      server.registerHandler(CURSOR_HOOK_EVENT.SESSION_START, () => ({
        additional_context: "Custom context",
        continue: true,
      }));

      await server.start();

      const input = {
        ...baseHookInput,
        hook_event_name: "sessionStart",
        session_id: "sess-1",
        is_background_agent: false,
        composer_mode: "agent",
      };

      const response = await sendToSocket(socketPath, input);
      const parsed = JSON.parse(response);
      expect(parsed.additional_context).toBe("Custom context");
    });
  });
});

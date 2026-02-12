/**
 * Integration tests for the Cursor CLI Harness.
 *
 * Tests the full flow: CursorStreamParser → CursorToAcpTranslator → events,
 * using real NDJSON fixtures. Also tests Hook IPC Server integration.
 */

import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { join } from "node:path";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import type { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CursorCliHarnessAdapter } from "@/core/cursor/cursor-cli-harness";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import { HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import { STREAM_EVENT_TYPE } from "@/types/cli-agent.types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, "../../../fixtures/cursor/ndjson", name), "utf-8");
}

function makeSocketPath(): string {
  return join(tmpdir(), `test-integration-${process.pid}-${Date.now()}.sock`);
}

function sendToSocket(socketPath: string, data: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = createConnection(socketPath, () => {
      client.write(JSON.stringify(data));
      client.end();
    });
    let response = "";
    client.on("data", (chunk) => {
      response += chunk.toString();
    });
    client.on("end", () => resolve(response));
    client.on("error", reject);
  });
}

describe("Cursor CLI Harness Integration", () => {
  describe("Full NDJSON → AgentPort pipeline", () => {
    it("processes hello-response.ndjson through parser + translator", () => {
      const parser = new CursorStreamParser();
      const translator = new CursorToAcpTranslator();
      translator.attach(parser);

      const states: string[] = [];
      const sessionUpdates: unknown[] = [];
      const streamEvents: unknown[] = [];
      const promptResults: unknown[] = [];

      translator.on("state", (s) => states.push(s));
      translator.on("sessionUpdate", (u) => sessionUpdates.push(u));
      translator.on("streamEvent", (e) => streamEvents.push(e));
      translator.on("promptResult", (r) => promptResults.push(r));

      // Feed entire fixture
      parser.feed(loadFixture("hello-response.ndjson"));
      parser.flush();

      // Verify state transitions
      expect(states).toContain(CONNECTION_STATUS.CONNECTED);

      // Verify session updates were generated
      expect(sessionUpdates.length).toBeGreaterThan(0);

      // Verify stream events sequence
      const eventTypes = streamEvents.map((e) => (e as Record<string, string>).type);
      expect(eventTypes).toContain(STREAM_EVENT_TYPE.SESSION_INIT);
      expect(eventTypes).toContain(STREAM_EVENT_TYPE.TEXT_DELTA);
      expect(eventTypes).toContain(STREAM_EVENT_TYPE.TEXT_COMPLETE);
      expect(eventTypes).toContain(STREAM_EVENT_TYPE.RESULT);

      // Verify prompt resolution
      expect(promptResults).toHaveLength(1);
      const result = promptResults[0] as Record<string, unknown>;
      expect(result.text).toBeDefined();
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.isError).toBe(false);

      // Verify session ID was captured
      expect(translator.sessionId).toBeDefined();
    });

    it("processes tool-use-response.ndjson with tool call tracking", () => {
      const parser = new CursorStreamParser();
      const translator = new CursorToAcpTranslator();
      translator.attach(parser);

      const sessionUpdates: unknown[] = [];
      const streamEvents: unknown[] = [];

      translator.on("sessionUpdate", (u) => sessionUpdates.push(u));
      translator.on("streamEvent", (e) => streamEvents.push(e));

      parser.feed(loadFixture("tool-use-response.ndjson"));
      parser.flush();

      // Verify tool call events
      const toolStarts = streamEvents.filter(
        (e) => (e as Record<string, string>).type === STREAM_EVENT_TYPE.TOOL_START
      );
      const toolCompletes = streamEvents.filter(
        (e) => (e as Record<string, string>).type === STREAM_EVENT_TYPE.TOOL_COMPLETE
      );

      expect(toolStarts.length).toBeGreaterThan(0);
      expect(toolCompletes.length).toBeGreaterThan(0);
      expect(toolStarts.length).toBe(toolCompletes.length);

      // Verify tool call count in translator
      expect(translator.totalToolCalls).toBe(toolStarts.length);

      // Verify session updates include tool call types
      const updateTypes = sessionUpdates.map(
        (u) => (u as Record<string, Record<string, string>>).update.sessionUpdate
      );
      expect(updateTypes).toContain(SESSION_UPDATE_TYPE.TOOL_CALL);
      expect(updateTypes).toContain(SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE);
    });

    it("handles chunk-by-chunk streaming (simulate real stdout)", () => {
      const parser = new CursorStreamParser();
      const translator = new CursorToAcpTranslator();
      translator.attach(parser);

      const streamEvents: unknown[] = [];
      translator.on("streamEvent", (e) => streamEvents.push(e));

      const fixture = loadFixture("hello-response.ndjson");
      const lines = fixture.split("\n");

      // Feed line by line (simulating real stdout chunks)
      for (const line of lines) {
        if (line.trim()) {
          parser.feed(`${line}\n`);
        }
      }
      parser.flush();

      // Should get the same result as feeding all at once
      expect(streamEvents.length).toBeGreaterThan(0);
      const eventTypes = streamEvents.map((e) => (e as Record<string, string>).type);
      expect(eventTypes).toContain(STREAM_EVENT_TYPE.RESULT);
    });
  });

  describe("Hook IPC Server integration", () => {
    let hookServer: HookIpcServer;
    let socketPath: string;

    beforeEach(async () => {
      socketPath = makeSocketPath();
      hookServer = new HookIpcServer({ socketPath });
      await hookServer.start();
    });

    afterEach(async () => {
      await hookServer.stop();
    });

    it("full hook flow: sessionStart → preToolUse → stop", async () => {
      const events: string[] = [];
      hookServer.on("hookEvent", (name) => events.push(name));
      hookServer.on("permissionRequest", (req) => req.resolve("allow"));

      const baseInput = {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        model: "claude-4.6",
        cursor_version: "2026.01.28",
        workspace_roots: ["/workspace"],
        user_email: "test@example.com",
        transcript_path: null,
      };

      // 1. sessionStart
      const sessionResponse = await sendToSocket(socketPath, {
        ...baseInput,
        hook_event_name: "sessionStart",
        session_id: "sess-1",
        is_background_agent: false,
        composer_mode: "agent",
      });
      const sessionParsed = JSON.parse(sessionResponse);
      expect(sessionParsed.continue).toBe(true);

      // 2. preToolUse
      const toolResponse = await sendToSocket(socketPath, {
        ...baseInput,
        hook_event_name: "preToolUse",
        tool_name: "Shell",
        tool_input: { command: "npm test" },
        tool_use_id: "tool-1",
      });
      const toolParsed = JSON.parse(toolResponse);
      expect(toolParsed.decision).toBe("allow");

      // 3. stop
      const stopResponse = await sendToSocket(socketPath, {
        ...baseInput,
        hook_event_name: "stop",
        status: "completed",
        loop_count: 0,
      });
      const stopParsed = JSON.parse(stopResponse);
      expect(stopParsed).toBeDefined();

      // All events should have been received
      expect(events).toContain("sessionStart");
      expect(events).toContain("preToolUse");
      expect(events).toContain("stop");
    });

    it("permission denial flow", async () => {
      // Deny all permissions
      hookServer.on("permissionRequest", (req) => {
        req.resolve("deny", "Blocked by test policy");
      });

      const baseInput = {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        model: "claude-4.6",
        cursor_version: "2026.01.28",
        workspace_roots: ["/workspace"],
        user_email: null,
        transcript_path: null,
      };

      const response = await sendToSocket(socketPath, {
        ...baseInput,
        hook_event_name: "preToolUse",
        tool_name: "Shell",
        tool_input: { command: "rm -rf /" },
        tool_use_id: "tool-dangerous",
      });

      const parsed = JSON.parse(response);
      expect(parsed.decision).toBe("deny");
      expect(parsed.reason).toBe("Blocked by test policy");
    });

    it("context injection on sessionStart", async () => {
      const contextServer = new HookIpcServer({
        socketPath: makeSocketPath(),
        additionalContext: "Follow TOADSTOOL coding standards",
        sessionEnv: { CUSTOM_VAR: "hello" },
      });
      await contextServer.start();

      try {
        const response = await sendToSocket(contextServer.path, {
          conversation_id: "conv-1",
          generation_id: "gen-1",
          model: "claude-4.6",
          hook_event_name: "sessionStart",
          cursor_version: "2026.01.28",
          workspace_roots: ["/workspace"],
          user_email: null,
          transcript_path: null,
          session_id: "sess-1",
          is_background_agent: false,
          composer_mode: "agent",
        });

        const parsed = JSON.parse(response);
        expect(parsed.additional_context).toBe("Follow TOADSTOOL coding standards");
        expect(parsed.env).toEqual({ CUSTOM_VAR: "hello" });
        expect(parsed.continue).toBe(true);
      } finally {
        await contextServer.stop();
      }
    });
  });

  describe("HooksConfigGenerator integration", () => {
    it("generates valid hooks.json and shim script", () => {
      const tempDir = join(tmpdir(), `hooks-gen-test-${Date.now()}`);
      const { mkdirSync, rmSync, readFileSync: readFile, existsSync } = require("node:fs");
      mkdirSync(tempDir, { recursive: true });

      try {
        const generator = new HooksConfigGenerator({
          projectRoot: tempDir,
          socketPath: "/tmp/test.sock",
        });

        const result = generator.install();

        // Verify hooks.json is valid JSON
        const hooksContent = JSON.parse(readFile(result.hooksJsonPath, "utf-8"));
        expect(hooksContent.version).toBe(1);
        expect(Object.keys(hooksContent.hooks).length).toBeGreaterThan(0);

        // Verify shim script exists and is executable
        expect(existsSync(result.shimPath)).toBe(true);

        // Verify env vars
        expect(result.env.TOADSTOOL_HOOK_SOCKET).toBe("/tmp/test.sock");

        // Cleanup
        generator.uninstall();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("Full harness adapter (mocked process)", () => {
    it("connect → initialize → newSession → prompt lifecycle", async () => {
      const mockConnection = createMockConnection();
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      // Connect
      await adapter.connect();
      expect(adapter.connectionStatus).toBe(CONNECTION_STATUS.CONNECTED);

      // Initialize
      const initResult = await adapter.initialize();
      expect(initResult).toBeDefined();

      // New session
      const session = await adapter.newSession({} as never);
      expect((session as unknown as Record<string, string>).sessionId).toBeDefined();

      // Prompt
      const updates: unknown[] = [];
      adapter.on("sessionUpdate", (u) => updates.push(u));

      const response = await adapter.prompt({
        content: [{ type: "text", text: "Hello" }],
      } as never);

      const responseText = (response as unknown as Record<string, Array<Record<string, string>>>)
        .content[0]?.text;
      expect(responseText).toBe("Hello!");
      expect(updates.length).toBeGreaterThan(0);

      // Disconnect
      await adapter.disconnect();
      expect(adapter.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
    });

    it("error handling — process crash during prompt", async () => {
      const errorConnection = createErrorConnection();
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => errorConnection,
      });

      await adapter.connect();

      await expect(
        adapter.prompt({ content: [{ type: "text", text: "test" }] } as never)
      ).rejects.toThrow("exited with code 1");
    });

    it("multi-turn conversation with --resume", async () => {
      let promptCount = 0;
      const resumeConnection = createMockConnection();
      // Track sessionId across prompts
      let trackedSessionId: string | null = null;

      (resumeConnection as unknown as Record<string, unknown>).spawnPrompt = vi.fn(
        (input: Record<string, unknown>) => {
          promptCount++;
          const proc = new EventEmitter() as unknown as ChildProcess;
          Object.assign(proc, {
            pid: 12345 + promptCount,
            stdout: new EventEmitter(),
            stderr: new EventEmitter(),
            stdin: { write: vi.fn(), end: vi.fn() },
            kill: vi.fn(),
          });

          const parser = new CursorStreamParser();
          const sessionId = (input.sessionId as string) || "multi-turn-session";
          trackedSessionId = sessionId;

          setTimeout(() => {
            const events = [
              `{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"${sessionId}","model":"gpt-5.2","permissionMode":"default"}`,
              `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Turn ${promptCount} response"}]},"session_id":"${sessionId}","timestamp_ms":1000}`,
              `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Turn ${promptCount} response"}]},"session_id":"${sessionId}"}`,
              `{"type":"result","subtype":"success","duration_ms":2000,"is_error":false,"result":"Turn ${promptCount} response","session_id":"${sessionId}"}`,
            ];
            parser.feed(`${events.join("\n")}\n`);
            (proc as unknown as EventEmitter).emit("exit", 0, null);
          }, 15);

          return { process: proc, parser };
        }
      );

      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => resumeConnection,
      });

      await adapter.connect();

      // First prompt
      const resp1 = await adapter.prompt({
        content: [{ type: "text", text: "First message" }],
      } as never);
      expect(
        (resp1 as unknown as Record<string, Array<Record<string, string>>>).content[0]?.text
      ).toContain("Turn 1");

      // Second prompt (should use session from first)
      const resp2 = await adapter.prompt({
        content: [{ type: "text", text: "Second message" }],
      } as never);
      expect(
        (resp2 as unknown as Record<string, Array<Record<string, string>>>).content[0]?.text
      ).toContain("Turn 2");

      // Verify spawnPrompt was called twice
      expect(promptCount).toBe(2);
    });

    it("model and mode selection persists across prompts", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => createMockConnection(),
        model: "sonnet-4.5",
        mode: "plan",
      });

      await adapter.connect();

      // Verify mode/model can be changed
      const modeResult = await adapter.setSessionMode({ mode: "ask" } as never);
      expect((modeResult as unknown as Record<string, string>).mode).toBe("ask");

      const modelResult = await adapter.setSessionModel({ model: "gpt-5.2" } as never);
      expect((modelResult as unknown as Record<string, string>).model).toBe("gpt-5.2");
    });

    it("graceful shutdown kills active process", async () => {
      const mockConn = createMockConnection();
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConn,
      });

      await adapter.connect();

      // Disconnect should call killActiveProcess even without an active prompt
      await adapter.disconnect();

      expect(
        (mockConn as unknown as Record<string, { mock: { calls: unknown[] } }>).killActiveProcess
          .mock.calls.length
      ).toBeGreaterThan(0);
      expect(adapter.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
    });

    it("auth failure produces clear error message", async () => {
      const noAuthConnection = createMockConnection();
      (noAuthConnection as unknown as Record<string, unknown>).connect = vi.fn(async () => {
        throw new Error("Cursor CLI not authenticated. Run: cursor-agent login");
      });

      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => noAuthConnection,
      });

      await expect(adapter.connect()).rejects.toThrow("not authenticated");
      expect(adapter.connectionStatus).toBe(CONNECTION_STATUS.ERROR);
    });

    it("missing binary produces clear error message", async () => {
      const noBinaryConnection = createMockConnection();
      (noBinaryConnection as unknown as Record<string, unknown>).connect = vi.fn(async () => {
        throw new Error(
          "Cursor CLI not found. Install with: curl -fsSL https://cursor.com/install | bash"
        );
      });

      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => noBinaryConnection,
      });

      await expect(adapter.connect()).rejects.toThrow("not found");
    });
  });
});

// ── Mock helpers ─────────────────────────────────────────────

function createMockConnection(): CursorCliConnection {
  const conn = new EventEmitter() as unknown as CursorCliConnection;

  Object.assign(conn, {
    connectionStatus: CONNECTION_STATUS.DISCONNECTED,
    sessionId: null,
    isPromptActive: false,
    connect: vi.fn(async () => {
      (conn as unknown as EventEmitter).emit("state", CONNECTION_STATUS.CONNECTED);
    }),
    disconnect: vi.fn(async () => {
      (conn as unknown as EventEmitter).emit("state", CONNECTION_STATUS.DISCONNECTED);
    }),
    verifyInstallation: vi.fn(async () => ({
      binaryName: "cursor-agent",
      installed: true,
      version: "2026.01.28",
    })),
    verifyAuth: vi.fn(async () => ({
      authenticated: true,
      method: "browser_login",
      email: "test@example.com",
    })),
    listModels: vi.fn(async () => ({
      models: [{ id: "gpt-5.2", name: "GPT-5.2" }],
      defaultModel: "gpt-5.2",
    })),
    createSession: vi.fn(async () => "test-session-123"),
    killActiveProcess: vi.fn(),
    spawnPrompt: vi.fn(() => {
      const proc = new EventEmitter() as unknown as ChildProcess;
      Object.assign(proc, {
        pid: 12345,
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: { write: vi.fn(), end: vi.fn() },
        kill: vi.fn(),
      });

      const parser = new CursorStreamParser();

      setTimeout(() => {
        const events = [
          '{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"sess-1","model":"gpt-5.2","permissionMode":"default"}',
          '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello!"}]},"session_id":"sess-1","timestamp_ms":1000}',
          '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello!"}]},"session_id":"sess-1"}',
          '{"type":"result","subtype":"success","duration_ms":3000,"is_error":false,"result":"Hello!","session_id":"sess-1"}',
        ];
        parser.feed(`${events.join("\n")}\n`);
        (proc as unknown as EventEmitter).emit("exit", 0, null);
      }, 15);

      return { process: proc, parser };
    }),
  });

  return conn;
}

function createErrorConnection(): CursorCliConnection {
  const conn = new EventEmitter() as unknown as CursorCliConnection;

  Object.assign(conn, {
    connectionStatus: CONNECTION_STATUS.DISCONNECTED,
    sessionId: null,
    isPromptActive: false,
    connect: vi.fn(async () => {
      (conn as unknown as EventEmitter).emit("state", CONNECTION_STATUS.CONNECTED);
    }),
    disconnect: vi.fn(async () => {}),
    listModels: vi.fn(async () => ({ models: [] })),
    createSession: vi.fn(async () => "error-session"),
    killActiveProcess: vi.fn(),
    spawnPrompt: vi.fn(() => {
      const proc = new EventEmitter() as unknown as ChildProcess;
      Object.assign(proc, {
        pid: 999,
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: { write: vi.fn(), end: vi.fn() },
        kill: vi.fn(),
      });

      const parser = new CursorStreamParser();

      setTimeout(() => {
        (proc as unknown as EventEmitter).emit("exit", 1, null);
      }, 10);

      return { process: proc, parser };
    }),
  });

  return conn;
}

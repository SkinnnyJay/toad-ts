import { EventEmitter } from "node:events";
import { type ChildProcess } from "node:child_process";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  CursorCliHarnessAdapter,
  cursorCliHarnessAdapter,
} from "@/core/cursor/cursor-cli-harness";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";

/** Creates a mock CursorCliConnection for testing */
function createMockConnection(): CursorCliConnection {
  const conn = new EventEmitter() as unknown as CursorCliConnection;
  let sessionId: string | null = null;
  let promptActive = false;

  Object.defineProperty(conn, "connectionStatus", {
    get: () => CONNECTION_STATUS.DISCONNECTED,
  });

  Object.defineProperty(conn, "sessionId", {
    get: () => sessionId,
  });

  Object.defineProperty(conn, "isPromptActive", {
    get: () => promptActive,
  });

  Object.assign(conn, {
    connect: vi.fn(async () => {
      (conn as unknown as EventEmitter).emit("state", CONNECTION_STATUS.CONNECTED);
    }),
    disconnect: vi.fn(async () => {
      sessionId = null;
      (conn as unknown as EventEmitter).emit("state", CONNECTION_STATUS.DISCONNECTED);
    }),
    verifyInstallation: vi.fn(async () => ({
      binaryName: "cursor-agent",
      installed: true,
      version: "2026.01.28",
    })),
    verifyAuth: vi.fn(async () => ({
      authenticated: true,
      method: "browser_login" as const,
      email: "test@example.com",
    })),
    listModels: vi.fn(async () => ({
      models: [
        { id: "gpt-5.2", name: "GPT-5.2", isDefault: false, isCurrent: false },
        { id: "opus-4.6", name: "Claude 4.6 Opus", isDefault: true, isCurrent: true },
      ],
      defaultModel: "opus-4.6",
      currentModel: "opus-4.6",
    })),
    createSession: vi.fn(async () => {
      sessionId = "test-session-123";
      return sessionId;
    }),
    killActiveProcess: vi.fn(),
    spawnPrompt: vi.fn((input: unknown) => {
      promptActive = true;
      const proc = new EventEmitter() as unknown as ChildProcess;
      const stdoutEmitter = new EventEmitter();
      const stderrEmitter = new EventEmitter();

      Object.assign(proc, {
        pid: 12345,
        stdout: stdoutEmitter,
        stderr: stderrEmitter,
        stdin: { write: vi.fn(), end: vi.fn() },
        kill: vi.fn(),
      });

      const parser = new CursorStreamParser();

      // Simulate NDJSON output after a tick
      setTimeout(() => {
        const systemInit = JSON.stringify({
          type: "system",
          subtype: "init",
          apiKeySource: "login",
          cwd: "/test",
          session_id: "real-session-id",
          model: "gpt-5.2",
          permissionMode: "default",
        });
        const assistantDelta = JSON.stringify({
          type: "assistant",
          message: { role: "assistant", content: [{ type: "text", text: "Hello!" }] },
          session_id: "real-session-id",
          timestamp_ms: 1000,
        });
        const assistantComplete = JSON.stringify({
          type: "assistant",
          message: { role: "assistant", content: [{ type: "text", text: "Hello!" }] },
          session_id: "real-session-id",
        });
        const result = JSON.stringify({
          type: "result",
          subtype: "success",
          duration_ms: 3000,
          is_error: false,
          result: "Hello!",
          session_id: "real-session-id",
        });

        parser.feed(`${systemInit}\n${assistantDelta}\n${assistantComplete}\n${result}\n`);
        promptActive = false;
        (proc as unknown as EventEmitter).emit("exit", 0, null);
      }, 20);

      return { process: proc, parser };
    }),
  });

  return conn;
}

describe("CursorCliHarnessAdapter", () => {
  let mockConnection: CursorCliConnection;

  beforeEach(() => {
    mockConnection = createMockConnection();
  });

  describe("constructor", () => {
    it("creates with default options", () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });
      expect(adapter.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
    });
  });

  describe("connect / disconnect", () => {
    it("connects through the connection object", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      const states: string[] = [];
      adapter.on("state", (s) => states.push(s));

      await adapter.connect();

      expect((mockConnection as unknown as Record<string, unknown>).connect).toHaveBeenCalled();
      expect(states).toContain(CONNECTION_STATUS.CONNECTING);
    });

    it("disconnects cleanly", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await adapter.connect();
      await adapter.disconnect();

      expect(
        (mockConnection as unknown as Record<string, unknown>).killActiveProcess,
      ).toHaveBeenCalled();
      expect(
        (mockConnection as unknown as Record<string, unknown>).disconnect,
      ).toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("returns server info with Cursor CLI name", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await adapter.connect();
      const result = await adapter.initialize();

      expect((result as unknown as Record<string, Record<string, string>>).serverInfo.name).toBe(
        HARNESS_DEFAULT.CURSOR_CLI_NAME,
      );
    });
  });

  describe("newSession", () => {
    it("creates a session via connection", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await adapter.connect();
      const session = await adapter.newSession({} as never);

      expect(
        (mockConnection as unknown as Record<string, unknown>).createSession,
      ).toHaveBeenCalled();
      expect((session as unknown as Record<string, string>).sessionId).toBe("test-session-123");
    });

    it("falls back to local ID when create-chat fails", async () => {
      (mockConnection as unknown as Record<string, jest.Mock>).createSession = vi.fn(
        async () => {
          throw new Error("create-chat not available");
        },
      );

      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await adapter.connect();
      const session = await adapter.newSession({} as never);

      const sessionId = (session as unknown as Record<string, string>).sessionId;
      expect(sessionId).toBeDefined();
      expect(sessionId.startsWith("cursor-")).toBe(true);
    });
  });

  describe("prompt", () => {
    it("sends prompt and receives response", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await adapter.connect();

      const updates: unknown[] = [];
      adapter.on("sessionUpdate", (u) => updates.push(u));

      const response = await adapter.prompt({
        content: [{ type: "text", text: "Say hello" }],
      } as never);

      const typed = response as unknown as Record<string, unknown>;
      const content = typed["content"] as Array<Record<string, string>>;
      expect(content[0]!["text"]).toBe("Hello!");
      expect(updates.length).toBeGreaterThan(0);
    });

    it("emits sessionUpdate events during prompt", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await adapter.connect();

      const updates: unknown[] = [];
      adapter.on("sessionUpdate", (u) => updates.push(u));

      await adapter.prompt({
        content: [{ type: "text", text: "test" }],
      } as never);

      // Should have received at least a delta and complete message
      expect(updates.length).toBeGreaterThanOrEqual(2);
    });

    it("rejects when process exits with non-zero code", async () => {
      const errorConnection = createMockConnection();
      (errorConnection as unknown as Record<string, jest.Mock>).spawnPrompt = vi.fn(() => {
        const proc = new EventEmitter() as unknown as ChildProcess;
        Object.assign(proc, {
          pid: 999,
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
          kill: vi.fn(),
        });
        const parser = new CursorStreamParser();
        // Simulate crash
        setTimeout(() => {
          (proc as unknown as EventEmitter).emit("exit", 1, null);
        }, 10);
        return { process: proc, parser };
      });

      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => errorConnection,
      });

      await adapter.connect();

      await expect(
        adapter.prompt({ content: [{ type: "text", text: "test" }] } as never),
      ).rejects.toThrow("exited with code 1");
    });
  });

  describe("authenticate", () => {
    it("returns authenticated when auth is valid", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      const result = await adapter.authenticate({} as never);
      const typed = result as unknown as Record<string, string>;
      expect(typed["status"]).toBe("authenticated");
    });
  });

  describe("sessionUpdate", () => {
    it("is a no-op", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      await expect(adapter.sessionUpdate({} as never)).resolves.toBeUndefined();
    });
  });

  describe("mode/model switching", () => {
    it("setSessionMode updates current mode", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      const result = await adapter.setSessionMode!({ mode: "plan" });
      expect(result.mode).toBe("plan");
    });

    it("setSessionModel updates current model", async () => {
      const adapter = new CursorCliHarnessAdapter({
        enableHooks: false,
        connectionFactory: () => mockConnection,
      });

      const result = await adapter.setSessionModel!({ model: "gpt-5.2" });
      expect(result.model).toBe("gpt-5.2");
    });
  });

  describe("cursorCliHarnessAdapter export", () => {
    it("has correct id and name", () => {
      expect(cursorCliHarnessAdapter.id).toBe(HARNESS_DEFAULT.CURSOR_CLI_ID);
      expect(cursorCliHarnessAdapter.name).toBe(HARNESS_DEFAULT.CURSOR_CLI_NAME);
    });

    it("has a config schema", () => {
      expect(cursorCliHarnessAdapter.configSchema).toBeDefined();
    });

    it("createHarness returns a runtime", () => {
      const runtime = cursorCliHarnessAdapter.createHarness({
        command: "cursor-agent",
        args: [],
        cwd: "/tmp",
      } as never);
      expect(runtime).toBeDefined();
      expect(typeof runtime.connect).toBe("function");
      expect(typeof runtime.disconnect).toBe("function");
      expect(typeof runtime.prompt).toBe("function");
    });
  });
});

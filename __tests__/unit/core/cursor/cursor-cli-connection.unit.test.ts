import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Creates a mock ChildProcess that behaves like a real one */
function createMockProcess(options?: {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  pid?: number;
}): ChildProcess {
  const proc = new EventEmitter() as unknown as ChildProcess;
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  const stdinChunks: string[] = [];

  Object.assign(proc, {
    pid: options?.pid ?? 12345,
    killed: false,
    stdout: stdoutEmitter,
    stderr: stderrEmitter,
    stdin: {
      write: (data: string) => stdinChunks.push(data),
      end: () => {},
      writable: true,
    },
    kill: vi.fn(() => {
      (proc as unknown as Record<string, boolean>).killed = true;
    }),
    _stdinChunks: stdinChunks,
  });

  // Simulate async completion
  setTimeout(() => {
    if (options?.stdout) {
      stdoutEmitter.emit("data", Buffer.from(options.stdout));
    }
    if (options?.stderr) {
      stderrEmitter.emit("data", Buffer.from(options.stderr));
    }
    (proc as EventEmitter).emit("exit", options?.exitCode ?? 0, null);
  }, 10);

  return proc;
}

/** Creates a mock spawn function */
function createMockSpawn(processOptions?: Parameters<typeof createMockProcess>[0]) {
  return vi.fn(() => createMockProcess(processOptions));
}

describe("CursorCliConnection", () => {
  describe("constructor", () => {
    it("creates with default options", () => {
      const connection = new CursorCliConnection({
        spawnFn: createMockSpawn() as never,
      });
      expect(connection.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
      expect(connection.sessionId).toBeNull();
      expect(connection.isPromptActive).toBe(false);
    });

    it("accepts custom command", () => {
      const connection = new CursorCliConnection({
        command: "custom-agent",
        spawnFn: createMockSpawn() as never,
      });
      expect(connection).toBeDefined();
    });
  });

  describe("verifyInstallation", () => {
    it("returns installed when version command succeeds", async () => {
      const mockSpawn = createMockSpawn({ stdout: "2026.01.28-fd13201\n" });
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const result = await connection.verifyInstallation();
      expect(result.installed).toBe(true);
      expect(result.version).toBe("2026.01.28-fd13201");
    });

    it("returns not installed when command fails", async () => {
      const mockSpawn = vi.fn(() => {
        const proc = new EventEmitter() as unknown as ChildProcess;
        Object.assign(proc, {
          pid: 1,
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
        });
        setTimeout(() => {
          (proc as EventEmitter).emit("error", new Error("ENOENT"));
        }, 5);
        return proc;
      });

      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const result = await connection.verifyInstallation();
      expect(result.installed).toBe(false);
    });
  });

  describe("verifyAuth", () => {
    it("returns authenticated when status shows logged in", async () => {
      const mockSpawn = createMockSpawn({
        stdout: "\n ✓ Logged in as test@example.com\n",
      });
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const result = await connection.verifyAuth();
      expect(result.authenticated).toBe(true);
      expect(result.email).toBe("test@example.com");
    });

    it("returns not authenticated when status shows not logged in", async () => {
      const mockSpawn = createMockSpawn({ stdout: "Not logged in\n" });
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const result = await connection.verifyAuth();
      expect(result.authenticated).toBe(false);
    });
  });

  describe("listModels", () => {
    it("parses models output correctly", async () => {
      const mockSpawn = createMockSpawn({
        stdout: `Available models

auto - Auto
gpt-5.2 - GPT-5.2
opus-4.6-thinking - Claude 4.6 Opus (Thinking)  (current, default)

Tip: use --model <id> to switch.`,
      });
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const result = await connection.listModels();
      expect(result.models.length).toBeGreaterThanOrEqual(2);
      expect(result.defaultModel).toBe("opus-4.6-thinking");
      expect(result.currentModel).toBe("opus-4.6-thinking");
    });
  });

  describe("createSession", () => {
    it("creates a session and stores the ID", async () => {
      const sessionId = "3b7c621d-f306-4a54-81c7-aa5aada53618";
      const mockSpawn = createMockSpawn({ stdout: `${sessionId}\n` });
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const result = await connection.createSession();
      expect(result).toBe(sessionId);
      expect(connection.sessionId).toBe(sessionId);
    });

    it("throws on empty response", async () => {
      const mockSpawn = createMockSpawn({ stdout: "" });
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      await expect(connection.createSession()).rejects.toThrow("empty session ID");
    });
  });

  describe("connect / disconnect", () => {
    it("connects when binary and auth are valid", async () => {
      let callCount = 0;
      const mockSpawn = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // verifyInstallation
          return createMockProcess({ stdout: "2026.01.28\n" });
        }
        // verifyAuth
        return createMockProcess({ stdout: " ✓ Logged in as test@example.com\n" });
      });

      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const states: string[] = [];
      connection.on("state", (s) => states.push(s));

      await connection.connect();
      expect(connection.connectionStatus).toBe(CONNECTION_STATUS.CONNECTED);
      expect(states).toContain(CONNECTION_STATUS.CONNECTING);
      expect(states).toContain(CONNECTION_STATUS.CONNECTED);
    });

    it("fails to connect when binary missing", async () => {
      const mockSpawn = vi.fn(() => {
        const proc = new EventEmitter() as unknown as ChildProcess;
        Object.assign(proc, {
          pid: 1,
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
        });
        setTimeout(() => {
          (proc as EventEmitter).emit("error", new Error("ENOENT"));
        }, 5);
        return proc;
      });

      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      await expect(connection.connect()).rejects.toThrow("not found");
      expect(connection.connectionStatus).toBe(CONNECTION_STATUS.ERROR);
    });

    it("disconnects and clears state", async () => {
      let callCount = 0;
      const mockSpawn = vi.fn(() => {
        callCount++;
        if (callCount === 1) return createMockProcess({ stdout: "v1\n" });
        return createMockProcess({ stdout: " ✓ Logged in as test@example.com\n" });
      });

      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      await connection.connect();
      await connection.disconnect();

      expect(connection.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
      expect(connection.sessionId).toBeNull();
    });
  });

  describe("spawnPrompt", () => {
    it("spawns with correct args including stdin pipe", () => {
      const mockSpawn = createMockSpawn();
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      const { process: proc, parser } = connection.spawnPrompt({
        message: "Hello world",
      });

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const spawnCall = mockSpawn.mock.calls[0];
      expect(spawnCall).toBeDefined();
      const args = (spawnCall as unknown[])[1] as string[];

      expect(args).toContain("-p");
      expect(args).toContain("--output-format");
      expect(args).toContain("stream-json");
      expect(args).toContain("--stream-partial-output");
      expect(proc).toBeDefined();
      expect(parser).toBeDefined();
    });

    it("writes message to stdin", () => {
      const mockSpawn = createMockSpawn();
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({ message: "test prompt" });

      const proc = mockSpawn.mock.results[0]?.value;
      expect((proc as Record<string, string[]>)._stdinChunks).toContain("test prompt");
    });

    it("includes --resume when sessionId provided", () => {
      const mockSpawn = createMockSpawn();
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({
        message: "follow up",
        sessionId: "session-123",
      });

      const args = mockSpawn.mock.calls[0]?.[1] as string[];
      expect(args).toContain("--resume");
      expect(args).toContain("session-123");
    });

    it("includes --model when model provided", () => {
      const mockSpawn = createMockSpawn();
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({
        message: "test",
        model: "gpt-5.2",
      });

      const args = mockSpawn.mock.calls[0]?.[1] as string[];
      expect(args).toContain("--model");
      expect(args).toContain("gpt-5.2");
    });

    it("includes --mode when mode provided", () => {
      const mockSpawn = createMockSpawn();
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({
        message: "test",
        mode: "plan",
      });

      const args = mockSpawn.mock.calls[0]?.[1] as string[];
      expect(args).toContain("--mode");
      expect(args).toContain("plan");
    });

    it("includes --force when force is true", () => {
      const mockSpawn = createMockSpawn();
      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({
        message: "test",
        force: true,
      });

      const args = mockSpawn.mock.calls[0]?.[1] as string[];
      expect(args).toContain("--force");
    });

    it("throws when prompt already active", () => {
      const mockSpawn = vi.fn(() => {
        const proc = new EventEmitter() as unknown as ChildProcess;
        Object.assign(proc, {
          pid: 999,
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
          kill: vi.fn(),
        });
        // Don't auto-exit so prompt stays active
        return proc;
      });

      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({ message: "first" });
      expect(connection.isPromptActive).toBe(true);

      expect(() => connection.spawnPrompt({ message: "second" })).toThrow("already active");
    });
  });

  describe("killActiveProcess", () => {
    it("kills the active process", () => {
      const killFn = vi.fn();
      const mockSpawn = vi.fn(() => {
        const proc = new EventEmitter() as unknown as ChildProcess;
        Object.assign(proc, {
          pid: 999,
          killed: false,
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
          kill: killFn,
        });
        return proc;
      });

      const connection = new CursorCliConnection({
        spawnFn: mockSpawn as never,
      });

      connection.spawnPrompt({ message: "test" });
      connection.killActiveProcess();

      expect(killFn).toHaveBeenCalledWith("SIGTERM");
      expect(connection.isPromptActive).toBe(false);
    });
  });
});

import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { ENV_KEY } from "@/constants/env-keys";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CLI_AGENT_MODE, CLI_AGENT_SANDBOX_MODE } from "@/types/cli-agent.types";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";

interface SpawnScenario {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  error?: Error;
}

interface SpawnCall {
  command: string;
  args: string[];
  stdin: string;
}

const readFixture = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

const createMockChild = (
  scenario: SpawnScenario,
  onFinish: (stdin: string) => void
): ChildProcessWithoutNullStreams => {
  const emitter = new EventEmitter();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  let stdinCaptured = "";

  stdin.on("data", (chunk: Buffer | string) => {
    stdinCaptured += chunk.toString();
  });

  const child = Object.assign(emitter, {
    stdout,
    stderr,
    stdin,
    pid: Math.floor(Math.random() * 10000) + 1,
    kill: () => true,
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
  }) as unknown as ChildProcessWithoutNullStreams;

  setTimeout(() => {
    if (scenario.error) {
      child.emit("error", scenario.error);
      return;
    }

    if (scenario.stdout) {
      stdout.write(scenario.stdout);
    }
    if (scenario.stderr) {
      stderr.write(scenario.stderr);
    }
    stdout.end();
    stderr.end();
    onFinish(stdinCaptured);
    child.emit("close", scenario.exitCode ?? 0, scenario.signal ?? null);
  }, 0);

  return child;
};

const createSpawnFn = (scenarios: SpawnScenario[]) => {
  const calls: SpawnCall[] = [];
  const spawnFn = (command: string, args: string[]): ChildProcessWithoutNullStreams => {
    const scenario = scenarios.shift();
    if (!scenario) {
      throw new Error("No spawn scenario available");
    }
    const call: SpawnCall = { command, args: [...args], stdin: "" };
    calls.push(call);
    return createMockChild(scenario, (stdin) => {
      call.stdin = stdin;
    });
  };

  return { spawnFn, calls };
};

describe("CursorCliConnection", () => {
  it("runs prompt with NDJSON parsing and stdin piping", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/ndjson/hello-response.ndjson");
    const { spawnFn, calls } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({
      spawnFn,
      command: "cursor-agent",
    });

    const result = await connection.runPrompt({
      message: "say hello",
    });

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.sessionId).toBe("b423b428-a576-4c0c-ae1a-ef80457ba379");
    expect(result.resultText).toContain("how can I help you today?");
    expect(calls[0]?.args).toContain("-p");
    expect(calls[0]?.args).toContain("--output-format");
    expect(calls[0]?.args).toContain("stream-json");
    expect(calls[0]?.stdin).toBe("say hello\n");
  });

  it("parses create-chat output", async () => {
    const chatId = "3b7c621d-f306-4a54-81c7-aa5aada53618";
    const { spawnFn } = createSpawnFn([{ stdout: `${chatId}\n`, exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    await expect(connection.createChat()).resolves.toBe(chatId);
  });

  it("parses models output with default/current tags", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/models-output.txt");
    const { spawnFn } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const models = await connection.listModels();
    expect(models.models.length).toBeGreaterThan(0);
    expect(models.defaultModel).toBe("opus-4.6-thinking");
    expect(models.currentModel).toBe("opus-4.6-thinking");
  });

  it("parses status output for authenticated user", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/status-output.txt");
    const { spawnFn } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const status = await connection.verifyAuth();
    expect(status.authenticated).toBe(true);
    expect(status.email).toBe("netwearcdz@gmail.com");
  });

  it("parses about output through native about command", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/about-output.txt");
    const { spawnFn, calls } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const about = await connection.about();

    expect(about.cliVersion).toBe("2026.01.28-fd13201");
    expect(calls[0]?.args).toEqual(["about"]);
  });

  it("parses mcp list output through native mcp list command", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/mcp-list-output.txt");
    const { spawnFn, calls } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const servers = await connection.listMcpServers();

    expect(servers).toHaveLength(3);
    expect(servers[0]?.name).toBe("playwright");
    expect(calls[0]?.args).toEqual(["mcp", "list"]);
  });

  it("parses login command output", async () => {
    const { spawnFn, calls } = createSpawnFn([
      { stdout: "Authenticated as dev@example.com", exitCode: 0 },
    ]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const login = await connection.login();

    expect(login.success).toBe(true);
    expect(login.email).toBe("dev@example.com");
    expect(calls[0]?.args).toEqual(["login"]);
  });

  it("parses logout command output", async () => {
    const { spawnFn, calls } = createSpawnFn([{ stdout: "Logged out successfully", exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const logout = await connection.logout();

    expect(logout.success).toBe(true);
    expect(calls[0]?.args).toEqual(["logout"]);
  });

  it("returns empty sessions list for TTY-only ls output", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/ls-output.txt");
    const { spawnFn } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const sessions = await connection.listSessions();
    expect(sessions).toEqual([]);
  });

  it("reports installation missing when binary cannot be spawned", async () => {
    const spawnFn = (): ChildProcessWithoutNullStreams => {
      const error = Object.assign(new Error("spawn cursor-agent ENOENT"), { code: "ENOENT" });
      throw error;
    };
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });

    const installInfo = await connection.verifyInstallation();
    expect(installInfo.installed).toBe(false);
    expect(installInfo.binaryName).toBe("cursor-agent");
  });

  it("supports CURSOR_API_KEY via env constant", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/ndjson/hello-response.ndjson");
    const { spawnFn, calls } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({
      spawnFn,
      command: "cursor-agent",
      env: {
        [ENV_KEY.CURSOR_API_KEY]: "api-key-123",
      },
    });

    await connection.runPrompt({
      message: "hello",
    });

    expect(calls[0]?.args).toContain("--api-key");
    expect(calls[0]?.args).toContain("api-key-123");
  });

  it("passes prompt execution flags for mode/workspace/sandbox/browser/mcp approvals", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/ndjson/hello-response.ndjson");
    const { spawnFn, calls } = createSpawnFn([{ stdout: fixture, exitCode: 0 }]);
    const connection = new CursorCliConnection({
      spawnFn,
      command: "cursor-agent",
    });

    await connection.runPrompt({
      message: "hello",
      mode: CLI_AGENT_MODE.PLAN,
      workspacePath: "/workspace/repo",
      force: true,
      sandbox: CLI_AGENT_SANDBOX_MODE.ENABLED,
      browser: true,
      approveMcps: true,
      streaming: true,
    });

    const args = calls[0]?.args ?? [];
    expect(args).toContain("--mode");
    expect(args).toContain(CLI_AGENT_MODE.PLAN);
    expect(args).toContain("--workspace");
    expect(args).toContain("/workspace/repo");
    expect(args).toContain("--force");
    expect(args).toContain("--sandbox");
    expect(args).toContain(CLI_AGENT_SANDBOX_MODE.ENABLED);
    expect(args).toContain("--browser");
    expect(args).toContain("--approve-mcps");
  });

  it("reuses latest session id via --resume on follow-up prompts", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/ndjson/hello-response.ndjson");
    const { spawnFn, calls } = createSpawnFn([
      { stdout: fixture, exitCode: 0 },
      { stdout: fixture, exitCode: 0 },
    ]);
    const connection = new CursorCliConnection({
      spawnFn,
      command: "cursor-agent",
    });

    await connection.runPrompt({ message: "first prompt" });
    await connection.runPrompt({ message: "second prompt" });

    const secondArgs = calls[1]?.args ?? [];
    const resumeFlagIndex = secondArgs.indexOf("--resume");
    expect(resumeFlagIndex).toBeGreaterThanOrEqual(0);
    expect(secondArgs[resumeFlagIndex + 1]).toBe("b423b428-a576-4c0c-ae1a-ef80457ba379");
  });

  it("keeps command spawn p95 under target threshold", async () => {
    const fixture = readFixture("__tests__/fixtures/cursor/status-output.txt");
    const scenarios = Array.from({ length: CURSOR_LIMIT.SPAWN_PERF_SAMPLE_SIZE }, () => ({
      stdout: fixture,
      exitCode: 0,
    }));
    const { spawnFn } = createSpawnFn(scenarios);
    const connection = new CursorCliConnection({ spawnFn, command: "cursor-agent" });
    const latenciesMs: number[] = [];

    for (let index = 0; index < CURSOR_LIMIT.SPAWN_PERF_SAMPLE_SIZE; index += 1) {
      const start = Date.now();
      await connection.verifyAuth();
      latenciesMs.push(Date.now() - start);
    }

    const sorted = [...latenciesMs].sort((left, right) => left - right);
    const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    const p95 = sorted[p95Index] ?? 0;
    expect(p95).toBeLessThanOrEqual(CURSOR_LIMIT.SPAWN_P95_TARGET_MS);
  });
});

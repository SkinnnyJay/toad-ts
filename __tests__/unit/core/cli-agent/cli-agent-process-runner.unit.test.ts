import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { PassThrough } from "node:stream";
import { CliAgentProcessRunner } from "@/core/cli-agent/cli-agent-process-runner";
import { EventEmitter } from "eventemitter3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface SpawnScenario {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  error?: Error;
  holdOpen?: boolean;
}

interface SpawnCall {
  command: string;
  args: string[];
  stdin: string;
  envValue?: string;
  detached?: boolean;
  killSignals: NodeJS.Signals[];
}

const createMockChild = (
  scenario: SpawnScenario,
  onFinish: (stdin: string) => void,
  onKill: (signal: NodeJS.Signals) => void
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
    kill: (signal?: NodeJS.Signals) => {
      const parsedSignal = signal ?? "SIGTERM";
      onKill(parsedSignal);
      setTimeout(() => {
        child.emit("close", null, parsedSignal);
      }, 0);
      return true;
    },
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
  }) as unknown as ChildProcessWithoutNullStreams;

  setTimeout(() => {
    if (scenario.holdOpen) {
      return;
    }
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
  const spawnFn = (
    command: string,
    args: string[],
    options?: { env?: NodeJS.ProcessEnv; detached?: boolean }
  ): ChildProcessWithoutNullStreams => {
    const scenario = scenarios.shift();
    if (!scenario) {
      throw new Error("No spawn scenario available");
    }
    const call: SpawnCall = {
      command,
      args: [...args],
      stdin: "",
      envValue: options?.env?.TEST_RUNNER_ENV,
      detached: options?.detached,
      killSignals: [],
    };
    calls.push(call);
    return createMockChild(
      scenario,
      (stdin) => {
        call.stdin = stdin;
      },
      (signal) => {
        call.killSignals.push(signal);
      }
    );
  };
  return { spawnFn, calls };
};

describe("CliAgentProcessRunner", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("runs command with timeout-safe output capture", async () => {
    const { spawnFn, calls } = createSpawnFn([{ stdout: "ok", stderr: "warn", exitCode: 0 }]);
    const runner = new CliAgentProcessRunner({
      command: "agent",
      args: ["--base"],
      env: {},
      spawnFn,
      defaultCommandTimeoutMs: 50,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });

    const result = await runner.runCommand(["status"], { stdinText: "payload\n" });
    expect(result.stdout).toBe("ok");
    expect(result.stderr).toBe("warn");
    expect(calls[0]?.args).toEqual(["--base", "status"]);
    expect(calls[0]?.stdin).toBe("payload\n");
  });

  it("runs streaming command and forwards chunks", async () => {
    const { spawnFn } = createSpawnFn([
      { stdout: "chunk-1\nchunk-2\n", stderr: "err", exitCode: 0, signal: null },
    ]);
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      defaultCommandTimeoutMs: 50,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });
    const stdoutChunks: string[] = [];

    const result = await runner.runStreamingCommand(["-p"], {
      onStdout: (chunk) => stdoutChunks.push(chunk.toString()),
    });

    expect(stdoutChunks.join("")).toContain("chunk-1");
    expect(result.stderr).toBe("err");
    expect(result.exitCode).toBe(0);
  });

  it("times out long-running commands and triggers force-kill path", async () => {
    const { spawnFn } = createSpawnFn([{ holdOpen: true }]);
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      defaultCommandTimeoutMs: 1,
      forceKillTimeoutMs: 1,
      loggerName: "TestCliAgentProcessRunner",
    });

    await expect(runner.runCommand(["hang"])).rejects.toThrow("timed out");
  });

  it("escalates timeout termination from SIGTERM to SIGKILL when process remains alive", async () => {
    const { spawnFn } = createSpawnFn([{ holdOpen: true }]);
    const killTreeSignals: NodeJS.Signals[] = [];
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      killTreeFn: async (_pid, signal) => {
        killTreeSignals.push(signal);
      },
      defaultCommandTimeoutMs: 1,
      forceKillTimeoutMs: 1,
      loggerName: "TestCliAgentProcessRunner",
    });

    await expect(runner.runCommand(["hang"])).rejects.toThrow("timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(killTreeSignals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  it("applies env overrides to subsequent spawned commands", async () => {
    const { spawnFn, calls } = createSpawnFn([{ stdout: "ok", exitCode: 0 }]);
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      defaultCommandTimeoutMs: 50,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });
    runner.setEnv({ TEST_RUNNER_ENV: "on" });

    await runner.runCommand(["status"]);
    expect(calls[0]?.envValue).toBe("on");
  });

  it("uses detached process groups on posix and disables detach on windows", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    const posix = createSpawnFn([{ stdout: "ok", exitCode: 0 }]);
    const posixRunner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn: posix.spawnFn,
      defaultCommandTimeoutMs: 50,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });
    await posixRunner.runCommand(["status"]);
    expect(posix.calls[0]?.detached).toBe(true);

    Object.defineProperty(process, "platform", { value: "win32" });
    const windows = createSpawnFn([{ stdout: "ok", exitCode: 0 }]);
    const windowsRunner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn: windows.spawnFn,
      defaultCommandTimeoutMs: 50,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });
    await windowsRunner.runCommand(["status"]);
    expect(windows.calls[0]?.detached).toBe(false);
  });

  it("falls back to child kill when windows process-tree kill fails", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const { spawnFn, calls } = createSpawnFn([{ holdOpen: true }]);
    const killTreeCalls: Array<{ pid: number; signal: NodeJS.Signals }> = [];
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      killTreeFn: async (pid, signal) => {
        killTreeCalls.push({ pid, signal });
        throw new Error("taskkill unavailable");
      },
      defaultCommandTimeoutMs: 100,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });

    const command = runner.runStreamingCommand(["-p"]);
    await Promise.resolve();
    await runner.disconnect();
    const result = await command;

    expect(result.signal).toBe("SIGTERM");
    expect(killTreeCalls.length).toBe(1);
    expect(calls[0]?.killSignals).toEqual(["SIGTERM"]);
  });

  it("falls back to child kill when posix process-group kill fails", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    const { spawnFn, calls } = createSpawnFn([{ holdOpen: true }]);
    const killTreeCalls: Array<{ pid: number; signal: NodeJS.Signals }> = [];
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      killTreeFn: async (pid, signal) => {
        killTreeCalls.push({ pid, signal });
        throw new Error("group kill denied");
      },
      defaultCommandTimeoutMs: 100,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });

    const command = runner.runStreamingCommand(["-p"]);
    await Promise.resolve();
    await runner.disconnect();
    const result = await command;

    expect(result.signal).toBe("SIGTERM");
    expect(killTreeCalls.length).toBe(1);
    expect(calls[0]?.killSignals).toEqual(["SIGTERM"]);
  });

  it("detaches signal handlers after each streaming command lifecycle", async () => {
    const baselineSigintListeners = process.listenerCount("SIGINT");
    const baselineSigtermListeners = process.listenerCount("SIGTERM");
    const { spawnFn } = createSpawnFn([
      { stdout: "chunk-one", exitCode: 0 },
      { stdout: "chunk-two", exitCode: 0 },
    ]);
    const runner = new CliAgentProcessRunner({
      command: "agent",
      env: {},
      spawnFn,
      defaultCommandTimeoutMs: 50,
      forceKillTimeoutMs: 10,
      loggerName: "TestCliAgentProcessRunner",
    });

    await runner.runStreamingCommand(["-p"]);
    expect(process.listenerCount("SIGINT")).toBe(baselineSigintListeners);
    expect(process.listenerCount("SIGTERM")).toBe(baselineSigtermListeners);

    await runner.runStreamingCommand(["-p"]);
    expect(process.listenerCount("SIGINT")).toBe(baselineSigintListeners);
    expect(process.listenerCount("SIGTERM")).toBe(baselineSigtermListeners);
  });
});

import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { PassThrough } from "node:stream";
import { CliAgentProcessRunner } from "@/core/cli-agent/cli-agent-process-runner";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";

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
}

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
    options?: { env?: NodeJS.ProcessEnv }
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
    };
    calls.push(call);
    return createMockChild(scenario, (stdin) => {
      call.stdin = stdin;
    });
  };
  return { spawnFn, calls };
};

describe("CliAgentProcessRunner", () => {
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
});

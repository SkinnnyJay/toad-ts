import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { PassThrough } from "node:stream";

import { SIGNAL } from "@/constants/signals";
import { ShellSessionManager } from "@/tools/shell-session";
import { EnvManager } from "@/utils/env/env.utils";
import { EventEmitter } from "eventemitter3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface SpawnController {
  spawnFn: (
    command: string,
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean }
  ) => ChildProcessWithoutNullStreams;
  killSignals: NodeJS.Signals[];
  stdinPayloads: string[];
}

interface SpawnControllerOptions {
  autoRespond: boolean;
  splitSentinel?: boolean;
}

const SENTINEL_REGEX = /echo (__TOADSTOOL_CMD_END__[A-Za-z0-9_-]+):%errorlevel%/;
const DISPOSE_ERROR_MESSAGE = "Shell session disposed.";

const createSpawnController = (options: SpawnControllerOptions): SpawnController => {
  const killSignals: NodeJS.Signals[] = [];
  const stdinPayloads: string[] = [];

  const spawnFn = (
    _command: string,
    _args: string[],
    _options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean }
  ): ChildProcessWithoutNullStreams => {
    const emitter = new EventEmitter();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const stdin = new PassThrough();
    let isKilled = false;

    stdin.on("data", (chunk: Buffer | string) => {
      const payload = chunk.toString();
      stdinPayloads.push(payload);
      if (!options.autoRespond) {
        return;
      }
      const sentinelMatch = payload.match(SENTINEL_REGEX);
      const sentinel = sentinelMatch?.[1];
      if (!sentinel) {
        return;
      }
      setTimeout(() => {
        if (options.splitSentinel) {
          const splitIndex = Math.max(Math.floor(sentinel.length / 2), 1);
          const left = sentinel.slice(0, splitIndex);
          const right = sentinel.slice(splitIndex);
          stdout.write(`command output\r\n${left}`);
          setTimeout(() => {
            stdout.write(`${right}:0\r\n`);
          }, 0);
          return;
        }
        stdout.write(`command output\r\n${sentinel}:0\r\n`);
      }, 0);
    });

    const child = Object.assign(emitter, {
      stdout,
      stderr,
      stdin,
      pid: 1234,
      get killed() {
        return isKilled;
      },
      kill: (signal?: NodeJS.Signals): boolean => {
        const parsedSignal = signal ?? SIGNAL.SIGTERM;
        killSignals.push(parsedSignal);
        isKilled = true;
        setTimeout(() => {
          emitter.emit("exit", null, parsedSignal);
        }, 0);
        return true;
      },
      on: emitter.on.bind(emitter),
      once: emitter.once.bind(emitter),
      emit: emitter.emit.bind(emitter),
    }) as unknown as ChildProcessWithoutNullStreams;

    stdout.setEncoding("utf8");
    stderr.setEncoding("utf8");
    return child;
  };

  return { spawnFn, killSignals, stdinPayloads };
};

describe("ShellSessionManager", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPlatform = process.platform;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    Object.defineProperty(process, "platform", { value: "win32" });
    EnvManager.resetInstance();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(process, "platform", { value: originalPlatform });
    EnvManager.resetInstance();
  });

  it("hard-terminates windows cmd sessions during dispose", async () => {
    const controller = createSpawnController({ autoRespond: true });
    const manager = new ShellSessionManager({ spawnFn: controller.spawnFn, env: {} });

    const result = await manager.execute("echo hard teardown");
    expect(result.exitCode).toBe(0);

    manager.dispose();

    expect(controller.killSignals).toEqual([SIGNAL.SIGTERM, SIGNAL.SIGKILL]);
  });

  it("rejects an active command when session is disposed", async () => {
    const controller = createSpawnController({ autoRespond: false });
    const manager = new ShellSessionManager({ spawnFn: controller.spawnFn, env: {} });

    const activeCommand = manager.execute("echo pending");
    await Promise.resolve();
    manager.dispose();

    await expect(activeCommand).rejects.toThrow(DISPOSE_ERROR_MESSAGE);
    expect(controller.killSignals).toEqual([SIGNAL.SIGTERM, SIGNAL.SIGKILL]);
  });

  it("rejects queued commands when session is disposed", async () => {
    const controller = createSpawnController({ autoRespond: false });
    const manager = new ShellSessionManager({ spawnFn: controller.spawnFn, env: {} });

    const activeCommand = manager.execute("echo first");
    const queuedCommand = manager.execute("echo second");
    await Promise.resolve();
    manager.dispose();

    await expect(activeCommand).rejects.toThrow(DISPOSE_ERROR_MESSAGE);
    await expect(queuedCommand).rejects.toThrow(DISPOSE_ERROR_MESSAGE);
    expect(controller.killSignals).toEqual([SIGNAL.SIGTERM, SIGNAL.SIGKILL]);
  });

  it("rejects sibling absolute cwd that only shares prefix with base", async () => {
    const controller = createSpawnController({ autoRespond: true });
    const manager = new ShellSessionManager({
      spawnFn: controller.spawnFn,
      env: {},
      baseDir: "/tmp/base",
      allowEscape: false,
    });

    await expect(
      manager.execute("echo blocked", {
        cwd: "/tmp/base-sibling",
      })
    ).rejects.toThrow("Cwd escapes base directory");
    manager.dispose();
  });

  it("quotes windows cwd changes with shell metacharacters and unicode", async () => {
    const controller = createSpawnController({ autoRespond: true });
    const manager = new ShellSessionManager({
      spawnFn: controller.spawnFn,
      env: {},
      baseDir: "/tmp",
      allowEscape: false,
    });

    await manager.execute("echo quoted", {
      cwd: "/tmp/path with spaces/and&caret^/ユニコード",
    });

    const joinedPayload = controller.stdinPayloads.join("");
    expect(joinedPayload).toContain('cd /d "/tmp/path with spaces/and&caret^/ユニコード"');
    manager.dispose();
  });

  it("isolates command cwd per request without reusing prior cwd", async () => {
    const controller = createSpawnController({ autoRespond: true });
    const manager = new ShellSessionManager({
      spawnFn: controller.spawnFn,
      env: {},
      baseDir: "/tmp/base",
      allowEscape: false,
    });

    await manager.execute("echo first", { cwd: "/tmp/base/nested" });
    await manager.execute("echo second");

    const joinedPayload = controller.stdinPayloads.join("");
    expect(joinedPayload).toContain('cd /d "/tmp/base/nested"');
    expect(joinedPayload).toContain('cd /d "/tmp/base"');
    manager.dispose();
  });

  it("detects completion when sentinel marker is split across stdout chunks", async () => {
    const controller = createSpawnController({ autoRespond: true, splitSentinel: true });
    const manager = new ShellSessionManager({ spawnFn: controller.spawnFn, env: {} });

    const result = await manager.execute("echo split");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("command output");
    manager.dispose();
  });
});

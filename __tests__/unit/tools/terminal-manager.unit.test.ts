import { describe, expect, it, vi } from "vitest";

import { TerminalManager } from "@/tools/terminal-manager";
import { EnvManager } from "@/utils/env/env.utils";

const LONG_RUNNING_SCRIPT = "setTimeout(() => {}, 5000);";

describe("TerminalManager session retention", () => {
  it("evicts completed sessions when capacity is reached", async () => {
    const manager = new TerminalManager({ allowEscape: true, maxSessions: 1 });
    const firstSession = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('first')"],
    });
    await manager.waitForExit(firstSession);

    const secondSession = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('second')"],
    });
    const secondOutput = await manager.waitForExit(secondSession);

    expect(secondOutput.output).toContain("second");
    expect(() => manager.getOutput(firstSession)).toThrow("Terminal not found");

    manager.release(secondSession);
  });

  it("throws when capacity is reached and no completed sessions can be evicted", async () => {
    const manager = new TerminalManager({ allowEscape: true, maxSessions: 1 });
    const firstSession = manager.createSession({
      command: process.execPath,
      args: ["-e", LONG_RUNNING_SCRIPT],
    });

    expect(() =>
      manager.createSession({
        command: process.execPath,
        args: ["-e", "process.stdout.write('blocked')"],
      })
    ).toThrow("Terminal session limit reached");

    manager.kill(firstSession);
    await manager.waitForExit(firstSession);
    manager.release(firstSession);
  });

  it("evicts the oldest completed session while preserving active sessions", async () => {
    const manager = new TerminalManager({ allowEscape: true, maxSessions: 2 });
    const activeSession = manager.createSession({
      command: process.execPath,
      args: ["-e", LONG_RUNNING_SCRIPT],
    });
    const completedSession = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('done')"],
    });
    await manager.waitForExit(completedSession);

    const replacementSession = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('replacement')"],
    });
    await manager.waitForExit(replacementSession);

    expect(() => manager.getOutput(completedSession)).toThrow("Terminal not found");
    expect(() => manager.getOutput(activeSession)).not.toThrow();
    expect(manager.getOutput(replacementSession).output).toContain("replacement");

    manager.kill(activeSession);
    await manager.waitForExit(activeSession);
    manager.release(activeSession);
    manager.release(replacementSession);
  });
});

describe("TerminalManager path escape detection", () => {
  it("rejects windows-style command path escapes when escape is disallowed", () => {
    const manager = new TerminalManager({ allowEscape: false });
    expect(() =>
      manager.createSession({
        command: "..\\evil",
      })
    ).toThrow("path escape");
  });

  it("rejects mixed-separator argument path escapes when escape is disallowed", () => {
    const manager = new TerminalManager({ allowEscape: false });
    expect(() =>
      manager.createSession({
        command: process.execPath,
        args: ["..\\nested/../evil"],
      })
    ).toThrow("path escape");
  });

  it("rejects sibling absolute cwd that only shares prefix with base", () => {
    const manager = new TerminalManager({ baseDir: "/tmp/base", allowEscape: false });
    expect(() =>
      manager.createSession({
        command: process.execPath,
        args: ["-e", "process.stdout.write('ok')"],
        cwd: "/tmp/base-sibling",
      })
    ).toThrow("Cwd escapes base directory");
  });
});

describe("TerminalManager output byte trimming", () => {
  it("trims output in O(n)-safe byte slices", async () => {
    const manager = new TerminalManager({ allowEscape: true });
    const sessionId = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('abcdef')"],
      outputByteLimit: 3,
    });
    const output = await manager.waitForExit(sessionId);

    expect(output.output).toBe("def");
    expect(output.truncated).toBe(true);
    manager.release(sessionId);
  });

  it("preserves UTF-8 boundaries while trimming bytes", async () => {
    const manager = new TerminalManager({ allowEscape: true });
    const sessionId = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('😀abc')"],
      outputByteLimit: 5,
    });
    const output = await manager.waitForExit(sessionId);

    expect(output.output).toBe("abc");
    expect(output.output).not.toContain("�");
    expect(output.truncated).toBe(true);
    manager.release(sessionId);
  });
});

describe("TerminalManager env snapshot usage", () => {
  it("avoids repeated env snapshot merges per session creation", async () => {
    EnvManager.resetInstance();
    const envManager = EnvManager.getInstance();
    const snapshotSpy = vi.spyOn(envManager, "getSnapshot");
    const manager = new TerminalManager({ allowEscape: true, env: {} });

    const firstSession = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('one')"],
    });
    const secondSession = manager.createSession({
      command: process.execPath,
      args: ["-e", "process.stdout.write('two')"],
    });

    await manager.waitForExit(firstSession);
    await manager.waitForExit(secondSession);
    manager.release(firstSession);
    manager.release(secondSession);

    expect(snapshotSpy).toHaveBeenCalledTimes(1);
    snapshotSpy.mockRestore();
  });
});

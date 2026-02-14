import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";

import { LIMIT } from "@/config/limits";
import { ENV_KEY } from "@/constants/env-keys";
import { copyToClipboard } from "@/utils/clipboard/clipboard.utils";
import { EnvManager } from "@/utils/env/env.utils";
import { EventEmitter } from "eventemitter3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

interface SpawnScenario {
  exitCode?: number;
  emitError?: boolean;
  autoClose?: boolean;
  closeDelayMs?: number;
}

const createMockClipboardChild = (scenario: SpawnScenario): ChildProcessWithoutNullStreams => {
  const emitter = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  const child = Object.assign(emitter, {
    stdin,
    stdout,
    stderr,
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
    kill: vi.fn(() => true),
  }) as unknown as ChildProcessWithoutNullStreams;

  if (scenario.autoClose !== false) {
    setTimeout(() => {
      if (scenario.emitError) {
        child.emit("error", new Error("spawn failed"));
        return;
      }
      child.emit("close", scenario.exitCode ?? 0);
    }, scenario.closeDelayMs ?? 0);
  }

  return child;
};

describe("copyToClipboard", () => {
  const originalPlatform = process.platform;
  const originalDisplay = process.env[ENV_KEY.DISPLAY];
  const originalWaylandDisplay = process.env[ENV_KEY.WAYLAND_DISPLAY];
  const originalSessionType = process.env[ENV_KEY.XDG_SESSION_TYPE];

  const restoreEnvValue = (key: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(process, "platform", { value: "linux" });
    delete process.env[ENV_KEY.DISPLAY];
    delete process.env[ENV_KEY.WAYLAND_DISPLAY];
    delete process.env[ENV_KEY.XDG_SESSION_TYPE];
    EnvManager.resetInstance();
    vi.mocked(spawn).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(process, "platform", { value: originalPlatform });
    restoreEnvValue(ENV_KEY.DISPLAY, originalDisplay);
    restoreEnvValue(ENV_KEY.WAYLAND_DISPLAY, originalWaylandDisplay);
    restoreEnvValue(ENV_KEY.XDG_SESSION_TYPE, originalSessionType);
    EnvManager.resetInstance();
  });

  it("prefers wl-copy on wayland sessions", async () => {
    process.env[ENV_KEY.WAYLAND_DISPLAY] = "wayland-1";
    EnvManager.resetInstance();
    vi.mocked(spawn).mockImplementation(() => createMockClipboardChild({ exitCode: 0 }));

    const copiedPromise = copyToClipboard("hello wayland");
    await vi.runAllTimersAsync();
    const copied = await copiedPromise;

    expect(copied).toBe(true);
    expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      "wl-copy",
      [],
      expect.objectContaining({ stdio: ["pipe", "ignore", "ignore"] })
    );
  });

  it("falls back from xclip to xsel on x11 sessions", async () => {
    process.env[ENV_KEY.DISPLAY] = ":0";
    EnvManager.resetInstance();
    vi.mocked(spawn)
      .mockImplementationOnce(() => createMockClipboardChild({ exitCode: 1 }))
      .mockImplementationOnce(() => createMockClipboardChild({ exitCode: 0 }));

    const copiedPromise = copyToClipboard("hello x11");
    await vi.runAllTimersAsync();
    const copied = await copiedPromise;

    expect(copied).toBe(true);
    expect(vi.mocked(spawn)).toHaveBeenNthCalledWith(
      1,
      "xclip",
      ["-selection", "clipboard"],
      expect.objectContaining({ stdio: ["pipe", "ignore", "ignore"] })
    );
    expect(vi.mocked(spawn)).toHaveBeenNthCalledWith(
      2,
      "xsel",
      ["--clipboard", "--input"],
      expect.objectContaining({ stdio: ["pipe", "ignore", "ignore"] })
    );
  });

  it("returns false without spawning commands in headless linux sessions", async () => {
    EnvManager.resetInstance();

    const copied = await copyToClipboard("headless");

    expect(copied).toBe(false);
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
  });

  it("returns false without spawning when text exceeds clipboard byte limit", async () => {
    process.env[ENV_KEY.WAYLAND_DISPLAY] = "wayland-1";
    EnvManager.resetInstance();

    const copied = await copyToClipboard("x".repeat(LIMIT.CLIPBOARD_PIPE_MAX_BYTES + 1));

    expect(copied).toBe(false);
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
  });

  it("kills stalled clipboard child processes after timeout", async () => {
    process.env[ENV_KEY.WAYLAND_DISPLAY] = "wayland-1";
    EnvManager.resetInstance();
    const child = createMockClipboardChild({ autoClose: false });
    vi.mocked(spawn).mockImplementation(() => child);

    const copyPromise = copyToClipboard("stalled");
    await vi.advanceTimersByTimeAsync(LIMIT.CLIPBOARD_PIPE_TIMEOUT_MS);

    await expect(copyPromise).resolves.toBe(false);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});

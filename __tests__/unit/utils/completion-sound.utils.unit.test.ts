import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";

import {
  playCompletionSound,
  resetCompletionSoundStateForTests,
} from "@/utils/sound/completion-sound.utils";
import { EventEmitter } from "eventemitter3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const createMockSoundChild = (): ChildProcess => {
  const emitter = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  return Object.assign(emitter, {
    stdin,
    stdout,
    stderr,
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
    unref: vi.fn(),
    exitCode: null,
    signalCode: null,
  }) as unknown as ChildProcess;
};

describe("completion sound utility", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    resetCompletionSoundStateForTests();
    vi.mocked(spawn).mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    resetCompletionSoundStateForTests();
  });

  it("does not spawn sound process on non-macOS platforms", () => {
    Object.defineProperty(process, "platform", { value: "linux" });

    playCompletionSound();

    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
  });

  it("prevents parallel afplay process accumulation", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    const firstChild = createMockSoundChild();
    const secondChild = createMockSoundChild();

    vi.mocked(spawn)
      .mockImplementationOnce(() => firstChild)
      .mockImplementationOnce(() => secondChild);

    playCompletionSound();
    playCompletionSound();

    expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);

    firstChild.emit("close", 0, null);
    playCompletionSound();

    expect(vi.mocked(spawn)).toHaveBeenCalledTimes(2);
  });
});

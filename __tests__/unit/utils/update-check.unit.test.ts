import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isNewerVersion,
  resetUpdateCheckSchedulerForTests,
  scheduleUpdateCheck,
} from "@/utils/update-check";

describe("update-check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetUpdateCheckSchedulerForTests();
  });

  afterEach(() => {
    resetUpdateCheckSchedulerForTests();
    vi.useRealTimers();
  });

  it("detects newer versions", () => {
    expect(isNewerVersion("1.2.0", "1.1.9")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("returns false for equal or older versions", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
  });

  it("schedules background update checks without duplicate in-flight runs", async () => {
    let resolveRun: (() => void) | null = null;
    const runCheck = vi.fn(
      async () =>
        await new Promise<void>((resolve) => {
          resolveRun = resolve;
        })
    );

    scheduleUpdateCheck(runCheck);
    scheduleUpdateCheck(runCheck);
    expect(runCheck).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(0);
    expect(runCheck).toHaveBeenCalledTimes(1);
    expect(resolveRun).not.toBeNull();

    scheduleUpdateCheck(runCheck);
    expect(runCheck).toHaveBeenCalledTimes(1);
    resolveRun?.();
  });

  it("allows a new scheduled update check after previous completion", async () => {
    const runCheck = vi.fn(async () => {});

    scheduleUpdateCheck(runCheck);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    scheduleUpdateCheck(runCheck);
    await vi.advanceTimersByTimeAsync(0);
    expect(runCheck).toHaveBeenCalledTimes(2);
  });

  it("swallows scheduler errors and clears in-flight state", async () => {
    const runCheck = vi.fn<() => Promise<void>>().mockImplementation(async () => {
      throw new Error("simulated update failure");
    });

    scheduleUpdateCheck(runCheck);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    scheduleUpdateCheck(runCheck);
    await vi.advanceTimersByTimeAsync(0);

    expect(runCheck).toHaveBeenCalledTimes(2);
  });
});

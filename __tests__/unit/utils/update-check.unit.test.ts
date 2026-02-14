import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENCODING } from "@/constants/encodings";
import { FILE_PATH } from "@/constants/file-paths";
import { INDENT_SPACES } from "@/constants/json-format";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/package-info", () => ({
  loadPackageInfo: vi.fn(async () => ({
    name: "toadstool-test",
    version: "1.0.0",
  })),
}));

import {
  checkForUpdates,
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

  it("caches failed runtime checks to avoid repeated fetches", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn(async () => ({ ok: false }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const cacheDir = path.join(process.cwd(), FILE_PATH.TOADSTOOL_DIR);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      path.join(cacheDir, FILE_PATH.UPDATE_CACHE_JSON),
      JSON.stringify({ lastChecked: 0, latestVersion: "0.0.0" }, null, INDENT_SPACES),
      ENCODING.UTF8
    );

    try {
      await checkForUpdates();
      await checkForUpdates();
    } finally {
      global.fetch = originalFetch;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

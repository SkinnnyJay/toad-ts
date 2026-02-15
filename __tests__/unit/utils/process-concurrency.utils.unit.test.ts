import { spawn } from "node:child_process";

import { LIMIT } from "@/config/limits";
import {
  acquireProcessSlot,
  bindProcessSlotToChild,
  getActiveProcessCount,
  resetProcessConcurrencyForTests,
} from "@/utils/process-concurrency.utils";
import { afterEach, describe, expect, it } from "vitest";

describe("process concurrency utility", () => {
  afterEach(() => {
    resetProcessConcurrencyForTests();
  });

  it("enforces global process concurrency limit", () => {
    const releases: Array<() => void> = [];

    for (let index = 0; index < LIMIT.PROCESS_CONCURRENCY_MAX; index += 1) {
      releases.push(acquireProcessSlot(`test-${index}`));
    }

    expect(() => acquireProcessSlot("overflow")).toThrow(
      "Global process concurrency limit reached"
    );
    expect(getActiveProcessCount()).toBe(LIMIT.PROCESS_CONCURRENCY_MAX);

    const release = releases.pop();
    release?.();
    expect(getActiveProcessCount()).toBe(LIMIT.PROCESS_CONCURRENCY_MAX - 1);

    const finalRelease = acquireProcessSlot("replacement");
    expect(getActiveProcessCount()).toBe(LIMIT.PROCESS_CONCURRENCY_MAX);

    for (const free of releases) {
      free();
    }
    finalRelease();
  });

  it("releases a slot when child process closes", async () => {
    const release = acquireProcessSlot("child-process");
    const child = spawn(process.execPath, ["-e", "process.exit(0)"]);
    bindProcessSlotToChild(child, release);

    await new Promise<void>((resolve, reject) => {
      child.once("close", () => resolve());
      child.once("error", (error) => reject(error));
    });

    expect(getActiveProcessCount()).toBe(0);
  });
});

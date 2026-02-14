import type { ChildProcess } from "node:child_process";

import { LIMIT } from "@/config/limits";

const PROCESS_CONCURRENCY_ERROR = {
  LIMIT_REACHED: "Global process concurrency limit reached",
} as const;

let activeProcessCount = 0;

export const acquireProcessSlot = (operation: string): (() => void) => {
  if (activeProcessCount >= LIMIT.PROCESS_CONCURRENCY_MAX) {
    throw new Error(
      `${PROCESS_CONCURRENCY_ERROR.LIMIT_REACHED} (${LIMIT.PROCESS_CONCURRENCY_MAX}) for ${operation}`
    );
  }
  activeProcessCount += 1;

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    activeProcessCount = Math.max(activeProcessCount - 1, 0);
  };
};

export const bindProcessSlotToChild = (child: ChildProcess, releaseSlot: () => void): void => {
  child.once("error", releaseSlot);
  child.once("close", releaseSlot);
};

export const getActiveProcessCount = (): number => activeProcessCount;

export const resetProcessConcurrencyForTests = (): void => {
  activeProcessCount = 0;
};

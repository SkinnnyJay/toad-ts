import { type ChildProcess, spawn } from "node:child_process";

import { PLATFORM } from "@/constants/platform";
import { SYSTEM_SOUND } from "@/constants/system-sounds";

/**
 * Plays the default completion sound (macOS Frog) when a chat response finishes.
 * No-op on non-macOS; fire-and-forget, does not block.
 */
export function playCompletionSound(): void {
  if (process.platform !== PLATFORM.DARWIN) {
    return;
  }
  if (activeCompletionSound && !isChildExited(activeCompletionSound)) {
    return;
  }

  const child = spawn("afplay", [SYSTEM_SOUND.MACOS_FROG], {
    stdio: "ignore",
    detached: false,
  });
  activeCompletionSound = child;

  const clearActiveChild = (): void => {
    if (activeCompletionSound === child) {
      activeCompletionSound = null;
    }
  };

  child.once("error", clearActiveChild);
  child.once("close", clearActiveChild);
  child.unref();
}

let activeCompletionSound: ChildProcess | null = null;

const isChildExited = (child: ChildProcess): boolean =>
  child.exitCode !== null || child.signalCode !== null;

export const resetCompletionSoundStateForTests = (): void => {
  activeCompletionSound = null;
};

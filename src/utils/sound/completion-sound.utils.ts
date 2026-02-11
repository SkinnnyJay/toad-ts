import { spawn } from "node:child_process";

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
  const child = spawn("afplay", [SYSTEM_SOUND.MACOS_FROG], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
}

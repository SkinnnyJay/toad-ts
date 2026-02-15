import { spawn } from "node:child_process";
import { LIMIT } from "@/config/limits";
import { LINUX_DESKTOP_CAPABILITY } from "@/constants/linux-desktop-capabilities";

import { PLATFORM } from "@/constants/platform";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import { detectLinuxDesktopCapability } from "@/utils/linux-desktop-capability.utils";

const CLIPBOARD_COMMAND = {
  PBCOPY: "pbcopy",
  CLIP: "clip",
  WLCOPY: "wl-copy",
  XCLIP: "xclip",
  XSEL: "xsel",
} as const;

export interface ClipboardCommandSpec {
  command: string;
  args: string[];
}

const CLIPBOARD_COMMAND_STRATEGY = {
  DARWIN: [{ command: CLIPBOARD_COMMAND.PBCOPY, args: [] }],
  WINDOWS: [{ command: CLIPBOARD_COMMAND.CLIP, args: [] }],
  LINUX_WAYLAND: [{ command: CLIPBOARD_COMMAND.WLCOPY, args: [] }],
  LINUX_X11: [
    { command: CLIPBOARD_COMMAND.XCLIP, args: ["-selection", "clipboard"] },
    { command: CLIPBOARD_COMMAND.XSEL, args: ["--clipboard", "--input"] },
  ],
} as const satisfies Record<string, ClipboardCommandSpec[]>;

export const resolveClipboardCommandChain = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot(),
  platform: NodeJS.Platform = process.platform
): ClipboardCommandSpec[] => {
  if (platform === PLATFORM.DARWIN) {
    return [...CLIPBOARD_COMMAND_STRATEGY.DARWIN];
  }
  if (platform === PLATFORM.WIN32) {
    return [...CLIPBOARD_COMMAND_STRATEGY.WINDOWS];
  }

  const desktop = detectLinuxDesktopCapability(env, platform);
  if (desktop.capability === LINUX_DESKTOP_CAPABILITY.HEADLESS) {
    return [];
  }

  const commands: ClipboardCommandSpec[] = [];
  if (desktop.hasWayland) {
    commands.push(...CLIPBOARD_COMMAND_STRATEGY.LINUX_WAYLAND);
  }
  if (desktop.hasX11) {
    commands.push(...CLIPBOARD_COMMAND_STRATEGY.LINUX_X11);
  }

  return commands;
};

export const isClipboardCopySupported = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot(),
  platform: NodeJS.Platform = process.platform
): boolean => resolveClipboardCommandChain(env, platform).length > 0;

const tryClipboardCommand = async (
  command: string,
  args: string[],
  text: string
): Promise<boolean> =>
  new Promise((resolve) => {
    if (Buffer.byteLength(text, "utf8") > LIMIT.CLIPBOARD_PIPE_MAX_BYTES) {
      resolve(false);
      return;
    }

    const child = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] });
    let settled = false;

    const resolveOnce = (result: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(stallTimeout);
      resolve(result);
    };

    const stallTimeout = setTimeout(() => {
      child.kill(SIGNAL.SIGTERM);
      resolveOnce(false);
    }, LIMIT.CLIPBOARD_PIPE_TIMEOUT_MS);
    stallTimeout.unref();

    child.on("error", () => resolveOnce(false));
    child.on("close", (code) => resolveOnce(code === 0));
    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    } else {
      resolveOnce(false);
    }
  });

export const copyToClipboard = async (text: string): Promise<boolean> => {
  const commands = resolveClipboardCommandChain();
  for (const { command, args } of commands) {
    const success = await tryClipboardCommand(command, args, text);
    if (success) {
      return true;
    }
  }
  return false;
};

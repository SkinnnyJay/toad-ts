import { spawn } from "node:child_process";
import { LIMIT } from "@/config/limits";
import { LINUX_DESKTOP_CAPABILITY } from "@/constants/linux-desktop-capabilities";
import { PLATFORM } from "@/constants/platform";
import {
  CLIPBOARD_COMMAND_NAME,
  CLIPBOARD_FALLBACK_PRECEDENCE,
  type ClipboardCommandName,
} from "@/constants/platform-fallback-precedence";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import { detectLinuxDesktopCapability } from "@/utils/linux-desktop-capability.utils";

export interface ClipboardCommandSpec {
  command: string;
  args: string[];
}

const CLIPBOARD_COMMAND_ARGS: Record<ClipboardCommandName, string[]> = {
  [CLIPBOARD_COMMAND_NAME.PBCOPY]: [],
  [CLIPBOARD_COMMAND_NAME.CLIP]: [],
  [CLIPBOARD_COMMAND_NAME.WLCOPY]: [],
  [CLIPBOARD_COMMAND_NAME.XCLIP]: ["-selection", "clipboard"],
  [CLIPBOARD_COMMAND_NAME.XSEL]: ["--clipboard", "--input"],
};

const toClipboardSpecs = (commands: readonly ClipboardCommandName[]): ClipboardCommandSpec[] =>
  commands.map((command) => ({
    command,
    args: [...CLIPBOARD_COMMAND_ARGS[command]],
  }));

export const resolveClipboardCommandChain = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot(),
  platform: NodeJS.Platform = process.platform
): ClipboardCommandSpec[] => {
  if (platform === PLATFORM.DARWIN) {
    return toClipboardSpecs(CLIPBOARD_FALLBACK_PRECEDENCE.DARWIN);
  }
  if (platform === PLATFORM.WIN32) {
    return toClipboardSpecs(CLIPBOARD_FALLBACK_PRECEDENCE.WINDOWS);
  }

  const desktop = detectLinuxDesktopCapability(env, platform);
  if (desktop.capability === LINUX_DESKTOP_CAPABILITY.HEADLESS) {
    return [];
  }

  const commands: ClipboardCommandSpec[] = [];
  if (desktop.hasWayland) {
    commands.push(...toClipboardSpecs(CLIPBOARD_FALLBACK_PRECEDENCE.LINUX_WAYLAND));
  }
  if (desktop.hasX11) {
    commands.push(...toClipboardSpecs(CLIPBOARD_FALLBACK_PRECEDENCE.LINUX_X11));
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

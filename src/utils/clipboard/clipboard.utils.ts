import { spawn } from "node:child_process";
import { LIMIT } from "@/config/limits";

import { ENV_KEY } from "@/constants/env-keys";
import { PLATFORM } from "@/constants/platform";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";

const CLIPBOARD_COMMAND = {
  PBCOPY: "pbcopy",
  CLIP: "clip",
  WLCOPY: "wl-copy",
  XCLIP: "xclip",
  XSEL: "xsel",
} as const;

const LINUX_SESSION_TYPE = {
  WAYLAND: "wayland",
} as const;

const buildClipboardCommands = (): Array<{ command: string; args: string[] }> => {
  if (process.platform === PLATFORM.DARWIN) {
    return [{ command: CLIPBOARD_COMMAND.PBCOPY, args: [] }];
  }
  if (process.platform === PLATFORM.WIN32) {
    return [{ command: CLIPBOARD_COMMAND.CLIP, args: [] }];
  }
  const env = EnvManager.getInstance().getSnapshot();
  const sessionType = (env[ENV_KEY.XDG_SESSION_TYPE] ?? "").trim().toLowerCase();
  const hasWayland =
    (env[ENV_KEY.WAYLAND_DISPLAY] ?? "").trim().length > 0 ||
    sessionType === LINUX_SESSION_TYPE.WAYLAND;
  const hasX11 = (env[ENV_KEY.DISPLAY] ?? "").trim().length > 0;
  if (!hasWayland && !hasX11) {
    return [];
  }

  const commands: Array<{ command: string; args: string[] }> = [];
  if (hasWayland) {
    commands.push({ command: CLIPBOARD_COMMAND.WLCOPY, args: [] });
  }
  if (hasX11) {
    commands.push(
      { command: CLIPBOARD_COMMAND.XCLIP, args: ["-selection", "clipboard"] },
      { command: CLIPBOARD_COMMAND.XSEL, args: ["--clipboard", "--input"] }
    );
  }

  return commands;
};

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
  const commands = buildClipboardCommands();
  for (const { command, args } of commands) {
    const success = await tryClipboardCommand(command, args, text);
    if (success) {
      return true;
    }
  }
  return false;
};

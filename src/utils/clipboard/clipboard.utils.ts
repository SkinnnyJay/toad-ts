import { spawn } from "node:child_process";

import { ENV_KEY } from "@/constants/env-keys";
import { PLATFORM } from "@/constants/platform";
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
    const child = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    } else {
      resolve(false);
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

import { spawn } from "node:child_process";

import { PLATFORM } from "@/constants/platform";

const buildClipboardCommands = (): Array<{ command: string; args: string[] }> => {
  if (process.platform === PLATFORM.DARWIN) {
    return [{ command: "pbcopy", args: [] }];
  }
  if (process.platform === PLATFORM.WIN32) {
    return [{ command: "clip", args: [] }];
  }
  return [
    { command: "xclip", args: ["-selection", "clipboard"] },
    { command: "xsel", args: ["--clipboard", "--input"] },
  ];
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

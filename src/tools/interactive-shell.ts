import { spawn } from "node:child_process";

import { ENV_KEY } from "@/constants/env-keys";
import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import type { CliRenderer } from "@opentui/core";

export interface InteractiveShellOptions {
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  renderer: CliRenderer;
}

export interface InteractiveShellResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

const resolveShellCommand = (command: string): { command: string; args: string[] } => {
  if (process.platform === "win32") {
    return { command: "cmd.exe", args: ["/D", "/Q", "/C", command] };
  }

  const envShell = EnvManager.getInstance().getSnapshot()[ENV_KEY.SHELL];
  const shellCommand = envShell ?? "bash";
  return { command: shellCommand, args: ["-lc", command] };
};

export const runInteractiveShellCommand = async (
  options: InteractiveShellOptions
): Promise<InteractiveShellResult> => {
  const renderer = options.renderer;
  const shell = resolveShellCommand(options.command);
  const env = { ...EnvManager.getInstance().getSnapshot(), ...options.env };

  renderer.suspend();

  try {
    const child = spawn(shell.command, shell.args, {
      cwd: options.cwd,
      env,
      stdio: "inherit",
    });

    return await new Promise<InteractiveShellResult>((resolvePromise) => {
      child.on("exit", (code, signal) => {
        resolvePromise({ exitCode: code, signal });
      });
      child.on("error", () => {
        resolvePromise({ exitCode: null, signal: SIGNAL.SIGTERM });
      });
    });
  } finally {
    renderer.resume();
    renderer.requestRender();
  }
};

import { type ChildProcess, spawn } from "node:child_process";

import { SIGNAL } from "@/constants/signals";
import { EnvManager } from "@/utils/env/env.utils";
import { resolvePlatformShellCommandSpec } from "@/utils/platform-shell.utils";
import { acquireProcessSlot, bindProcessSlotToChild } from "@/utils/process-concurrency.utils";
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

export const runInteractiveShellCommand = async (
  options: InteractiveShellOptions
): Promise<InteractiveShellResult> => {
  const renderer = options.renderer;
  const envSnapshot = EnvManager.getInstance().getSnapshot();
  const shell = resolvePlatformShellCommandSpec(options.command, envSnapshot, process.platform);
  const env = { ...envSnapshot, ...options.env };

  renderer.suspend();

  try {
    const releaseSlot = acquireProcessSlot("interactive-shell");
    let child: ChildProcess;
    try {
      child = spawn(shell.command, shell.args, {
        cwd: options.cwd,
        env,
        stdio: "inherit",
      });
    } catch (error) {
      releaseSlot();
      throw error;
    }
    bindProcessSlotToChild(child, releaseSlot);

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

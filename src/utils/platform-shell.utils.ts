import { ENV_KEY } from "@/constants/env-keys";
import { PLATFORM } from "@/constants/platform";
import { buildWindowsCmdExecArgs } from "@/utils/windows-command.utils";

const SHELL_ADAPTER = {
  POSIX_COMMAND: "bash",
  WINDOWS_COMMAND: "cmd.exe",
  SESSION_POSIX_ARGS: ["-s"],
  SESSION_WINDOWS_ARGS: ["/D", "/Q", "/K"],
  COMMAND_POSIX_PREFIX_ARGS: ["-lc"],
} as const;

export interface PlatformShellSessionSpec {
  command: string;
  args: string[];
  usesShell: boolean;
  isWindows: boolean;
}

export interface PlatformShellCommandSpec {
  command: string;
  args: string[];
}

const resolvePosixShellCommand = (env: NodeJS.ProcessEnv): string => {
  return env[ENV_KEY.SHELL] ?? SHELL_ADAPTER.POSIX_COMMAND;
};

export const resolvePlatformShellSessionSpec = (
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): PlatformShellSessionSpec => {
  if (platform === PLATFORM.WIN32) {
    return {
      command: SHELL_ADAPTER.WINDOWS_COMMAND,
      args: [...SHELL_ADAPTER.SESSION_WINDOWS_ARGS],
      usesShell: true,
      isWindows: true,
    };
  }

  return {
    command: resolvePosixShellCommand(env),
    args: [...SHELL_ADAPTER.SESSION_POSIX_ARGS],
    usesShell: false,
    isWindows: false,
  };
};

export const resolvePlatformShellCommandSpec = (
  command: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): PlatformShellCommandSpec => {
  if (platform === PLATFORM.WIN32) {
    return {
      command: SHELL_ADAPTER.WINDOWS_COMMAND,
      args: buildWindowsCmdExecArgs(command),
    };
  }

  return {
    command: resolvePosixShellCommand(env),
    args: [...SHELL_ADAPTER.COMMAND_POSIX_PREFIX_ARGS, command],
  };
};

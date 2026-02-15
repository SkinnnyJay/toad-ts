import { EnvManager } from "@/utils/env/env.utils";
import {
  type PlatformShellCommandSpec,
  type PlatformShellSessionSpec,
  resolvePlatformShellCommandSpec,
  resolvePlatformShellSessionSpec,
} from "@/utils/platform-shell.utils";

export interface ShellSessionInvocation extends PlatformShellSessionSpec {
  envSnapshot: NodeJS.ProcessEnv;
}

export interface ShellCommandInvocation extends PlatformShellCommandSpec {
  envSnapshot: NodeJS.ProcessEnv;
}

const getShellEnvSnapshot = (): NodeJS.ProcessEnv => {
  return EnvManager.getInstance().getSnapshot();
};

export const createShellSessionInvocation = (
  platform: NodeJS.Platform = process.platform
): ShellSessionInvocation => {
  const envSnapshot = getShellEnvSnapshot();
  return {
    ...resolvePlatformShellSessionSpec(envSnapshot, platform),
    envSnapshot,
  };
};

export const createShellCommandInvocation = (
  command: string,
  platform: NodeJS.Platform = process.platform
): ShellCommandInvocation => {
  const envSnapshot = getShellEnvSnapshot();
  return {
    ...resolvePlatformShellCommandSpec(command, envSnapshot, platform),
    envSnapshot,
  };
};

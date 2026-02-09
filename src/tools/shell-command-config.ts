import { ENV_KEY } from "@/constants/env-keys";
import { SHELL_COMMANDS } from "@/constants/shell-commands";
import type { Env } from "@/utils/env/env.utils";

export interface ShellCommandConfig {
  commands: string[];
  autoDetect: boolean;
}

export interface ShellCommandMatch {
  command: string;
  background: boolean;
  explicit: boolean;
}

const parseCommandList = (raw: string | undefined): string[] => {
  if (!raw) {
    return [...SHELL_COMMANDS];
  }
  return raw
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const normalizeCommands = (commands: string[]): string[] =>
  commands.map((command) => command.toLowerCase());

export const getShellCommandConfig = (env: Env): ShellCommandConfig => {
  const rawCommands = env.getString(ENV_KEY.TOADSTOOL_SHELL_COMMANDS);
  const commands = normalizeCommands(parseCommandList(rawCommands));
  const autoDetect = env.getBoolean(ENV_KEY.TOADSTOOL_SHELL_AUTO_DETECT, true);
  return { commands, autoDetect };
};

const extractBackgroundFlag = (rawCommand: string): { command: string; background: boolean } => {
  const trimmed = rawCommand.trim();
  if (trimmed.endsWith("&")) {
    const command = trimmed.slice(0, -1).trim();
    return { command, background: true };
  }
  return { command: trimmed, background: false };
};

export const parseShellCommandInput = (
  input: string,
  config: ShellCommandConfig
): ShellCommandMatch | null => {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("!")) {
    const raw = trimmed.slice(1).trim();
    const { command, background } = extractBackgroundFlag(raw);
    if (!command) return null;
    return { command, background, explicit: true };
  }

  if (!config.autoDetect) {
    return null;
  }

  const [first] = trimmed.split(/\s+/);
  if (!first) return null;
  if (!config.commands.includes(first.toLowerCase())) {
    return null;
  }

  const { command, background } = extractBackgroundFlag(trimmed);
  if (!command) return null;
  return { command, background, explicit: false };
};

export const isShellCommandInput = (input: string, config: ShellCommandConfig): boolean =>
  parseShellCommandInput(input, config) !== null;

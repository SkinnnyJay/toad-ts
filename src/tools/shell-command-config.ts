import { ENV_KEY } from "@/constants/env-keys";
import { SHELL_COMMANDS, SHELL_INTERACTIVE_COMMANDS } from "@/constants/shell-commands";
import type { Env } from "@/utils/env/env.utils";

export interface ShellCommandConfig {
  commands: string[];
  interactiveCommands: string[];
  autoDetect: boolean;
}

export interface ShellCommandMatch {
  command: string;
  background: boolean;
  explicit: boolean;
  interactive: boolean;
}

const parseCommandList = (raw: string | undefined, fallback: readonly string[]): string[] => {
  if (!raw || raw.trim().length === 0) {
    return [...fallback];
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
  const rawInteractive = env.getString(ENV_KEY.TOADSTOOL_SHELL_INTERACTIVE_COMMANDS);
  const commands = normalizeCommands(parseCommandList(rawCommands, SHELL_COMMANDS));
  const interactiveCommands = normalizeCommands(
    parseCommandList(rawInteractive, SHELL_INTERACTIVE_COMMANDS)
  );
  const autoDetect = env.getBoolean(ENV_KEY.TOADSTOOL_SHELL_AUTO_DETECT, true);
  return { commands, interactiveCommands, autoDetect };
};

const extractBackgroundFlag = (rawCommand: string): { command: string; background: boolean } => {
  const trimmed = rawCommand.trim();
  if (trimmed.endsWith("&")) {
    const command = trimmed.slice(0, -1).trim();
    return { command, background: true };
  }
  return { command: trimmed, background: false };
};

export const isInteractiveShellCommand = (command: string, config: ShellCommandConfig): boolean => {
  const parts = command.trim().split(/\s+/);
  if (parts.length === 0) return false;
  let head = parts[0]?.toLowerCase();
  if (head === "sudo" && parts.length > 1) {
    head = parts[1]?.toLowerCase();
  }
  if (!head) return false;
  return config.interactiveCommands.includes(head);
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
    return {
      command,
      background,
      explicit: true,
      interactive: isInteractiveShellCommand(command, config),
    };
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
  return {
    command,
    background,
    explicit: false,
    interactive: isInteractiveShellCommand(command, config),
  };
};

export const isShellCommandInput = (input: string, config: ShellCommandConfig): boolean =>
  parseShellCommandInput(input, config) !== null;

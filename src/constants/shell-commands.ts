export const SHELL_COMMANDS = [
  "ls",
  "pwd",
  "cd",
  "git",
  "rg",
  "grep",
  "find",
  "npm",
  "bun",
  "node",
  "python",
  "pip",
  "cat",
  "head",
  "tail",
  "sed",
  "awk",
] as const;

export type ShellCommand = (typeof SHELL_COMMANDS)[number];

export const SHELL_INTERACTIVE_COMMANDS = [
  "vim",
  "vi",
  "nano",
  "less",
  "top",
  "htop",
  "man",
  "ssh",
] as const;

export type ShellInteractiveCommand = (typeof SHELL_INTERACTIVE_COMMANDS)[number];

import { FILE_PATH } from "@/constants/file-paths";

export const TERMINAL_SETUP = {
  SCRIPT_NAME: FILE_PATH.TERMINAL_SETUP_SCRIPT,
  LINES: [
    "# TOADSTOOL terminal setup",
    'export TERM="${TERM:-xterm-256color}"',
    'export COLORTERM="${COLORTERM:-truecolor}"',
    'export TOADSTOOL_ASCII="${TOADSTOOL_ASCII:-false}"',
  ],
} as const;

export type TerminalSetup = typeof TERMINAL_SETUP;

export const { SCRIPT_NAME: TERMINAL_SETUP_SCRIPT, LINES: TERMINAL_SETUP_LINES } = TERMINAL_SETUP;

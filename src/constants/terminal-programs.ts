export const TERMINAL_PROGRAM = {
  ITERM_APP: "iTerm.app",
  WEZTERM: "WezTerm",
} as const;

export type TerminalProgram = (typeof TERMINAL_PROGRAM)[keyof typeof TERMINAL_PROGRAM];

export const TERMINAL_KEYWORD = {
  KITTY: "kitty",
} as const;

export type TerminalKeyword = (typeof TERMINAL_KEYWORD)[keyof typeof TERMINAL_KEYWORD];

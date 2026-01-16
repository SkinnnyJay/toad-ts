export const SLASH_COMMAND = {
  HELP: "/help",
  MODE: "/mode",
  CLEAR: "/clear",
  PLAN: "/plan",
  SETTINGS: "/settings",
  EXPORT: "/export",
} as const;

export type SlashCommand = (typeof SLASH_COMMAND)[keyof typeof SLASH_COMMAND];

// Re-export for convenience
export const { HELP, MODE, CLEAR, PLAN, SETTINGS, EXPORT } = SLASH_COMMAND;

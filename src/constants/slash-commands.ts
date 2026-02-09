export const SLASH_COMMAND = {
  CONNECT: "/connect",
  EDITOR: "/editor",
  HELP: "/help",
  DETAILS: "/details",
  MODE: "/mode",
  MODELS: "/models",
  NEW: "/new",
  CLEAR: "/clear",
  PLAN: "/plan",
  RENAME: "/rename",
  SESSIONS: "/sessions",
  SETTINGS: "/settings",
  THEMES: "/themes",
  THINKING: "/thinking",
  EXPORT: "/export",
} as const;

export type SlashCommand = (typeof SLASH_COMMAND)[keyof typeof SLASH_COMMAND];

// Re-export for convenience
export const {
  CONNECT,
  EDITOR,
  HELP,
  DETAILS,
  MODE,
  MODELS,
  NEW,
  CLEAR,
  PLAN,
  RENAME,
  SESSIONS,
  SETTINGS,
  THEMES,
  THINKING,
  EXPORT,
} = SLASH_COMMAND;

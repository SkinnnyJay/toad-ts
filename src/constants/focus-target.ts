export const FOCUS_TARGET = {
  CHAT: "chat",
  FILES: "files",
  PLAN: "plan",
  CONTEXT: "context",
  SESSIONS: "sessions",
  AGENT: "agent",
} as const;

export type FocusTarget = (typeof FOCUS_TARGET)[keyof typeof FOCUS_TARGET];

// Re-export for convenience
export const { CHAT, FILES, PLAN, CONTEXT, SESSIONS, AGENT } = FOCUS_TARGET;

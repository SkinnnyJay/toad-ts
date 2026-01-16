export const VIEW = {
  AGENT_SELECT: "agent-select",
  CHAT: "chat",
} as const;

export type View = (typeof VIEW)[keyof typeof VIEW];

// Re-export for convenience
export const { AGENT_SELECT, CHAT } = VIEW;

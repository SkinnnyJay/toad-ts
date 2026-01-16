export const CONTENT_MODE = {
  MESSAGE: "message",
  THOUGHT: "thought",
} as const;

export type ContentMode = (typeof CONTENT_MODE)[keyof typeof CONTENT_MODE];

// Re-export for convenience
export const { MESSAGE, THOUGHT } = CONTENT_MODE;

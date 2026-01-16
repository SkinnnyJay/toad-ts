export const MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
} as const;

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];

// Re-export for convenience
export const { USER, ASSISTANT, SYSTEM } = MESSAGE_ROLE;

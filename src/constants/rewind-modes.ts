export const REWIND_MODE = {
  CONVERSATION: "conversation",
  CODE: "code",
  BOTH: "both",
  SUMMARIZE: "summarize",
} as const;

export type RewindMode = (typeof REWIND_MODE)[keyof typeof REWIND_MODE];

export const { CONVERSATION, CODE, BOTH, SUMMARIZE } = REWIND_MODE;

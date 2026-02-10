export const HOOK_TYPE = {
  COMMAND: "command",
  PROMPT: "prompt",
} as const;

export type HookType = (typeof HOOK_TYPE)[keyof typeof HOOK_TYPE];

export const { COMMAND, PROMPT } = HOOK_TYPE;

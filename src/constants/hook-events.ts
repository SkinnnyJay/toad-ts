export const HOOK_EVENT = {
  SESSION_START: "SessionStart",
  PRE_TOOL_USE: "PreToolUse",
  POST_TOOL_USE: "PostToolUse",
  PERMISSION_REQUEST: "PermissionRequest",
  STOP: "Stop",
} as const;

export type HookEvent = (typeof HOOK_EVENT)[keyof typeof HOOK_EVENT];

export const HOOK_EVENT_VALUES: HookEvent[] = [
  HOOK_EVENT.SESSION_START,
  HOOK_EVENT.PRE_TOOL_USE,
  HOOK_EVENT.POST_TOOL_USE,
  HOOK_EVENT.PERMISSION_REQUEST,
  HOOK_EVENT.STOP,
];

export const { SESSION_START, PRE_TOOL_USE, POST_TOOL_USE, PERMISSION_REQUEST, STOP } = HOOK_EVENT;

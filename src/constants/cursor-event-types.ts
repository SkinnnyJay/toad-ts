export const CURSOR_EVENT_TYPE = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
  TOOL_CALL: "tool_call",
  RESULT: "result",
} as const;

export const CURSOR_EVENT_SUBTYPE = {
  INIT: "init",
  STARTED: "started",
  COMPLETED: "completed",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type CursorEventType = (typeof CURSOR_EVENT_TYPE)[keyof typeof CURSOR_EVENT_TYPE];
export type CursorEventSubtype = (typeof CURSOR_EVENT_SUBTYPE)[keyof typeof CURSOR_EVENT_SUBTYPE];

export const { SYSTEM, USER, ASSISTANT, TOOL_CALL, RESULT } = CURSOR_EVENT_TYPE;
export const { INIT, STARTED, COMPLETED, SUCCESS, ERROR } = CURSOR_EVENT_SUBTYPE;

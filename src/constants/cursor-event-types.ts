export const CURSOR_STREAM_TYPE = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
  TOOL_CALL: "tool_call",
  RESULT: "result",
} as const;

export type CursorStreamType = (typeof CURSOR_STREAM_TYPE)[keyof typeof CURSOR_STREAM_TYPE];

export const CURSOR_STREAM_SUBTYPE = {
  INIT: "init",
  STARTED: "started",
  COMPLETED: "completed",
  SUCCESS: "success",
} as const;

export type CursorStreamSubtype =
  (typeof CURSOR_STREAM_SUBTYPE)[keyof typeof CURSOR_STREAM_SUBTYPE];

export const CURSOR_EVENT_TYPE = {
  SYSTEM_INIT: "system.init",
  USER_MESSAGE: "user.message",
  ASSISTANT_MESSAGE: "assistant.message",
  TOOL_CALL_STARTED: "tool_call.started",
  TOOL_CALL_COMPLETED: "tool_call.completed",
  RESULT_SUCCESS: "result.success",
} as const;

export type CursorEventType = (typeof CURSOR_EVENT_TYPE)[keyof typeof CURSOR_EVENT_TYPE];

export const {
  SYSTEM: CURSOR_TYPE_SYSTEM,
  USER: CURSOR_TYPE_USER,
  ASSISTANT: CURSOR_TYPE_ASSISTANT,
  TOOL_CALL: CURSOR_TYPE_TOOL_CALL,
  RESULT: CURSOR_TYPE_RESULT,
} = CURSOR_STREAM_TYPE;

export const {
  INIT: CURSOR_SUBTYPE_INIT,
  STARTED: CURSOR_SUBTYPE_STARTED,
  COMPLETED: CURSOR_SUBTYPE_COMPLETED,
  SUCCESS: CURSOR_SUBTYPE_SUCCESS,
} = CURSOR_STREAM_SUBTYPE;

export const {
  SYSTEM_INIT,
  USER_MESSAGE,
  ASSISTANT_MESSAGE,
  TOOL_CALL_STARTED,
  TOOL_CALL_COMPLETED,
  RESULT_SUCCESS,
} = CURSOR_EVENT_TYPE;

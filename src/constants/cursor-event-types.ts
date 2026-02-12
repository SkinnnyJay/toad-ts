/**
 * Cursor CLI NDJSON stream event type constants.
 *
 * These map to the `type` and `subtype` fields emitted by
 * `cursor-agent -p --output-format stream-json --stream-partial-output`.
 *
 * @see PLAN2.md — "NDJSON Stream Protocol (Channel 1)"
 */

export const CURSOR_EVENT_TYPE = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
  TOOL_CALL: "tool_call",
  RESULT: "result",
} as const;

export type CursorEventType = (typeof CURSOR_EVENT_TYPE)[keyof typeof CURSOR_EVENT_TYPE];

export const CURSOR_EVENT_SUBTYPE = {
  /** system.init — Session initialization (model, cwd, session_id, permissionMode) */
  INIT: "init",
  /** tool_call.started — Tool invocation beginning */
  STARTED: "started",
  /** tool_call.completed — Tool invocation result (success/failure) */
  COMPLETED: "completed",
  /** result.success — Terminal event with full response text */
  SUCCESS: "success",
} as const;

export type CursorEventSubtype = (typeof CURSOR_EVENT_SUBTYPE)[keyof typeof CURSOR_EVENT_SUBTYPE];

/** Known tool types found in NDJSON tool_call events */
export const CURSOR_TOOL_TYPE = {
  READ: "readToolCall",
  WRITE: "writeToolCall",
  EDIT: "editToolCall",
  SHELL: "shellToolCall",
  GREP: "grepToolCall",
  LS: "lsToolCall",
  GLOB: "globToolCall",
  DELETE: "deleteToolCall",
  TODO: "todoToolCall",
  /** Generic/MCP tool calls use the `function` key */
  FUNCTION: "function",
} as const;

export type CursorToolType = (typeof CURSOR_TOOL_TYPE)[keyof typeof CURSOR_TOOL_TYPE];

/** API key source values from system.init */
export const CURSOR_API_KEY_SOURCE = {
  LOGIN: "login",
  API_KEY: "api_key",
  ENV: "env",
} as const;

export type CursorApiKeySource = (typeof CURSOR_API_KEY_SOURCE)[keyof typeof CURSOR_API_KEY_SOURCE];

/** Permission mode values from system.init */
export const CURSOR_PERMISSION_MODE = {
  DEFAULT: "default",
  FORCE: "force",
} as const;

export type CursorPermissionMode =
  (typeof CURSOR_PERMISSION_MODE)[keyof typeof CURSOR_PERMISSION_MODE];

// Re-export for convenience
export const {
  SYSTEM: CURSOR_SYSTEM,
  USER: CURSOR_USER,
  ASSISTANT: CURSOR_ASSISTANT,
  TOOL_CALL: CURSOR_TOOL_CALL,
  RESULT: CURSOR_RESULT,
} = CURSOR_EVENT_TYPE;

export const {
  INIT: CURSOR_INIT,
  STARTED: CURSOR_STARTED,
  COMPLETED: CURSOR_COMPLETED,
  SUCCESS: CURSOR_SUCCESS,
} = CURSOR_EVENT_SUBTYPE;

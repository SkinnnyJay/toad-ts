/**
 * Cursor CLI hook event name constants.
 *
 * These map to the `hook_event_name` field in hook event payloads
 * and correspond to keys in `.cursor/hooks.json`.
 *
 * @see PLAN2.md — "Hooks System (Channel 2)"
 */

export const CURSOR_HOOK_EVENT = {
  /** New conversation created — can inject context, env vars, or block */
  SESSION_START: "sessionStart",
  /** Conversation ends — fire-and-forget cleanup */
  SESSION_END: "sessionEnd",
  /** Before ANY tool executes — can allow/deny/modify input */
  PRE_TOOL_USE: "preToolUse",
  /** After successful tool execution — observe only */
  POST_TOOL_USE: "postToolUse",
  /** After tool failure — observe only */
  POST_TOOL_USE_FAILURE: "postToolUseFailure",
  /** Before subagent (Task tool) spawns — can deny */
  SUBAGENT_START: "subagentStart",
  /** Subagent completes — can inject followup_message */
  SUBAGENT_STOP: "subagentStop",
  /** Before shell command runs — can allow/deny/ask */
  BEFORE_SHELL_EXECUTION: "beforeShellExecution",
  /** After shell command completes — observe only */
  AFTER_SHELL_EXECUTION: "afterShellExecution",
  /** Before MCP tool runs — can deny (fail-closed) */
  BEFORE_MCP_EXECUTION: "beforeMCPExecution",
  /** After MCP tool completes — observe only */
  AFTER_MCP_EXECUTION: "afterMCPExecution",
  /** Before file read — can deny (fail-closed) */
  BEFORE_READ_FILE: "beforeReadFile",
  /** After file edit — observe old/new strings */
  AFTER_FILE_EDIT: "afterFileEdit",
  /** Before prompt sent to API — can block or modify */
  BEFORE_SUBMIT_PROMPT: "beforeSubmitPrompt",
  /** Before context compaction — observe only */
  PRE_COMPACT: "preCompact",
  /** Agent loop ends — can inject followup_message for auto-continuation */
  STOP: "stop",
  /** After assistant message — observe response text */
  AFTER_AGENT_RESPONSE: "afterAgentResponse",
  /** After thinking block — observe reasoning text */
  AFTER_AGENT_THOUGHT: "afterAgentThought",
} as const;

export type CursorHookEvent =
  (typeof CURSOR_HOOK_EVENT)[keyof typeof CURSOR_HOOK_EVENT];

/** Hook events that can block (return allow/deny decisions) */
export const CURSOR_BLOCKING_HOOK_EVENTS = [
  CURSOR_HOOK_EVENT.SESSION_START,
  CURSOR_HOOK_EVENT.PRE_TOOL_USE,
  CURSOR_HOOK_EVENT.SUBAGENT_START,
  CURSOR_HOOK_EVENT.SUBAGENT_STOP,
  CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
  CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
  CURSOR_HOOK_EVENT.BEFORE_READ_FILE,
  CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT,
  CURSOR_HOOK_EVENT.STOP,
] as const;

/** Hook events that are fire-and-forget (observe only) */
export const CURSOR_OBSERVE_ONLY_HOOK_EVENTS = [
  CURSOR_HOOK_EVENT.SESSION_END,
  CURSOR_HOOK_EVENT.POST_TOOL_USE,
  CURSOR_HOOK_EVENT.POST_TOOL_USE_FAILURE,
  CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION,
  CURSOR_HOOK_EVENT.AFTER_MCP_EXECUTION,
  CURSOR_HOOK_EVENT.AFTER_FILE_EDIT,
  CURSOR_HOOK_EVENT.PRE_COMPACT,
  CURSOR_HOOK_EVENT.AFTER_AGENT_RESPONSE,
  CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
] as const;

/** All hook event names as an array for iteration */
export const ALL_CURSOR_HOOK_EVENTS = [
  ...CURSOR_BLOCKING_HOOK_EVENTS,
  ...CURSOR_OBSERVE_ONLY_HOOK_EVENTS,
] as const;

/** Hook decision values for preToolUse */
export const CURSOR_HOOK_DECISION = {
  ALLOW: "allow",
  DENY: "deny",
} as const;

export type CursorHookDecision =
  (typeof CURSOR_HOOK_DECISION)[keyof typeof CURSOR_HOOK_DECISION];

/** Shell permission values for beforeShellExecution */
export const CURSOR_SHELL_PERMISSION = {
  ALLOW: "allow",
  DENY: "deny",
  ASK: "ask",
} as const;

export type CursorShellPermission =
  (typeof CURSOR_SHELL_PERMISSION)[keyof typeof CURSOR_SHELL_PERMISSION];

/** Stop hook status values */
export const CURSOR_STOP_STATUS = {
  COMPLETED: "completed",
  ERROR: "error",
  CANCELLED: "cancelled",
} as const;

export type CursorStopStatus =
  (typeof CURSOR_STOP_STATUS)[keyof typeof CURSOR_STOP_STATUS];

// Re-export for convenience
export const {
  SESSION_START,
  SESSION_END,
  PRE_TOOL_USE,
  POST_TOOL_USE,
  POST_TOOL_USE_FAILURE,
  SUBAGENT_START,
  SUBAGENT_STOP,
  BEFORE_SHELL_EXECUTION,
  AFTER_SHELL_EXECUTION,
  BEFORE_MCP_EXECUTION,
  AFTER_MCP_EXECUTION,
  BEFORE_READ_FILE,
  AFTER_FILE_EDIT,
  BEFORE_SUBMIT_PROMPT,
  PRE_COMPACT,
  STOP,
  AFTER_AGENT_RESPONSE,
  AFTER_AGENT_THOUGHT,
} = CURSOR_HOOK_EVENT;

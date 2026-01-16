export const SESSION_UPDATE_TYPE = {
  SESSION_INFO_UPDATE: "session_info_update",
  AGENT_MESSAGE_CHUNK: "agent_message_chunk",
  USER_MESSAGE_CHUNK: "user_message_chunk",
  AGENT_THOUGHT_CHUNK: "agent_thought_chunk",
  TOOL_CALL: "tool_call",
  TOOL_CALL_UPDATE: "tool_call_update",
} as const;

export type SessionUpdateType = (typeof SESSION_UPDATE_TYPE)[keyof typeof SESSION_UPDATE_TYPE];

// Re-export for convenience
export const {
  SESSION_INFO_UPDATE,
  AGENT_MESSAGE_CHUNK,
  USER_MESSAGE_CHUNK,
  AGENT_THOUGHT_CHUNK,
  TOOL_CALL,
  TOOL_CALL_UPDATE,
} = SESSION_UPDATE_TYPE;

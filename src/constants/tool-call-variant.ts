/**
 * UI variant for tool call display (active vs recent).
 */
export const TOOL_CALL_VARIANT = {
  ACTIVE: "active",
  RECENT: "recent",
} as const;

export type ToolCallVariant = (typeof TOOL_CALL_VARIANT)[keyof typeof TOOL_CALL_VARIANT];

export const { ACTIVE, RECENT } = TOOL_CALL_VARIANT;

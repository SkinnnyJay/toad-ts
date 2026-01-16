export const TOOL_CALL_STATUS = {
  PENDING: "pending",
  AWAITING_APPROVAL: "awaiting_approval",
  APPROVED: "approved",
  DENIED: "denied",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;

export type ToolCallStatus = (typeof TOOL_CALL_STATUS)[keyof typeof TOOL_CALL_STATUS];

// Re-export for convenience
export const { PENDING, AWAITING_APPROVAL, APPROVED, DENIED, RUNNING, SUCCEEDED, FAILED } =
  TOOL_CALL_STATUS;

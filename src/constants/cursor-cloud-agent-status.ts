export const CURSOR_CLOUD_AGENT_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  STOPPED: "stopped",
  CANCELED: "canceled",
} as const;

export type CursorCloudAgentStatus =
  (typeof CURSOR_CLOUD_AGENT_STATUS)[keyof typeof CURSOR_CLOUD_AGENT_STATUS];

export const { QUEUED, RUNNING, COMPLETED, FAILED, STOPPED, CANCELED } = CURSOR_CLOUD_AGENT_STATUS;

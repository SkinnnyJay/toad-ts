export const BACKGROUND_TASK_STATUS = {
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type BackgroundTaskStatus =
  (typeof BACKGROUND_TASK_STATUS)[keyof typeof BACKGROUND_TASK_STATUS];

export const { RUNNING, COMPLETED, FAILED, CANCELLED } = BACKGROUND_TASK_STATUS;

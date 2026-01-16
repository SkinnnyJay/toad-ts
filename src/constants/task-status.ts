export const TASK_STATUS = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  BLOCKED: "blocked",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// Re-export for convenience
export const { PENDING, ASSIGNED, RUNNING, COMPLETED, FAILED, BLOCKED } = TASK_STATUS;

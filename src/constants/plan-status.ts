export const PLAN_STATUS = {
  PLANNING: "planning",
  EXECUTING: "executing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

// Re-export for convenience
export const { PLANNING, EXECUTING, COMPLETED, FAILED } = PLAN_STATUS;

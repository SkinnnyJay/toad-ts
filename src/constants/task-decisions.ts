export const TASK_DECISION = {
  APPROVE: "approve",
  DENY: "deny",
  SKIP: "skip",
} as const;

export type TaskDecision = (typeof TASK_DECISION)[keyof typeof TASK_DECISION];

export const { APPROVE, DENY, SKIP } = TASK_DECISION;

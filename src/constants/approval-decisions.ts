export const APPROVAL_DECISION = {
  APPROVED: "approved",
  DENIED: "denied",
} as const;

export type ApprovalDecision = (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION];

export const { APPROVED, DENIED } = APPROVAL_DECISION;

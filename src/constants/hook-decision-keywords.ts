export const HOOK_DECISION_KEYWORD = {
  ALLOW: "allow",
  APPROVE: "approve",
  DENY: "deny",
  BLOCK: "block",
  YES: "yes",
  NO: "no",
} as const;

export type HookDecisionKeyword =
  (typeof HOOK_DECISION_KEYWORD)[keyof typeof HOOK_DECISION_KEYWORD];

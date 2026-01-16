export const PERMISSION = {
  ALLOW: "allow",
  DENY: "deny",
  ASK: "ask",
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

// Re-export for convenience
export const { ALLOW, DENY, ASK } = PERMISSION;

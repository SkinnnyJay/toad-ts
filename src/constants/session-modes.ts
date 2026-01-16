export const SESSION_MODE = {
  READ_ONLY: "read-only",
  AUTO: "auto",
  FULL_ACCESS: "full-access",
} as const;

export type SessionMode = (typeof SESSION_MODE)[keyof typeof SESSION_MODE];

// Re-export for convenience
export const { READ_ONLY, AUTO, FULL_ACCESS } = SESSION_MODE;

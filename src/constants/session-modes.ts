export const SESSION_MODE = {
  READ_ONLY: "read-only",
  AUTO: "auto",
  FULL_ACCESS: "full-access",
} as const;

export type SessionMode = (typeof SESSION_MODE)[keyof typeof SESSION_MODE];

export const SESSION_MODE_ORDER: SessionMode[] = [
  SESSION_MODE.AUTO,
  SESSION_MODE.READ_ONLY,
  SESSION_MODE.FULL_ACCESS,
];

export const getNextSessionMode = (current: SessionMode): SessionMode => {
  const index = SESSION_MODE_ORDER.indexOf(current);
  if (index < 0) {
    return SESSION_MODE.AUTO;
  }
  const nextIndex = (index + 1) % SESSION_MODE_ORDER.length;
  return SESSION_MODE_ORDER[nextIndex] ?? SESSION_MODE.AUTO;
};

// Re-export for convenience
export const { READ_ONLY, AUTO, FULL_ACCESS } = SESSION_MODE;

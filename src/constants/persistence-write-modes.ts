export const PERSISTENCE_WRITE_MODE = {
  PER_TOKEN: "per_token",
  PER_MESSAGE: "per_message",
  ON_SESSION_CHANGE: "on_session_change",
} as const;

export type PersistenceWriteMode =
  (typeof PERSISTENCE_WRITE_MODE)[keyof typeof PERSISTENCE_WRITE_MODE];

// Re-export for convenience
export const { PER_TOKEN, PER_MESSAGE, ON_SESSION_CHANGE } = PERSISTENCE_WRITE_MODE;

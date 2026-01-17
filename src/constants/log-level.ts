export const LOG_LEVEL = {
  INFO: "info",
  WARN: "warn",
  DEBUG: "debug",
  ERROR: "error",
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

// Re-export for convenience
export const { INFO, WARN, DEBUG, ERROR } = LOG_LEVEL;

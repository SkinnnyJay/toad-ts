export const SIGNAL = {
  SIGTERM: "SIGTERM",
  SIGKILL: "SIGKILL",
  SIGINT: "SIGINT",
} as const;

export type Signal = (typeof SIGNAL)[keyof typeof SIGNAL];

// Re-export for convenience
export const { SIGTERM, SIGKILL, SIGINT } = SIGNAL;

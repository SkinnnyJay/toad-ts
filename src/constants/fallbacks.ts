export const FALLBACK = {
  UNKNOWN: "unknown",
  NULL: "null",
  ERROR: "error",
} as const;

export type Fallback = (typeof FALLBACK)[keyof typeof FALLBACK];

// Re-export for convenience
export const { UNKNOWN, NULL, ERROR } = FALLBACK;

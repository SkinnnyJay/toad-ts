/**
 * Format mode for display (e.g. git path, session export).
 */
export const FORMAT_MODE = {
  SHORT: "short",
  FULL: "full",
} as const;

export type FormatMode = (typeof FORMAT_MODE)[keyof typeof FORMAT_MODE];

export const { SHORT, FULL } = FORMAT_MODE;

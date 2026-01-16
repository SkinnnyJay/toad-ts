export const ENCODING = {
  UTF8: "utf8",
  UTF_8: "utf-8",
} as const;

export type Encoding = (typeof ENCODING)[keyof typeof ENCODING];

// Re-export for convenience
export const { UTF8, UTF_8 } = ENCODING;

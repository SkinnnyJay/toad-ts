const UTF8_ENCODING = "utf8";
const UTF8_DASH_ENCODING = UTF8_ENCODING.replace("utf", "utf-");

export const ENCODING = {
  UTF8: UTF8_ENCODING,
  UTF_8: UTF8_DASH_ENCODING,
} as const;

export type Encoding = (typeof ENCODING)[keyof typeof ENCODING];

// Re-export for convenience
export const { UTF8, UTF_8 } = ENCODING;

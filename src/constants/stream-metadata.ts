export const STREAM_METADATA_KEY = {
  IS_FINAL: "isFinal",
  FINAL: "final",
} as const;

export type StreamMetadataKey = (typeof STREAM_METADATA_KEY)[keyof typeof STREAM_METADATA_KEY];

// Re-export for convenience
export const { IS_FINAL, FINAL } = STREAM_METADATA_KEY;

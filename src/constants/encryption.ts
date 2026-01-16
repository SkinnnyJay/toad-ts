export const ENCRYPTION = {
  ALGORITHM: "aes-256-gcm",
  IV_BYTES: 12,
  KEY_BYTES: 32,
} as const;

// Re-export for convenience
export const { ALGORITHM, IV_BYTES, KEY_BYTES } = ENCRYPTION;

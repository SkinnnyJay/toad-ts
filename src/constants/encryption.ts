import { LIMIT } from "@/config/limits";

export const ENCRYPTION = {
  ALGORITHM: "aes-256-gcm",
  IV_BYTES: LIMIT.ENCRYPTION_IV_BYTES,
  KEY_BYTES: LIMIT.ENCRYPTION_KEY_BYTES,
} as const;

// Re-export for convenience
export const { ALGORITHM, IV_BYTES, KEY_BYTES } = ENCRYPTION;

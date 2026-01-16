export const CREDENTIAL_STORE_KIND = {
  KEYTAR: "keytar",
  DISK: "disk",
  MEMORY: "memory",
} as const;

export type CredentialStoreKind =
  (typeof CREDENTIAL_STORE_KIND)[keyof typeof CREDENTIAL_STORE_KIND];

// Re-export for convenience
export const { KEYTAR, DISK, MEMORY } = CREDENTIAL_STORE_KIND;

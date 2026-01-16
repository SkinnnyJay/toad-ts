export const PERSISTENCE_PROVIDER = {
  JSON: "json",
  SQLITE: "sqlite",
} as const;

export type PersistenceProvider = (typeof PERSISTENCE_PROVIDER)[keyof typeof PERSISTENCE_PROVIDER];

// Re-export for convenience
export const { SQLITE } = PERSISTENCE_PROVIDER;
export const JSON_PROVIDER = PERSISTENCE_PROVIDER.JSON;

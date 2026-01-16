export const PERSISTENCE_REQUEST_TYPE = {
  LOAD: "load",
  SAVE: "save",
  SEARCH: "search",
  HISTORY: "history",
  CLOSE: "close",
} as const;

export type PersistenceRequestType =
  (typeof PERSISTENCE_REQUEST_TYPE)[keyof typeof PERSISTENCE_REQUEST_TYPE];

// Re-export for convenience
export const { LOAD, SAVE, SEARCH, HISTORY, CLOSE } = PERSISTENCE_REQUEST_TYPE;

export const CONNECTION_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

// Re-export for convenience
export const { DISCONNECTED, CONNECTING, CONNECTED, ERROR } = CONNECTION_STATUS;

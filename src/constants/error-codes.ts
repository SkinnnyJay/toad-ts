export const ERROR_CODE = {
  ENOENT: "ENOENT",
  EACCES: "EACCES",
  AUTH_REQUIRED: -32000,
  RPC_METHOD_NOT_FOUND: -32601,
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Re-export for convenience
export const { ENOENT, EACCES, AUTH_REQUIRED, RPC_METHOD_NOT_FOUND } = ERROR_CODE;

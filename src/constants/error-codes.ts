export const ERROR_CODE = {
  ENOENT: "ENOENT",
  EACCES: "EACCES",
  AUTH_REQUIRED: -32000,
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Re-export for convenience
export const { ENOENT, EACCES, AUTH_REQUIRED } = ERROR_CODE;

import { LIMIT } from "@/config/limits";

export const ERROR_CODE = {
  ENOENT: "ENOENT",
  EACCES: "EACCES",
  AUTH_REQUIRED: LIMIT.RPC_AUTH_REQUIRED_CODE,
  RPC_METHOD_NOT_FOUND: LIMIT.RPC_METHOD_NOT_FOUND_CODE,
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Re-export for convenience
export const { ENOENT, EACCES, AUTH_REQUIRED, RPC_METHOD_NOT_FOUND } = ERROR_CODE;

export const PERMISSION_PATTERN = {
  READ_FILE: "read_file*",
  LIST: "list_*",
  GET: "get_*",
  WRITE: "write_*",
  DELETE: "delete_*",
  EXEC: "exec_*",
} as const;

export type PermissionPattern = (typeof PERMISSION_PATTERN)[keyof typeof PERMISSION_PATTERN];

// Re-export for convenience
export const { READ_FILE, LIST, GET, WRITE, DELETE, EXEC } = PERMISSION_PATTERN;

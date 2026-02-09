export const PERMISSION_PATTERN = {
  READ: "read_*",
  LIST: "list_*",
  SEARCH: "search_*",
  WRITE: "write_*",
  EDIT: "edit_*",
  DELETE: "delete_*",
  EXEC: "exec_*",
  FETCH: "fetch_*",
  TODO: "todo_*",
  ASK: "ask_*",
} as const;

export type PermissionPattern = (typeof PERMISSION_PATTERN)[keyof typeof PERMISSION_PATTERN];

// Re-export for convenience
export const { READ, LIST, SEARCH, WRITE, EDIT, DELETE, EXEC, FETCH, TODO, ASK } =
  PERMISSION_PATTERN;

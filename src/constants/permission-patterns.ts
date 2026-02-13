export const PERMISSION_PATTERN = {
  WILDCARD: "*",
  READ: "read_*",
  LIST: "list_*",
  SEARCH: "search_*",
  WRITE: "write_*",
  EDIT: "edit_*",
  DELETE: "delete_*",
  EXEC: "exec_*",
  FETCH: "fetch_*",
  TODO: "todo_*",
  TASK: "task_*",
  ASK: "ask_*",
} as const;

export type PermissionPattern = (typeof PERMISSION_PATTERN)[keyof typeof PERMISSION_PATTERN];

// Re-export for convenience
export const { WILDCARD, READ, LIST, SEARCH, WRITE, EDIT, DELETE, EXEC, FETCH, TODO, TASK, ASK } =
  PERMISSION_PATTERN;

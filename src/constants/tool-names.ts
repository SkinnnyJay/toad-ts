export const TOOL_NAME = {
  BASH: "exec_bash",
  READ: "read_file",
  WRITE: "write_file",
  EDIT: "edit_file",
  GREP: "search_grep",
  GLOB: "search_glob",
  LIST: "list_directory",
  TODO_WRITE: "todo_write",
  TODO_READ: "todo_read",
  WEBFETCH: "fetch_web",
  QUESTION: "ask_question",
  TASK_OUTPUT: "task_output",
} as const;

export type ToolName = (typeof TOOL_NAME)[keyof typeof TOOL_NAME];

export const {
  BASH,
  READ,
  WRITE,
  EDIT,
  GREP,
  GLOB,
  LIST,
  TODO_WRITE,
  TODO_READ,
  WEBFETCH,
  QUESTION,
  TASK_OUTPUT,
} = TOOL_NAME;

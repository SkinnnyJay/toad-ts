export const TOOL_KIND = {
  READ: "read",
  EDIT: "edit",
  DELETE: "delete",
  MOVE: "move",
  SEARCH: "search",
  EXECUTE: "execute",
  THINK: "think",
  FETCH: "fetch",
  SWITCH_MODE: "switch_mode",
  OTHER: "other",
} as const;

export type ToolKind = (typeof TOOL_KIND)[keyof typeof TOOL_KIND];

export const { READ, EDIT, DELETE, MOVE, SEARCH, EXECUTE, THINK, FETCH, SWITCH_MODE, OTHER } =
  TOOL_KIND;

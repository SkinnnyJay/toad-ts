/**
 * Tool name identifiers used in session forking for file change tracking (write, edit, patch).
 */
export const SESSION_FORK_TOOL = {
  WRITE: "write",
  EDIT: "edit",
  PATCH: "patch",
} as const;

export type SessionForkTool = (typeof SESSION_FORK_TOOL)[keyof typeof SESSION_FORK_TOOL];

export const { WRITE, EDIT, PATCH } = SESSION_FORK_TOOL;

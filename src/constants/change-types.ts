/**
 * File change type for session forking (created, modified, deleted).
 */
export const CHANGE_TYPE = {
  CREATED: "created",
  MODIFIED: "modified",
  DELETED: "deleted",
} as const;

export type ChangeType = (typeof CHANGE_TYPE)[keyof typeof CHANGE_TYPE];

export const { CREATED, MODIFIED, DELETED } = CHANGE_TYPE;

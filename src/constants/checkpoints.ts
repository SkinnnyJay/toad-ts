export const CHECKPOINT = {
  FILE_PREFIX: "checkpoint",
  FILE_EXTENSION: ".json",
} as const;

export const SNAPSHOT_TARGET = {
  BEFORE: "before",
  AFTER: "after",
} as const;

export type CheckpointFileExtension = typeof CHECKPOINT.FILE_EXTENSION;
export type SnapshotTarget = (typeof SNAPSHOT_TARGET)[keyof typeof SNAPSHOT_TARGET];

export const { FILE_PREFIX, FILE_EXTENSION } = CHECKPOINT;
export const { BEFORE, AFTER } = SNAPSHOT_TARGET;

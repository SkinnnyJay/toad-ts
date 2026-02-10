export const CHECKPOINT = {
  FILE_PREFIX: "checkpoint",
  FILE_EXTENSION: ".json",
} as const;

export type CheckpointFileExtension = typeof CHECKPOINT.FILE_EXTENSION;

export const { FILE_PREFIX, FILE_EXTENSION } = CHECKPOINT;

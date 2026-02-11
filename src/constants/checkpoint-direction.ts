/**
 * Checkpoint apply direction (undo, redo, rewind).
 */
export const CHECKPOINT_DIRECTION = {
  UNDO: "undo",
  REDO: "redo",
  REWIND: "rewind",
} as const;

export type CheckpointDirection = (typeof CHECKPOINT_DIRECTION)[keyof typeof CHECKPOINT_DIRECTION];

export const { UNDO, REDO, REWIND } = CHECKPOINT_DIRECTION;

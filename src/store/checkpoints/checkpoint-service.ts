import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";

let checkpointManager: CheckpointManager | null = null;

export const registerCheckpointManager = (manager: CheckpointManager | null): void => {
  checkpointManager = manager;
};

export const getCheckpointManager = (): CheckpointManager | null => checkpointManager;

export const REWIND_ACTION = {
  LIST: "list",
  DELETE: "delete",
  REWIND: "rewind",
} as const;

export type RewindAction = (typeof REWIND_ACTION)[keyof typeof REWIND_ACTION];

export const { LIST, DELETE, REWIND } = REWIND_ACTION;

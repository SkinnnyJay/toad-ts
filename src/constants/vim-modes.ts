export const VIM_MODE = {
  INSERT: "insert",
  NORMAL: "normal",
} as const;

export type VimMode = (typeof VIM_MODE)[keyof typeof VIM_MODE];

export const { INSERT, NORMAL } = VIM_MODE;

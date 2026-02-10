export const VIM_OPERATOR = {
  DELETE: "d",
  CHANGE: "c",
  YANK: "y",
} as const;

export type VimOperator = (typeof VIM_OPERATOR)[keyof typeof VIM_OPERATOR];

export const { DELETE, CHANGE, YANK } = VIM_OPERATOR;

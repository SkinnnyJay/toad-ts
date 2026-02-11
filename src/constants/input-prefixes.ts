export const INPUT_PREFIX = {
  CLOUD_DISPATCH: "&",
} as const;

export type InputPrefix = (typeof INPUT_PREFIX)[keyof typeof INPUT_PREFIX];

export const { CLOUD_DISPATCH } = INPUT_PREFIX;

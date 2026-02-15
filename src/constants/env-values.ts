export const ENV_VALUE = {
  DEVELOPMENT: "development",
  TEST: "test",
  PRODUCTION: "production",
} as const;

export type EnvValue = (typeof ENV_VALUE)[keyof typeof ENV_VALUE];

export const { DEVELOPMENT, TEST, PRODUCTION } = ENV_VALUE;

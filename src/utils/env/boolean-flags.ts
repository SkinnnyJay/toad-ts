const BOOLEAN_FLAG = {
  TRUE: "true",
  FALSE: "false",
  ONE: "1",
  ZERO: "0",
} as const;

export const parseBooleanEnvFlag = (value: string | undefined): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === BOOLEAN_FLAG.TRUE || normalized === BOOLEAN_FLAG.ONE) {
    return true;
  }
  if (normalized === BOOLEAN_FLAG.FALSE || normalized === BOOLEAN_FLAG.ZERO) {
    return false;
  }
  return undefined;
};

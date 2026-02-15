export const HARNESS_ID_VALIDATION_MESSAGE = {
  NON_CANONICAL:
    "Harness id must be non-empty and must not contain leading or trailing whitespace.",
} as const;

export const normalizeHarnessId = (value: string): string => {
  return value.trim();
};

export const isCanonicalHarnessId = (value: string): boolean => {
  const normalizedId = normalizeHarnessId(value);
  return normalizedId.length > 0 && normalizedId === value;
};

export const normalizeHarnessId = (value: string): string => {
  return value.trim();
};

export const isCanonicalHarnessId = (value: string): boolean => {
  const normalizedId = normalizeHarnessId(value);
  return normalizedId.length > 0 && normalizedId === value;
};

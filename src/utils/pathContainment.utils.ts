import { isAbsolute, normalize, relative, resolve } from "node:path";

import { PLATFORM } from "@/constants/platform";

const normalizeForComparison = (value: string): string => {
  const normalized = normalize(value);
  if (process.platform === PLATFORM.WIN32) {
    return normalized.toLowerCase();
  }
  return normalized;
};

export const isPathWithinBase = (candidatePath: string, basePath: string): boolean => {
  const normalizedBase = resolve(basePath);
  const normalizedCandidate = isAbsolute(candidatePath)
    ? normalize(candidatePath)
    : resolve(normalizedBase, candidatePath);
  const comparableBase = normalizeForComparison(normalizedBase);
  const comparableCandidate = normalizeForComparison(normalizedCandidate);
  const relativePath = relative(comparableBase, comparableCandidate);

  if (relativePath.length === 0 || relativePath === ".") {
    return true;
  }

  return !relativePath.startsWith("..") && !isAbsolute(relativePath);
};

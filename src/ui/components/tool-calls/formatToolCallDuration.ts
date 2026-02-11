import { LIMIT } from "@/config/limits";

export const formatDurationMs = (ms: number): string => {
  if (ms < LIMIT.DURATION_FORMAT_MS_THRESHOLD) return `${ms}ms`;
  if (ms < LIMIT.DURATION_FORMAT_MIN_THRESHOLD) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / LIMIT.DURATION_FORMAT_MIN_THRESHOLD)}m ${Math.floor(
    (ms % LIMIT.DURATION_FORMAT_MIN_THRESHOLD) / 1000
  )}s`;
};

export const formatDuration = (start: Date, end: Date): string =>
  formatDurationMs(end.getTime() - start.getTime());

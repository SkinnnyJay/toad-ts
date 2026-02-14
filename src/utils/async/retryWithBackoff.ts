import { LIMIT } from "@/config/limits";

export interface RetryWithBackoffOptions {
  maxAttempts: number;
  baseMs: number;
  capMs: number;
  jitterRatio?: number;
  randomFn?: () => number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (payload: { attempt: number; delayMs: number; error: Error }) => void;
}

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const clampDelay = (value: number, capMs: number): number => Math.max(0, Math.min(value, capMs));

const withJitter = (
  delayMs: number,
  capMs: number,
  jitterRatio: number,
  randomFn: () => number
): number => {
  if (jitterRatio <= 0) {
    return clampDelay(delayMs, capMs);
  }
  const jitterRange = delayMs * jitterRatio;
  const jitteredDelay =
    delayMs - jitterRange + randomFn() * jitterRange * LIMIT.RETRY_JITTER_SPAN_MULTIPLIER;
  return clampDelay(jitteredDelay, capMs);
};

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryWithBackoffOptions
): Promise<T> {
  const {
    maxAttempts,
    baseMs,
    capMs,
    onRetry,
    shouldRetry,
    jitterRatio = LIMIT.RETRY_JITTER_RATIO,
    randomFn = Math.random,
  } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      const normalized = toError(error);
      lastError = normalized;
      const hasNextAttempt = attempt < maxAttempts;
      const retryable = shouldRetry ? shouldRetry(normalized) : true;

      if (!hasNextAttempt || !retryable) {
        throw normalized;
      }

      const delayWithoutJitter = Math.min(
        baseMs * LIMIT.RETRY_EXPONENTIAL_BASE ** (attempt - 1),
        capMs
      );
      const delay = withJitter(delayWithoutJitter, capMs, jitterRatio, randomFn);
      onRetry?.({ attempt, delayMs: delay, error: normalized });
      await sleep(delay);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("retryWithBackoff failed without recorded error");
}

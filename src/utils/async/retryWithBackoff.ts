export interface RetryWithBackoffOptions {
  maxAttempts: number;
  baseMs: number;
  capMs: number;
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

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryWithBackoffOptions
): Promise<T> {
  const { maxAttempts, baseMs, capMs, onRetry, shouldRetry } = options;
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

      const delay = Math.min(baseMs * 2 ** (attempt - 1), capMs);
      onRetry?.({ attempt, delayMs: delay, error: normalized });
      await sleep(delay);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("retryWithBackoff failed without recorded error");
}

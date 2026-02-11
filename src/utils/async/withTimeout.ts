export type AsyncStepLabel = "connect" | "initialize" | "create session";

export const withTimeout = async <T>(
  promise: Promise<T>,
  label: AsyncStepLabel,
  timeoutMs: number
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${timeoutMs}ms. Ensure the agent CLI is running and (for ACP agents) started with ACP support.`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

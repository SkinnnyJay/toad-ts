import { describe, expect, it, vi } from "vitest";
import { retryWithBackoff } from "../../../src/utils/async/retryWithBackoff";

describe("retryWithBackoff", () => {
  it("retries with exponential backoff until success", async () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const operation = vi.fn(async (attempt: number) => {
      if (attempt < 3) {
        throw new Error(`fail ${attempt}`);
      }
      return "ok";
    });

    const promise = retryWithBackoff(operation, {
      maxAttempts: 3,
      baseMs: 50,
      capMs: 200,
      jitterRatio: 0,
      onRetry,
    });

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ attempt: 1, delayMs: 50 })
    );
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ attempt: 2, delayMs: 100 })
    );

    vi.useRealTimers();
  });

  it("stops when shouldRetry returns false", async () => {
    vi.useFakeTimers();
    const error = new Error("fatal");
    const operation = vi.fn(async () => {
      throw error;
    });

    await expect(
      retryWithBackoff(operation, {
        maxAttempts: 3,
        baseMs: 10,
        capMs: 10,
        jitterRatio: 0,
        shouldRetry: (err) => {
          expect(err).toBe(error);
          return false;
        },
        onRetry: vi.fn(),
      })
    ).rejects.toThrow("fatal");

    expect(operation).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("applies bounded jitter to retry delays", async () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const operation = vi.fn(async (attempt: number) => {
      if (attempt < 2) {
        throw new Error("transient");
      }
      return "ok";
    });

    const promise = retryWithBackoff(operation, {
      maxAttempts: 2,
      baseMs: 100,
      capMs: 110,
      jitterRatio: 0.2,
      randomFn: () => 1,
      onRetry,
    });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("ok");
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 110 }));
    vi.useRealTimers();
  });

  it("de-correlates retry delays with jittered base offsets", async () => {
    vi.useFakeTimers();
    const collectDelay = async (randomValue: number): Promise<number> => {
      const onRetry = vi.fn();
      const operation = vi.fn(async (attempt: number) => {
        if (attempt < 2) {
          throw new Error("transient");
        }
        return "ok";
      });

      const promise = retryWithBackoff(operation, {
        maxAttempts: 2,
        baseMs: 100,
        capMs: 500,
        jitterRatio: 0.2,
        randomFn: () => randomValue,
        onRetry,
      });
      await vi.runAllTimersAsync();
      await promise;
      return onRetry.mock.calls[0]?.[0]?.delayMs ?? 0;
    };

    const lowRandomDelay = await collectDelay(0);
    const highRandomDelay = await collectDelay(1);
    expect(highRandomDelay).toBeGreaterThan(lowRandomDelay);
    vi.useRealTimers();
  });
});

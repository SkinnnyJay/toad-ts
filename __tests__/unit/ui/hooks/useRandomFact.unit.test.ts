import { FACT_ROTATE_INTERVAL_MS } from "@/config/limits";
import { useRandomFact, useRotatingFact } from "@/ui/hooks/useRandomFact";
import { loadFacts, pickRandomFact } from "@/utils/facts-cache";
import React, { useEffect } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/facts-cache", () => ({
  loadFacts: vi.fn(),
  pickRandomFact: vi.fn(),
}));

interface RandomFactProbeProps {
  active?: boolean;
  intervalMs?: number;
  rotating?: boolean;
  onFact: (fact: string | null) => void;
}

const RandomFactProbe = ({
  active = false,
  intervalMs,
  rotating = false,
  onFact,
}: RandomFactProbeProps): React.JSX.Element => {
  const factResult = rotating ? useRotatingFact(active, intervalMs) : useRandomFact();

  useEffect(() => {
    onFact(factResult.fact);
  }, [factResult.fact, onFact]);

  return React.createElement(React.Fragment);
};

const flushAsyncUpdates = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("useRandomFact hooks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads facts once and picks a random fact for useRandomFact", async () => {
    const loadFactsMock = vi.mocked(loadFacts);
    const pickRandomFactMock = vi.mocked(pickRandomFact);
    loadFactsMock.mockResolvedValue([]);
    pickRandomFactMock.mockReturnValue("fact-one");

    const observedFacts: Array<string | null> = [];
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        React.createElement(RandomFactProbe, {
          onFact: (fact) => observedFacts.push(fact),
        })
      );
    });

    await flushAsyncUpdates();

    expect(loadFactsMock).toHaveBeenCalledTimes(1);
    expect(pickRandomFactMock).toHaveBeenCalledTimes(1);
    expect(observedFacts.at(-1)).toBe("fact-one");

    act(() => {
      renderer.unmount();
    });
  });

  it("does not load facts when rotating hook is inactive", async () => {
    const loadFactsMock = vi.mocked(loadFacts);
    const observedFacts: Array<string | null> = [];
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        React.createElement(RandomFactProbe, {
          rotating: true,
          active: false,
          onFact: (fact) => observedFacts.push(fact),
        })
      );
    });

    await flushAsyncUpdates();

    expect(loadFactsMock).not.toHaveBeenCalled();
    expect(observedFacts.at(-1)).toBeNull();

    act(() => {
      renderer.unmount();
    });
  });

  it("rotates facts at configured intervals while active", async () => {
    const loadFactsMock = vi.mocked(loadFacts);
    const pickRandomFactMock = vi.mocked(pickRandomFact);
    loadFactsMock.mockResolvedValue([]);
    pickRandomFactMock
      .mockReturnValueOnce("fact-initial")
      .mockReturnValueOnce("fact-rotated")
      .mockReturnValue("fact-later");

    const observedFacts: Array<string | null> = [];
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        React.createElement(RandomFactProbe, {
          rotating: true,
          active: true,
          intervalMs: FACT_ROTATE_INTERVAL_MS,
          onFact: (fact) => observedFacts.push(fact),
        })
      );
    });

    await flushAsyncUpdates();
    expect(observedFacts.at(-1)).toBe("fact-initial");

    act(() => {
      vi.advanceTimersByTime(FACT_ROTATE_INTERVAL_MS);
    });
    expect(observedFacts.at(-1)).toBe("fact-rotated");

    act(() => {
      renderer.unmount();
    });

    const pickCallsAfterUnmount = pickRandomFactMock.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(FACT_ROTATE_INTERVAL_MS);
    });
    expect(pickRandomFactMock.mock.calls.length).toBe(pickCallsAfterUnmount);
  });
});

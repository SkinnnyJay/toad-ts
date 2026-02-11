import { useCursorCloudAgentCount } from "@/ui/hooks/useCursorCloudAgentCount";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInk } from "../../../utils/ink-test-helpers";

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("useCursorCloudAgentCount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays idle when disabled", async () => {
    const createClient = vi.fn(() => ({
      listAgents: vi.fn(async () => ({ agents: [{ id: "a" }] })),
    }));

    function TestComponent() {
      const result = useCursorCloudAgentCount({
        enabled: false,
        createClient,
      });
      return React.createElement(
        "text",
        null,
        `count:${result.count ?? "none"} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await vi.advanceTimersByTimeAsync(0);
    await flushMicrotasks();

    expect(createClient).not.toHaveBeenCalled();
    expect(lastFrame()).toContain("count:none");
    expect(lastFrame()).toContain("loading:false");
    expect(lastFrame()).toContain("error:none");

    unmount();
  });

  it("loads and polls cloud agent count when enabled", async () => {
    const listAgents = vi
      .fn<() => Promise<{ agents: Array<{ id: string }> }>>()
      .mockResolvedValue({ agents: [{ id: "one" }, { id: "two" }] });

    function TestComponent() {
      const result = useCursorCloudAgentCount({
        enabled: true,
        pollIntervalMs: 1_000,
        createClient: () => ({ listAgents }),
      });
      return React.createElement(
        "text",
        null,
        `count:${result.count ?? "none"} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await vi.advanceTimersByTimeAsync(0);
    await flushMicrotasks();

    expect(listAgents).toHaveBeenCalledTimes(1);
    expect(lastFrame()).toContain("count:2");
    expect(lastFrame()).toContain("loading:false");
    expect(lastFrame()).toContain("error:none");

    await vi.advanceTimersByTimeAsync(1_000);
    await flushMicrotasks();

    expect(listAgents).toHaveBeenCalledTimes(2);

    unmount();
  });
});

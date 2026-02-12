import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionModelTab } from "../../../src/ui/components/SessionModelTab";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, waitFor } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("SessionModelTab", () => {
  it("renders empty-state guidance when no cached models exist", () => {
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModelTab, {
          isActive: true,
          availableModels: [],
        })
      )
    );

    expect(lastFrame()).toContain("Session Model");
    expect(lastFrame()).toContain("No models cached for this session yet.");
    expect(lastFrame()).toContain("Run /models to fetch and cache model options.");
  });

  it("selects highlighted model with keyboard and enter", async () => {
    const onSelectModel = vi.fn(async () => undefined);
    const { lastFrame, stdin } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModelTab, {
          isActive: true,
          availableModels: [
            { modelId: "auto", name: "Auto" },
            { modelId: "fast", name: "Fast Model" },
          ],
          currentModelId: "auto",
          onSelectModel,
        })
      )
    );

    stdin.write("\x1B[B");
    stdin.write("\r");

    await waitFor(() => onSelectModel.mock.calls.length === 1);
    expect(onSelectModel).toHaveBeenCalledWith("fast");
    await waitFor(() => lastFrame().includes("Updated session model to fast."));
    expect(lastFrame()).toContain("Updated session model to fast.");
  });
});

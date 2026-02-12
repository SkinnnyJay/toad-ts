import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionModelTab } from "../../../src/ui/components/SessionModelTab";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, waitFor } from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

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
    expect(lastFrame()).toContain("TOADSTOOL will try to refresh automatically");
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

  it("refreshes model list on Ctrl+R", async () => {
    const onRefreshModels = vi.fn(async () => undefined);
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModelTab, {
          isActive: true,
          availableModels: [{ modelId: "auto", name: "Auto" }],
          onRefreshModels,
        })
      )
    );

    keyboardRuntime.emit("r", { ctrl: true });
    await waitFor(() => onRefreshModels.mock.calls.length === 1);
    await waitFor(() => lastFrame().includes("Refreshed model list."));
    expect(lastFrame()).toContain("Refreshed model list.");
  });

  it("attempts one automatic refresh when no models are cached", async () => {
    const onRefreshModels = vi.fn(async () => undefined);
    const { rerender } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModelTab, {
          isActive: true,
          availableModels: [],
          onRefreshModels,
        })
      )
    );

    await waitFor(() => onRefreshModels.mock.calls.length === 1);

    rerender(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModelTab, {
          isActive: true,
          availableModels: [],
          onRefreshModels,
        })
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(onRefreshModels).toHaveBeenCalledTimes(1);
  });

  it("shows object-shaped refresh failure message details", async () => {
    const onRefreshModels = vi.fn(async () => {
      throw { message: "refresh object failure" };
    });
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModelTab, {
          isActive: true,
          availableModels: [{ modelId: "auto", name: "Auto" }],
          onRefreshModels,
        })
      )
    );

    keyboardRuntime.emit("r", { ctrl: true });
    await waitFor(() => onRefreshModels.mock.calls.length === 1);
    await waitFor(() => lastFrame().includes("Failed to refresh models: refresh object failure"));
    expect(lastFrame()).toContain("Failed to refresh models: refresh object failure");
  });
});

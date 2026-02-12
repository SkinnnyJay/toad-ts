import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionModeTab } from "../../../src/ui/components/SessionModeTab";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, waitFor } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("SessionModeTab", () => {
  it("renders available session mode options", () => {
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModeTab, {
          isActive: true,
          currentMode: SESSION_MODE.AUTO,
        })
      )
    );

    expect(lastFrame()).toContain("Session Mode");
    expect(lastFrame()).toContain("Auto (auto)");
    expect(lastFrame()).toContain("Read-only (read-only)");
    expect(lastFrame()).toContain("Full access (full-access)");
  });

  it("switches mode with keyboard navigation and enter", async () => {
    const onSelectMode = vi.fn(async () => undefined);
    const { stdin, lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(SessionModeTab, {
          isActive: true,
          currentMode: SESSION_MODE.AUTO,
          onSelectMode,
        })
      )
    );

    stdin.write("\x1B[B");
    stdin.write("\r");

    await waitFor(() => onSelectMode.mock.calls.length === 1);
    expect(onSelectMode).toHaveBeenCalledWith(SESSION_MODE.READ_ONLY);
    await waitFor(() => lastFrame().includes("Updated session mode to read-only."));
  });
});

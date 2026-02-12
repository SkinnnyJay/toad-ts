import { CONNECTION_STATUS } from "@/constants/connection-status";
import { FOCUS_TARGET } from "@/constants/focus-target";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { describe, expect, it } from "vitest";
import { StatusFooter } from "../../../src/ui/components/StatusFooter";
import { renderInk } from "../../utils/ink-test-helpers";

describe("StatusFooter", () => {
  it("renders model and cloud agent count when provided", () => {
    const { lastFrame } = renderInk(
      React.createElement(StatusFooter, {
        focusTarget: FOCUS_TARGET.CHAT,
        connectionStatus: CONNECTION_STATUS.CONNECTED,
        sessionMode: SESSION_MODE.AUTO,
        sessionId: "session-1",
        agentName: "Cursor CLI",
        modelName: "auto",
        cloudAgentCount: 3,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain("Agent: Cursor CLI");
    expect(frame).toContain("Model: auto");
    expect(frame).toContain("Cloud: 3");
  });

  it("omits cloud status segment when count is not set", () => {
    const { lastFrame } = renderInk(
      React.createElement(StatusFooter, {
        focusTarget: FOCUS_TARGET.CHAT,
        connectionStatus: CONNECTION_STATUS.DISCONNECTED,
        sessionMode: SESSION_MODE.AUTO,
      })
    );

    expect(lastFrame()).not.toContain("Cloud:");
  });

  it("renders workspace and pull request review status when provided", () => {
    const { lastFrame } = renderInk(
      React.createElement(StatusFooter, {
        focusTarget: FOCUS_TARGET.CHAT,
        workspacePath: "/workspace/my-repo",
        prStatus: {
          url: "https://github.com/example/repo/pull/123",
          reviewDecision: "approved",
        },
      })
    );

    const frame = lastFrame();
    expect(frame).toContain("Workspace: my-repo");
    expect(frame).toContain("Review: PR #123 (approved)");
  });

  it("extracts pull request number from nested pull URL paths", () => {
    const { lastFrame } = renderInk(
      React.createElement(StatusFooter, {
        focusTarget: FOCUS_TARGET.CHAT,
        prStatus: {
          url: "https://github.com/example/repo/pull/456/files",
          reviewDecision: "review_requested",
        },
      })
    );

    expect(lastFrame()).toContain("Review: PR #456 (review requested)");
  });
});

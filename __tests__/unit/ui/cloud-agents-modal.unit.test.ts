import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudAgentsModal } from "../../../src/ui/components/CloudAgentsModal";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, waitFor } from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

afterEach(() => {
  cleanup();
});

describe("CloudAgentsModal", () => {
  it("renders empty-state guidance when no cloud agents are available", () => {
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(CloudAgentsModal, {
          isOpen: true,
          agents: [],
          onClose: () => {},
        })
      )
    );

    expect(lastFrame()).toContain("Cloud Agents");
    expect(lastFrame()).toContain("No cloud agents available.");
  });

  it("fetches selected agent status when pressing Enter", async () => {
    const onFetchStatus = vi.fn(async () => ({
      id: "agent-1",
      status: "running",
      model: "auto",
    }));
    const { stdin, lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(CloudAgentsModal, {
          isOpen: true,
          agents: [{ id: "agent-1", status: "pending" }],
          onClose: () => {},
          onFetchStatus,
        })
      )
    );

    stdin.write("\r");

    await waitFor(() => onFetchStatus.mock.calls.length === 1);
    expect(onFetchStatus).toHaveBeenCalledWith("agent-1");
    await waitFor(() => lastFrame().includes("Status: agent-1 running (auto)"));
  });

  it("stops selected agent on Ctrl+X", async () => {
    const onStopAgent = vi.fn(async () => undefined);
    renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(CloudAgentsModal, {
          isOpen: true,
          agents: [{ id: "agent-1", status: "pending" }],
          onClose: () => {},
          onStopAgent,
        })
      )
    );

    keyboardRuntime.emit("x", { ctrl: true });

    await waitFor(() => onStopAgent.mock.calls.length === 1);
    expect(onStopAgent).toHaveBeenCalledWith("agent-1");
  });

  it("sends follow-up to selected agent on Ctrl+F using filter text", async () => {
    const onSendFollowup = vi.fn(async () => undefined);
    const { stdin } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(CloudAgentsModal, {
          isOpen: true,
          agents: [{ id: "agent-1", status: "pending" }],
          onClose: () => {},
          onSendFollowup,
        })
      )
    );

    stdin.write("continue");
    keyboardRuntime.emit("f", { ctrl: true });

    await waitFor(() => onSendFollowup.mock.calls.length === 1);
    expect(onSendFollowup).toHaveBeenCalledWith("agent-1", "continue");
  });
});

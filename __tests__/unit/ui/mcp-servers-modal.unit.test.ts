import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpServersModal } from "../../../src/ui/components/McpServersModal";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, waitFor } from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

afterEach(() => {
  cleanup();
});

describe("McpServersModal", () => {
  it("renders empty-state guidance when no servers exist", () => {
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(McpServersModal, {
          isOpen: true,
          servers: [],
          onClose: () => {},
        })
      )
    );

    expect(lastFrame()).toContain("MCP Servers");
    expect(lastFrame()).toContain("No MCP servers available.");
  });

  it("enables selected MCP server with Ctrl+E", async () => {
    const onEnableServer = vi.fn(async () => undefined);
    renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(McpServersModal, {
          isOpen: true,
          servers: [{ id: "github", status: "enabled", enabled: true }],
          onClose: () => {},
          onEnableServer,
        })
      )
    );

    keyboardRuntime.emit("e", { ctrl: true });
    await waitFor(() => onEnableServer.mock.calls.length === 1);
    expect(onEnableServer).toHaveBeenCalledWith("github");
  });

  it("disables selected MCP server with Ctrl+D", async () => {
    const onDisableServer = vi.fn(async () => undefined);
    renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(McpServersModal, {
          isOpen: true,
          servers: [{ id: "github", status: "enabled", enabled: true }],
          onClose: () => {},
          onDisableServer,
        })
      )
    );

    keyboardRuntime.emit("d", { ctrl: true });
    await waitFor(() => onDisableServer.mock.calls.length === 1);
    expect(onDisableServer).toHaveBeenCalledWith("github");
  });

  it("lists selected MCP server tools with Ctrl+T", async () => {
    const onListServerTools = vi.fn(async () => ["read_file", "write_file"]);
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(McpServersModal, {
          isOpen: true,
          servers: [{ id: "github", status: "enabled", enabled: true }],
          onClose: () => {},
          onListServerTools,
        })
      )
    );

    keyboardRuntime.emit("t", { ctrl: true });
    await waitFor(() => onListServerTools.mock.calls.length === 1);
    expect(onListServerTools).toHaveBeenCalledWith("github");
    await waitFor(() => lastFrame().includes("Tools (2): read_file, write_file"));
  });
});

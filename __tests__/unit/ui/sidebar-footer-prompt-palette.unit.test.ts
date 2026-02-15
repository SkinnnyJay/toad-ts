import React from "react";
import { act } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import { CONNECTION_STATUS } from "../../../src/constants/connection-status";
import { SESSION_MODE } from "../../../src/constants/session-modes";
import { useAppStore } from "../../../src/store/app-store";
import { SessionIdSchema } from "../../../src/types/domain";
import { CommandPalette } from "../../../src/ui/components/CommandPalette";
import { InputWithAutocomplete } from "../../../src/ui/components/InputWithAutocomplete";
import { Sidebar } from "../../../src/ui/components/Sidebar";
import { StatusFooter } from "../../../src/ui/components/StatusFooter";
import {
  cleanup,
  flush,
  renderInk,
  setupSession,
  waitFor,
  waitForText,
} from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("shows context attachments with hidden count", async () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();
    store.setContextAttachments(sessionId, ["a.md", "b.md", "c.md", "d.md", "e.md", "f.md"]);

    const { lastFrame } = renderInk(
      React.createElement(Sidebar, {
        currentSessionId: sessionId,
        focusTarget: "context",
        width: 60,
        height: 24,
      })
    );

    await flush();
    const frame = lastFrame();
    // eslint-disable-next-line no-console
    console.error("Sidebar frame (context)", frame);
    await waitForText({ lastFrame }, "Context", 500);
    await waitForText({ lastFrame }, "a.md", 500);
    await waitForText({ lastFrame }, "… 1 more", 500);
  });

  it("toggles accordion collapse state for files", async () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const { lastFrame, stdin } = renderInk(
      React.createElement(Sidebar, {
        currentSessionId: sessionId,
        focusTarget: "files",
        width: 60,
        height: 24,
      })
    );

    await waitForText({ lastFrame }, "Files");
    expect(useAppStore.getState().getAccordionCollapsed().files).toBeUndefined();

    stdin.write(" ");
    await waitFor(() => useAppStore.getState().getAccordionCollapsed().files === true, 500);

    stdin.write(" ");
    await waitFor(() => useAppStore.getState().getAccordionCollapsed().files === false, 500);
  });
});

describe("StatusFooter", () => {
  it("renders connection, agent, mode, session, and plan progress", () => {
    const { lastFrame } = renderInk(
      React.createElement(StatusFooter, {
        focusTarget: "files",
        connectionStatus: CONNECTION_STATUS.CONNECTED,
        sessionMode: SESSION_MODE.AUTO,
        sessionId: SessionIdSchema.parse("session-1234"),
        agentName: "Test Agent",
        modelName: "gpt-5",
        cloudAgentCount: 3,
        workspacePath: "/workspace/toadstool",
        prStatus: { url: "https://github.com/org/repo/pull/123", reviewDecision: "pass" },
        planProgress: { completed: 1, total: 3 },
        taskProgress: { completed: 2, total: 5 },
      }),
      { width: 160 }
    );

    const frame = lastFrame();
    expect(frame).toContain("Plan");
    expect(frame).toContain("1/3");
    expect(frame).toContain("Task");
    expect(frame).toContain("2/5");
    expect(frame).toContain("WS:");
    expect(frame).toContain("PR:");
    expect(frame).toContain("Model:");
    expect(frame).toContain("Cloud:");
    expect(frame).toContain("Cmd+F");
    expect(frame).toContain("/help");
  });
});

describe("InputWithAutocomplete", () => {
  it("shows slash command suggestions when typing a command", async () => {
    const { lastFrame } = renderInk(
      React.createElement(InputWithAutocomplete, {
        value: "/he",
        onChange: () => {},
        onSubmit: () => {},
        slashCommands: [
          { name: "/help", description: "Show help" },
          { name: "/clear", description: "Clear chat" },
        ],
        enableMentions: false,
      })
    );

    await waitForText({ lastFrame }, "Commands:");
    await waitForText({ lastFrame }, "/help");
  });
});

describe("CommandPalette", () => {
  it("renders open palette with section headers and commands", () => {
    const commands = [
      { name: "/help", description: "Show help" },
      { name: "/mode", description: "Change mode", args: "<mode>" },
    ];

    const { lastFrame } = renderInk(
      React.createElement(CommandPalette, {
        commands,
        isOpen: true,
        onClose: () => {},
        onSelect: () => {},
      })
    );

    const frame = lastFrame();
    expect(frame).toContain("Other [-]" /* section header when commands have no category */);
    expect(frame).toContain("/help");
    expect(frame).toContain("/mode");
    expect(frame).toContain("Change mode");
  });

  it("throttles command filtering through deferred query updates", async () => {
    const commands = [
      { name: "/alpha", description: "Alpha command" },
      { name: "/zebra", description: "Zebra command" },
    ];

    const { lastFrame } = renderInk(
      React.createElement(CommandPalette, {
        commands,
        isOpen: true,
        onClose: () => {},
        onSelect: () => {},
      })
    );

    act(() => {
      keyboardRuntime.emit("z");
    });
    await waitFor(() => {
      const frame = lastFrame();
      return frame.includes("/zebra") && !frame.includes("/alpha");
    }, 500);
  });
});

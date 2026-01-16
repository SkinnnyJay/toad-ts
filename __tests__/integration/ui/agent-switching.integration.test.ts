import { CONNECTION_STATUS } from "@/constants/connection-status";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, SessionIdSchema } from "../../../src/types/domain";
import { Chat } from "../../../src/ui/components/Chat";
import { cleanup, createMockAgent, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Agent Switching", () => {
  it("preserves session when switching agents", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Add a message to the session
    store.appendMessage({
      id: SessionIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: "text", text: "Hello" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    // Render with first agent
    const { rerender, lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent("agent-1", "Agent One"),
      })
    );

    expect(lastFrame()).toContain("Hello");

    // Switch to second agent (simulate Ctrl+P behavior)
    rerender(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent("agent-2", "Agent Two"),
      })
    );

    // Messages should still be visible
    expect(lastFrame()).toContain("Hello");
    expect(lastFrame()).toContain("Agent Two");
  });
});

import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, SessionIdSchema } from "../../../src/types/domain";
import { Chat } from "../../../src/ui/components/Chat";
import {
  cleanup,
  createMockAgent,
  renderInk,
  setupSession,
  waitFor,
} from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Session Management", () => {
  it("creates a new session and displays it", () => {
    const sessionId1 = setupSession({ sessionId: "session-1" });
    const store = useAppStore.getState();
    store.setCurrentSession(sessionId1);

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId: sessionId1,
        agent: createMockAgent(),
      })
    );

    expect(lastFrame()).toContain("session-1");
    expect(useAppStore.getState().currentSessionId).toBe(sessionId1);
  });

  it("switches between multiple sessions", () => {
    // Create first session
    const sessionId1 = setupSession({ sessionId: "session-1" });
    const store1 = useAppStore.getState();
    store1.setCurrentSession(sessionId1);

    // Create second session
    const sessionId2 = setupSession({ sessionId: "session-2" });
    const store2 = useAppStore.getState();
    store2.setCurrentSession(sessionId2);

    // Verify second session is active
    expect(useAppStore.getState().currentSessionId).toBe(sessionId2);

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId: sessionId2,
        agent: createMockAgent(),
      })
    );

    expect(lastFrame()).toContain("session-2");
  });

  it("preserves messages when switching sessions", () => {
    const store = useAppStore.getState();
    store.reset();

    // Create first session manually (without setupSession to avoid reset)
    const sessionId1 = SessionIdSchema.parse("session-1");
    store.setCurrentSession(sessionId1);
    store.upsertSession({
      session: {
        id: sessionId1,
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: SESSION_MODE.AUTO,
      },
    });

    store.appendMessage({
      id: SessionIdSchema.parse("msg-1"),
      sessionId: sessionId1,
      role: "user",
      content: [{ type: "text", text: "Message in session 1" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    // Create second session manually
    const sessionId2 = SessionIdSchema.parse("session-2");
    store.setCurrentSession(sessionId2);
    store.upsertSession({
      session: {
        id: sessionId2,
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: SESSION_MODE.AUTO,
      },
    });

    store.appendMessage({
      id: SessionIdSchema.parse("msg-2"),
      sessionId: sessionId2,
      role: "user",
      content: [{ type: "text", text: "Message in session 2" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    // Switch back to first session
    store.setCurrentSession(sessionId1);

    const messages1 = store.getMessagesForSession(sessionId1);
    const messages2 = store.getMessagesForSession(sessionId2);

    // Both sessions should have their messages
    expect(messages1).toHaveLength(1);
    expect(messages1[0]?.content[0]).toHaveProperty("text", "Message in session 1");
    expect(messages2).toHaveLength(1);
    expect(messages2[0]?.content[0]).toHaveProperty("text", "Message in session 2");
  });

  it("displays correct session info in UI", () => {
    const sessionId = setupSession({ sessionId: "test-session" });

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent("agent-1", "Test Agent"),
      })
    );

    expect(lastFrame()).toContain("test-session");
    expect(lastFrame()).toContain("Test Agent");
  });
});

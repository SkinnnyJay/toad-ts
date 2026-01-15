import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, SessionIdSchema } from "../../../src/types/domain";
import { Chat } from "../../../src/ui/components/Chat";

describe("Chat", () => {
  it("renders empty state", () => {
    const sessionId = SessionIdSchema.parse("s-chat");
    const store = useAppStore.getState();
    store.reset();
    store.setCurrentSession(sessionId);
    store.upsertSession({
      session: {
        id: sessionId,
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    const { lastFrame } = render(
      React.createElement(Chat, {
        sessionId,
        agent: { id: AgentIdSchema.parse("agent-1"), name: "Agent" },
      })
    );
    expect(lastFrame()).toContain("No messages yet");
  });
});

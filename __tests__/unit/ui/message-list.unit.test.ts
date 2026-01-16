import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, MessageIdSchema } from "../../../src/types/domain";
import { MessageList } from "../../../src/ui/components/MessageList";
import { cleanup, createMockAgent, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("MessageList", () => {
  it("displays empty state when no messages", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });

    const { lastFrame } = renderInk(
      React.createElement(MessageList, {
        messages: [],
      })
    );

    expect(lastFrame()).toContain("No messages yet");
  });

  it("displays messages in chronological order", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Add messages in non-chronological order
    const msg1 = {
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user" as const,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "First message" }],
      createdAt: 1000,
      isStreaming: false,
    };

    const msg2 = {
      id: MessageIdSchema.parse("msg-2"),
      sessionId,
      role: "assistant" as const,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Second message" }],
      createdAt: 2000,
      isStreaming: false,
    };

    const msg3 = {
      id: MessageIdSchema.parse("msg-3"),
      sessionId,
      role: "user" as const,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Third message" }],
      createdAt: 3000,
      isStreaming: false,
    };

    store.appendMessage(msg1);
    store.appendMessage(msg2);
    store.appendMessage(msg3);

    const messages = store.getMessagesForSession(sessionId);

    const { lastFrame } = renderInk(
      React.createElement(MessageList, {
        messages,
      })
    );

    // Messages should appear in chronological order
    const frame = lastFrame();
    const firstIndex = frame.indexOf("First message");
    const secondIndex = frame.indexOf("Second message");
    const thirdIndex = frame.indexOf("Third message");

    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(firstIndex);
    expect(thirdIndex).toBeGreaterThan(secondIndex);
  });

  it("displays user and assistant messages", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "User message" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    store.appendMessage({
      id: MessageIdSchema.parse("msg-2"),
      sessionId,
      role: "assistant",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Assistant message" }],
      createdAt: Date.now() + 1,
      isStreaming: false,
    });

    const messages = store.getMessagesForSession(sessionId);

    const { lastFrame } = renderInk(
      React.createElement(MessageList, {
        messages,
      })
    );

    expect(lastFrame()).toContain("User message");
    expect(lastFrame()).toContain("Assistant message");
  });

  it("handles many messages without crashing", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Add 50 messages
    for (let i = 0; i < 50; i += 1) {
      store.appendMessage({
        id: MessageIdSchema.parse(`msg-${i}`),
        sessionId,
        role: i % 2 === 0 ? "user" : "assistant",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: `Message ${i}` }],
        createdAt: Date.now() + i,
        isStreaming: false,
      });
    }

    const messages = store.getMessagesForSession(sessionId);

    const { lastFrame } = renderInk(
      React.createElement(MessageList, {
        messages,
      })
    );

    // Should render without crashing
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()).toContain("Message 0");
    expect(lastFrame()).toContain("Message 49");
  });
});

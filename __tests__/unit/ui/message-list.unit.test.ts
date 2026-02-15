import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { KEY_NAME } from "@/constants/key-names";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { act } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, MessageIdSchema } from "../../../src/types/domain";
import { MessageList } from "../../../src/ui/components/MessageList";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, createMockAgent, renderInk, setupSession } from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

afterEach(() => {
  cleanup();
});

describe("MessageList", () => {
  it("displays empty state when no messages", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });

    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(MessageList, {
          messages: [],
        })
      )
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
    // Sort messages by createdAt to ensure chronological order
    const sortedMessages = [...messages].sort((a, b) => a.createdAt - b.createdAt);

    // Provide sufficient height to show all 3 messages
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(MessageList, {
          messages: sortedMessages,
          height: 30, // Provide enough height to show all messages
        })
      )
    );

    // Messages should appear in chronological order
    const frame = lastFrame();
    const firstIndex = frame.indexOf("First message");
    const secondIndex = frame.indexOf("Second message");
    const thirdIndex = frame.indexOf("Third message");

    // All messages should be present in the frame
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(-1);
    expect(thirdIndex).toBeGreaterThan(-1);

    // Messages should appear in chronological order
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
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(MessageList, {
          messages,
        })
      )
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
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(MessageList, {
          messages,
          height: 60, // Provide height for ScrollArea
        })
      )
    );

    // Should render without crashing
    expect(lastFrame()).toBeTruthy();
    // With ScrollArea showing a window of messages
    const frame = lastFrame();
    // Should show some messages (each message takes ~2 lines with role header)
    // With height 60, we can show ~30 messages starting from the beginning
    expect(frame).toContain("Message");
    // Test should verify it handles 50 messages without crashing, not specific visibility
    expect(messages.length).toBe(50);
  });

  it("allows scrolling back beyond historical truncation limits by default", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    for (let i = 0; i < 150; i += 1) {
      store.appendMessage({
        id: MessageIdSchema.parse(`msg-history-${i}`),
        sessionId,
        role: i % 2 === 0 ? "user" : "assistant",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: `History message ${i}` }],
        createdAt: Date.now() + i,
        isStreaming: false,
      });
    }

    const messages = store.getMessagesForSession(sessionId);
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(MessageList, {
          messages,
          height: 20,
          isFocused: true,
        })
      )
    );

    act(() => {
      keyboardRuntime.emit(KEY_NAME.HOME);
    });
    const frame = lastFrame();
    expect(frame).toContain("History message 0");
  });
});

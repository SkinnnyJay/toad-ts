import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, MessageIdSchema } from "../../../src/types/domain";
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

describe("Messaging Integration", () => {
  it("displays messages that are added to the store", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Add message directly to store (simulating what happens when user sends)
    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Hello, agent!" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent(),
      })
    );

    // Message should appear in chat
    expect(lastFrame()).toContain("Hello, agent!");
  });

  it("displays streaming response character by character", async () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Simulate streaming response
    const messageId = MessageIdSchema.parse("msg-stream");
    store.appendMessage({
      id: messageId,
      sessionId,
      role: "assistant",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "" }],
      createdAt: Date.now(),
      isStreaming: true,
    });

    // Simulate streaming chunks
    const chunks = ["Hello", " ", "world", "!"];
    let accumulatedText = "";
    for (const chunk of chunks) {
      accumulatedText += chunk;
      const message = store.getMessage(messageId);
      if (message) {
        const textBlock = message.content.find((c) => c.type === CONTENT_BLOCK_TYPE.TEXT) as
          | { type: typeof CONTENT_BLOCK_TYPE.TEXT; text: string }
          | undefined;
        store.updateMessage({
          messageId,
          patch: {
            content: [
              ...message.content.filter((c) => c.type !== CONTENT_BLOCK_TYPE.TEXT),
              { type: CONTENT_BLOCK_TYPE.TEXT, text: accumulatedText },
            ],
          },
        });
      }
    }

    // Mark as complete
    store.updateMessage({ messageId, patch: { isStreaming: false } });

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent(),
      })
    );

    // Should contain the complete message
    await waitFor(() => lastFrame().includes("Hello world!"));
    expect(lastFrame()).toContain("Hello world!");
  });

  it("displays multiple messages in sequence", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Add multiple messages
    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "First message" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    store.appendMessage({
      id: MessageIdSchema.parse("msg-2"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Second message" }],
      createdAt: Date.now() + 1,
      isStreaming: false,
    });

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent(),
      })
    );

    // Both messages should be visible
    expect(lastFrame()).toContain("First message");
    expect(lastFrame()).toContain("Second message");
  });
});

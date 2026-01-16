import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { MessageIdSchema } from "../../../src/types/domain";
import { MessageItem } from "../../../src/ui/components/MessageItem";
import { cleanup, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Message Timestamps", () => {
  it("displays timestamp on message", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    const timestamp = Date.now();
    const date = new Date(timestamp);
    const expectedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Test message" }],
      createdAt: timestamp,
      isStreaming: false,
    });

    const message = store.getMessage(MessageIdSchema.parse("msg-1"));
    expect(message).toBeDefined();

    if (message) {
      const { lastFrame } = renderInk(
        React.createElement(MessageItem, {
          message,
        })
      );

      // Timestamp should be displayed (format: HH:MM)
      expect(lastFrame()).toContain(expectedTime);
    }
  });

  it("displays different timestamps for different messages", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 60000; // 1 minute later

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "First message" }],
      createdAt: timestamp1,
      isStreaming: false,
    });

    store.appendMessage({
      id: MessageIdSchema.parse("msg-2"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Second message" }],
      createdAt: timestamp2,
      isStreaming: false,
    });

    const message1 = store.getMessage(MessageIdSchema.parse("msg-1"));
    const message2 = store.getMessage(MessageIdSchema.parse("msg-2"));

    expect(message1).toBeDefined();
    expect(message2).toBeDefined();

    if (message1 && message2) {
      const time1 = new Date(timestamp1).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const time2 = new Date(timestamp2).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const { lastFrame: frame1 } = renderInk(
        React.createElement(MessageItem, {
          message: message1,
        })
      );

      const { lastFrame: frame2 } = renderInk(
        React.createElement(MessageItem, {
          message: message2,
        })
      );

      expect(frame1()).toContain(time1);
      expect(frame2()).toContain(time2);
    }
  });

  it("handles messages without timestamp gracefully", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Test message" }],
      createdAt: 0, // Invalid timestamp
      isStreaming: false,
    });

    const message = store.getMessage(MessageIdSchema.parse("msg-1"));
    expect(message).toBeDefined();

    if (message) {
      const { lastFrame } = renderInk(
        React.createElement(MessageItem, {
          message,
        })
      );

      // Should render without crashing
      expect(lastFrame()).toBeTruthy();
      expect(lastFrame()).toContain("Test message");
    }
  });
});

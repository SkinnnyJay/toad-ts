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

describe("Markdown Rendering", () => {
  it("renders plain text messages", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Plain text message" }],
      createdAt: Date.now(),
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

      expect(lastFrame()).toContain("Plain text message");
    }
  });

  it("renders text with markdown-like formatting", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    // Note: Actual markdown parsing would be handled by a markdown renderer
    // This test verifies that text content is displayed
    const markdownText = "# Heading\n\nThis is **bold** and *italic* text.";

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: markdownText }],
      createdAt: Date.now(),
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

      // Text should be rendered (markdown formatting would be applied by a renderer)
      expect(lastFrame()).toContain("Heading");
      expect(lastFrame()).toContain("bold");
      expect(lastFrame()).toContain("italic");
    }
  });

  it("handles multiple text blocks", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [
        { type: CONTENT_BLOCK_TYPE.TEXT, text: "First paragraph." },
        { type: CONTENT_BLOCK_TYPE.TEXT, text: "Second paragraph." },
      ],
      createdAt: Date.now(),
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

      expect(lastFrame()).toContain("First paragraph.");
      expect(lastFrame()).toContain("Second paragraph.");
    }
  });
});

/**
 * Note: Full markdown rendering (bold, italic, lists, links) is handled
 * by OpenTUI's <markdown> intrinsic with tree-sitter syntax highlighting.
 * These tests verify that text content passes through correctly.
 */

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

describe("Code Block Rendering", () => {
  it("renders code block with language", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [
        {
          type: CONTENT_BLOCK_TYPE.CODE,
          language: "typescript",
          text: "function hello() {\n  return 'world';\n}",
        },
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

      expect(lastFrame()).toContain("typescript");
      expect(lastFrame()).toContain("function hello()");
      expect(lastFrame()).toContain("return 'world'");
    }
  });

  it("renders code block without language", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [
        {
          type: CONTENT_BLOCK_TYPE.CODE,
          text: "console.log('hello');",
        },
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

      expect(lastFrame()).toContain("console.log");
    }
  });

  it("renders multi-line code block", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    const codeText = `function example() {
  const x = 1;
  const y = 2;
  return x + y;
}`;

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [
        {
          type: CONTENT_BLOCK_TYPE.CODE,
          language: "typescript",
          text: codeText,
        },
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

      expect(lastFrame()).toContain("function example()");
      expect(lastFrame()).toContain("const x = 1");
      expect(lastFrame()).toContain("return x + y");
    }
  });

  it("renders code block with text content together", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId,
      role: "assistant",
      content: [
        { type: CONTENT_BLOCK_TYPE.TEXT, text: "Here's some code:" },
        {
          type: CONTENT_BLOCK_TYPE.CODE,
          language: "javascript",
          text: "console.log('hello');",
        },
        { type: CONTENT_BLOCK_TYPE.TEXT, text: "That's it!" },
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

      expect(lastFrame()).toContain("Here's some code:");
      expect(lastFrame()).toContain("console.log");
      expect(lastFrame()).toContain("That's it!");
    }
  });
});

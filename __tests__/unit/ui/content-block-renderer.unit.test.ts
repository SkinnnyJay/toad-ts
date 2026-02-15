import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentBlockRenderer } from "../../../src/ui/components/messages/ContentBlockRenderer";
import { cleanup, renderInk } from "../../utils/ink-test-helpers";

const markdownRendererSpy = vi.hoisted(() => vi.fn(() => React.createElement("text", {}, "md")));

vi.mock("@/ui/components/MarkdownRenderer", () => ({
  MarkdownRenderer: markdownRendererSpy,
}));

afterEach(() => {
  cleanup();
  markdownRendererSpy.mockClear();
});

describe("ContentBlockRenderer streaming markdown behavior", () => {
  it("renders markdown renderer for non-streaming text blocks", () => {
    const { lastFrame } = renderInk(
      React.createElement(ContentBlockRenderer, {
        block: { type: CONTENT_BLOCK_TYPE.TEXT, text: "regular **markdown**" },
        messageId: "msg-1",
        index: 0,
        isStreaming: false,
      })
    );

    expect(lastFrame()).toContain("md");
    expect(markdownRendererSpy).toHaveBeenCalledTimes(1);
  });

  it("skips markdown renderer for streaming text blocks", () => {
    const { lastFrame } = renderInk(
      React.createElement(ContentBlockRenderer, {
        block: { type: CONTENT_BLOCK_TYPE.TEXT, text: "streaming **markdown** chunk" },
        messageId: "msg-1",
        index: 0,
        isStreaming: true,
      })
    );

    expect(lastFrame()).toContain("streaming **markdown** chunk");
    expect(markdownRendererSpy).not.toHaveBeenCalled();
  });
});

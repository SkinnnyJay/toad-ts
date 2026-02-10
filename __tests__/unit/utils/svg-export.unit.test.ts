import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import type { Message } from "@/types/domain";
import { exportConversationToSvg } from "@/utils/svg-export";
import { describe, expect, it } from "vitest";

const msg = (role: string, text: string): Message => ({
  id: MessageIdSchema.parse(`msg-${Date.now()}-${Math.random()}`),
  sessionId: SessionIdSchema.parse("test"),
  role: role as Message["role"],
  content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
  createdAt: Date.now(),
  isStreaming: false,
});

describe("SVG Export", () => {
  it("should generate valid SVG", () => {
    const messages = [msg(MESSAGE_ROLE.USER, "Hello"), msg(MESSAGE_ROLE.ASSISTANT, "Hi there!")];
    const svg = exportConversationToSvg(messages, "Test Session");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("Test Session");
    expect(svg).toContain("Hello");
  });

  it("should handle empty messages", () => {
    const svg = exportConversationToSvg([], "Empty");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("should escape XML special characters", () => {
    const messages = [msg(MESSAGE_ROLE.USER, "x < y && z > w")];
    const svg = exportConversationToSvg(messages);
    expect(svg).toContain("&lt;");
    expect(svg).toContain("&gt;");
    expect(svg).toContain("&amp;");
  });

  it("should handle code blocks", () => {
    const messages = [
      msg(MESSAGE_ROLE.ASSISTANT, "Here is code:\n```typescript\nconst x = 1;\n```"),
    ];
    const svg = exportConversationToSvg(messages);
    expect(svg).toContain("const x = 1;");
  });
});

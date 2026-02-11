import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { buildTitlePrompt, generateSessionTitle } from "@/core/auto-title";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import type { Message } from "@/types/domain";
import { describe, expect, it } from "vitest";

const msg = (role: string, text: string): Message => ({
  id: MessageIdSchema.parse(`msg-${Date.now()}-${Math.random()}`),
  sessionId: SessionIdSchema.parse("test"),
  role: role as Message["role"],
  content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
  createdAt: Date.now(),
  isStreaming: false,
});

describe("AutoTitle", () => {
  it("should generate title from first user message", () => {
    const messages = [msg(MESSAGE_ROLE.USER, "How does authentication work?")];
    expect(generateSessionTitle(messages)).toBe("How does authentication work?");
  });

  it("should truncate long titles", () => {
    const longText = "A".repeat(100);
    const messages = [msg(MESSAGE_ROLE.USER, longText)];
    const title = generateSessionTitle(messages);
    expect(title).not.toBeNull();
    expect(title?.length).toBeLessThanOrEqual(60);
  });

  it("should return null for no user messages", () => {
    const messages = [msg(MESSAGE_ROLE.ASSISTANT, "Hello!")];
    expect(generateSessionTitle(messages)).toBeNull();
  });

  it("should build a title prompt", () => {
    const messages = [
      msg(MESSAGE_ROLE.USER, "Fix the auth bug"),
      msg(MESSAGE_ROLE.ASSISTANT, "I see the issue in auth.ts"),
    ];
    const prompt = buildTitlePrompt(messages);
    expect(prompt).toContain("Generate a short");
    expect(prompt).toContain("Fix the auth bug");
  });
});

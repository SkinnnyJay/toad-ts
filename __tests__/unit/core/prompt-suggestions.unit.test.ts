import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { buildSuggestionPrompt, generateSuggestions } from "@/core/prompt-suggestions";
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

describe("PromptSuggestions", () => {
  it("should generate suggestions from error context", () => {
    const messages = [
      msg(MESSAGE_ROLE.USER, "Fix the bug"),
      msg(MESSAGE_ROLE.ASSISTANT, "I found an error in the authentication module"),
    ];
    const suggestions = generateSuggestions(messages);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("should generate suggestions from test context", () => {
    const messages = [
      msg(MESSAGE_ROLE.USER, "Add tests"),
      msg(MESSAGE_ROLE.ASSISTANT, "I added unit tests for the auth module"),
    ];
    const suggestions = generateSuggestions(messages);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("should return empty for no messages", () => {
    expect(generateSuggestions([])).toHaveLength(0);
  });

  it("should build a suggestion prompt", () => {
    const messages = [
      msg(MESSAGE_ROLE.USER, "What is this code doing?"),
      msg(MESSAGE_ROLE.ASSISTANT, "This code handles user authentication"),
    ];
    const prompt = buildSuggestionPrompt(messages);
    expect(prompt).toContain("suggest");
    expect(prompt).toContain("authentication");
  });
});

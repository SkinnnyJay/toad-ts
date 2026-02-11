import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import {
  ContextManager,
  computeContextBudget,
  computeContextStats,
  pruneToolOutputs,
  shouldAutoCompact,
} from "@/core/context-manager";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import type { Message } from "@/types/domain";
import { describe, expect, it } from "vitest";

const createMessages = (count: number, charsPerMessage: number): Message[] => {
  const sessionId = SessionIdSchema.parse("test-session");
  return Array.from({ length: count }, (_, i) => ({
    id: MessageIdSchema.parse(`msg-${i}`),
    sessionId,
    role: (i % 2 === 0 ? MESSAGE_ROLE.USER : MESSAGE_ROLE.ASSISTANT) as Message["role"],
    content: [{ type: CONTENT_BLOCK_TYPE.TEXT as const, text: "x".repeat(charsPerMessage) }],
    createdAt: Date.now() + i,
    isStreaming: false,
  }));
};

describe("Context Compaction Integration", () => {
  it("should track context growth and trigger compaction threshold", () => {
    // Each message ~250 chars → ~63 tokens. 100 messages → ~6250 tokens.
    const messages = createMessages(100, 250);
    const stats = computeContextStats(messages);
    expect(stats.tokens).toBeGreaterThan(5000);
    expect(stats.messageCount).toBe(100);

    // With a small context limit, this should be above threshold
    const budget = computeContextBudget(stats, 8000);
    expect(budget.ratio).toBeGreaterThan(0.5);
    expect(
      shouldAutoCompact(budget, {
        auto: true,
        threshold: 0.8,
        prune: true,
        preserveRecent: 5,
      })
    ).toBe(budget.ratio >= 0.8);
  });

  it("should prune tool outputs and reduce token count", () => {
    const sessionId = SessionIdSchema.parse("test-session");
    const longResult = "detailed output ".repeat(100);
    const messages: Message[] = [
      {
        id: MessageIdSchema.parse("msg-tool-0"),
        sessionId,
        role: MESSAGE_ROLE.ASSISTANT,
        content: [
          {
            type: CONTENT_BLOCK_TYPE.TOOL_CALL,
            toolCallId: "tc-1" as never,
            name: "bash",
            arguments: { command: "ls -la" },
            status: "succeeded" as never,
            result: longResult,
          },
        ],
        createdAt: 1000,
        isStreaming: false,
      },
      {
        id: MessageIdSchema.parse("msg-tool-1"),
        sessionId,
        role: MESSAGE_ROLE.ASSISTANT,
        content: [
          {
            type: CONTENT_BLOCK_TYPE.TOOL_CALL,
            toolCallId: "tc-2" as never,
            name: "grep",
            arguments: { pattern: "foo" },
            status: "succeeded" as never,
            result: longResult,
          },
        ],
        createdAt: 2000,
        isStreaming: false,
      },
      {
        id: MessageIdSchema.parse("msg-recent"),
        sessionId,
        role: MESSAGE_ROLE.USER,
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Continue" }],
        createdAt: 3000,
        isStreaming: false,
      },
    ];

    const beforeStats = computeContextStats(messages);
    const result = pruneToolOutputs(messages, 1);
    const afterStats = computeContextStats(messages);

    expect(result.pruned).toBe(2);
    expect(result.savedTokens).toBeGreaterThan(0);
    expect(afterStats.tokens).toBeLessThan(beforeStats.tokens);
  });

  it("should use ContextManager to compute per-session budgets", () => {
    const manager = new ContextManager();
    const sessionId = SessionIdSchema.parse("session-a");

    manager.setContextLimit(sessionId, 50000);
    expect(manager.getContextLimit(sessionId)).toBe(50000);

    const messages = createMessages(20, 200);
    const budget = manager.computeBudget(sessionId, messages);
    expect(budget.limit).toBe(50000);
    expect(budget.used).toBeGreaterThan(0);
    expect(budget.ratio).toBeGreaterThan(0);
    expect(budget.ratio).toBeLessThan(1);
  });
});

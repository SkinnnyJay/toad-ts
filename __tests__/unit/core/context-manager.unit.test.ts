import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import {
  computeContextBudget,
  computeContextStats,
  pruneToolOutputs,
  shouldAutoCompact,
} from "@/core/context-manager";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import type { Message } from "@/types/domain";
import { describe, expect, it } from "vitest";

const createMessage = (role: string, text: string, overrides?: Partial<Message>): Message => ({
  id: MessageIdSchema.parse(`msg-${Date.now()}-${Math.random()}`),
  sessionId: SessionIdSchema.parse("test-session"),
  role: role as Message["role"],
  content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
  createdAt: Date.now(),
  isStreaming: false,
  ...overrides,
});

describe("ContextManager", () => {
  describe("computeContextStats", () => {
    it("should count tokens from text messages", () => {
      const messages = [
        createMessage(MESSAGE_ROLE.USER, "Hello world"),
        createMessage(MESSAGE_ROLE.ASSISTANT, "Hi there, how can I help?"),
      ];
      const stats = computeContextStats(messages);
      expect(stats.tokens).toBeGreaterThan(0);
      expect(stats.chars).toBeGreaterThan(0);
      expect(stats.messageCount).toBe(2);
      expect(stats.userTokens).toBeGreaterThan(0);
      expect(stats.assistantTokens).toBeGreaterThan(0);
    });

    it("should return zero for empty messages", () => {
      const stats = computeContextStats([]);
      expect(stats.tokens).toBe(0);
      expect(stats.chars).toBe(0);
      expect(stats.messageCount).toBe(0);
    });
  });

  describe("computeContextBudget", () => {
    it("should compute budget ratio correctly", () => {
      const stats = {
        tokens: 50000,
        chars: 200000,
        bytes: 200000,
        messageCount: 10,
        userTokens: 25000,
        assistantTokens: 25000,
        toolTokens: 0,
      };
      const budget = computeContextBudget(stats, 100000);
      expect(budget.ratio).toBeCloseTo(0.5);
      expect(budget.level).toBe("medium");
    });

    it("should detect critical level", () => {
      const stats = {
        tokens: 96000,
        chars: 384000,
        bytes: 384000,
        messageCount: 50,
        userTokens: 48000,
        assistantTokens: 48000,
        toolTokens: 0,
      };
      const budget = computeContextBudget(stats, 100000);
      expect(budget.level).toBe("critical");
    });

    it("should detect low level", () => {
      const stats = {
        tokens: 10000,
        chars: 40000,
        bytes: 40000,
        messageCount: 5,
        userTokens: 5000,
        assistantTokens: 5000,
        toolTokens: 0,
      };
      const budget = computeContextBudget(stats, 128000);
      expect(budget.level).toBe("low");
    });
  });

  describe("shouldAutoCompact", () => {
    it("should trigger when ratio exceeds threshold", () => {
      const budget = { used: 100000, limit: 128000, ratio: 0.78, level: "high" as const };
      expect(
        shouldAutoCompact(budget, { auto: true, threshold: 0.8, prune: true, preserveRecent: 5 })
      ).toBe(false);
      const criticalBudget = { used: 105000, limit: 128000, ratio: 0.82, level: "high" as const };
      expect(
        shouldAutoCompact(criticalBudget, {
          auto: true,
          threshold: 0.8,
          prune: true,
          preserveRecent: 5,
        })
      ).toBe(true);
    });

    it("should not trigger when auto is disabled", () => {
      const budget = { used: 120000, limit: 128000, ratio: 0.94, level: "critical" as const };
      expect(
        shouldAutoCompact(budget, { auto: false, threshold: 0.8, prune: true, preserveRecent: 5 })
      ).toBe(false);
    });
  });

  describe("pruneToolOutputs", () => {
    it("should prune large tool outputs from old messages", () => {
      const longResult = "x".repeat(1000);
      const messages: Message[] = [
        {
          ...createMessage(MESSAGE_ROLE.ASSISTANT, ""),
          content: [
            {
              type: CONTENT_BLOCK_TYPE.TOOL_CALL,
              toolCallId: "tc-1" as never,
              name: "bash",
              arguments: { command: "ls" },
              status: "succeeded" as never,
              result: longResult,
            },
          ],
        },
        createMessage(MESSAGE_ROLE.USER, "recent message"),
      ];
      const result = pruneToolOutputs(messages, 1);
      expect(result.pruned).toBe(1);
      expect(result.savedTokens).toBeGreaterThan(0);
    });
  });
});

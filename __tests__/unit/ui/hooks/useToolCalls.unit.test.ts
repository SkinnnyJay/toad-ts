import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { Message, ToolCallId } from "@/types/domain";
import { MessageIdSchema, SessionIdSchema, ToolCallIdSchema } from "@/types/domain";
import { extractToolCallsFromMessages, mapBlockStatusToToolStatus } from "@/ui/hooks/useToolCalls";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useToolCalls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("mapBlockStatusToToolStatus", () => {
    it("maps pending to awaiting_approval for new tools", () => {
      expect(mapBlockStatusToToolStatus(TOOL_CALL_STATUS.PENDING)).toBe(
        TOOL_CALL_STATUS.AWAITING_APPROVAL
      );
    });

    it("preserves denied status for existing denied tools", () => {
      expect(mapBlockStatusToToolStatus(TOOL_CALL_STATUS.PENDING, TOOL_CALL_STATUS.DENIED)).toBe(
        TOOL_CALL_STATUS.DENIED
      );
    });

    it("maps running status", () => {
      expect(mapBlockStatusToToolStatus(TOOL_CALL_STATUS.RUNNING)).toBe(TOOL_CALL_STATUS.RUNNING);
    });

    it("maps succeeded status", () => {
      expect(mapBlockStatusToToolStatus(TOOL_CALL_STATUS.SUCCEEDED)).toBe(
        TOOL_CALL_STATUS.SUCCEEDED
      );
    });

    it("maps failed status", () => {
      expect(mapBlockStatusToToolStatus(TOOL_CALL_STATUS.FAILED)).toBe(TOOL_CALL_STATUS.FAILED);
    });

    it("defaults to pending for unknown status", () => {
      expect(mapBlockStatusToToolStatus("unknown")).toBe(TOOL_CALL_STATUS.PENDING);
      expect(mapBlockStatusToToolStatus(undefined)).toBe(TOOL_CALL_STATUS.PENDING);
    });
  });

  describe("extractToolCallsFromMessages", () => {
    const createTestMessage = (
      toolCallId: string,
      status: string,
      name = "test_tool"
    ): Message => ({
      id: MessageIdSchema.parse(`msg-${Date.now()}`),
      sessionId: SessionIdSchema.parse("test-session"),
      role: "assistant",
      content: [
        {
          type: "tool_call",
          toolCallId: ToolCallIdSchema.parse(toolCallId),
          name,
          arguments: { arg1: "value1" },
          status,
        },
      ],
      createdAt: Date.now(),
      isStreaming: false,
    });

    it("extracts tool calls from messages", () => {
      const messages = [createTestMessage("tool-1", TOOL_CALL_STATUS.PENDING)];
      const prevToolCalls = new Map();

      const { toolCalls, pendingApprovals } = extractToolCallsFromMessages(messages, prevToolCalls);

      expect(toolCalls.size).toBe(1);
      const tool = toolCalls.get(ToolCallIdSchema.parse("tool-1"));
      expect(tool?.name).toBe("test_tool");
      expect(tool?.status).toBe(TOOL_CALL_STATUS.AWAITING_APPROVAL);
      expect(pendingApprovals.size).toBe(1);
    });

    it("tracks pending approvals for new awaiting tools", () => {
      const messages = [createTestMessage("tool-1", TOOL_CALL_STATUS.PENDING)];
      const prevToolCalls = new Map();

      const { pendingApprovals } = extractToolCallsFromMessages(messages, prevToolCalls);

      expect(pendingApprovals.has(ToolCallIdSchema.parse("tool-1"))).toBe(true);
    });

    it("does not add to pending if tool already exists", () => {
      const toolId = ToolCallIdSchema.parse("tool-1");
      const messages = [createTestMessage("tool-1", TOOL_CALL_STATUS.PENDING)];
      const prevToolCalls = new Map([
        [
          toolId,
          {
            id: toolId,
            name: "test_tool",
            arguments: {},
            status: TOOL_CALL_STATUS.AWAITING_APPROVAL as const,
          },
        ],
      ]);

      const { pendingApprovals } = extractToolCallsFromMessages(messages, prevToolCalls);

      expect(pendingApprovals.size).toBe(0);
    });

    it("handles multiple tool calls in one message", () => {
      const message: Message = {
        id: MessageIdSchema.parse(`msg-${Date.now()}`),
        sessionId: SessionIdSchema.parse("test-session"),
        role: "assistant",
        content: [
          {
            type: "tool_call",
            toolCallId: ToolCallIdSchema.parse("tool-1"),
            name: "tool_a",
            arguments: {},
            status: TOOL_CALL_STATUS.PENDING,
          },
          {
            type: "tool_call",
            toolCallId: ToolCallIdSchema.parse("tool-2"),
            name: "tool_b",
            arguments: {},
            status: TOOL_CALL_STATUS.SUCCEEDED,
          },
        ],
        createdAt: Date.now(),
        isStreaming: false,
      };

      const { toolCalls } = extractToolCallsFromMessages([message], new Map());

      expect(toolCalls.size).toBe(2);
    });

    it("handles messages without tool calls", () => {
      const message: Message = {
        id: MessageIdSchema.parse(`msg-${Date.now()}`),
        sessionId: SessionIdSchema.parse("test-session"),
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        createdAt: Date.now(),
        isStreaming: false,
      };

      const { toolCalls, pendingApprovals } = extractToolCallsFromMessages([message], new Map());

      expect(toolCalls.size).toBe(0);
      expect(pendingApprovals.size).toBe(0);
    });

    it("sets completedAt for succeeded/failed tools", () => {
      const messages = [createTestMessage("tool-1", TOOL_CALL_STATUS.SUCCEEDED)];

      const { toolCalls } = extractToolCallsFromMessages(messages, new Map());

      const tool = toolCalls.get(ToolCallIdSchema.parse("tool-1"));
      expect(tool?.completedAt).toBeInstanceOf(Date);
    });

    it("preserves startedAt from existing tool", () => {
      const toolId = ToolCallIdSchema.parse("tool-1");
      const startedAt = new Date("2024-01-01");
      const messages = [createTestMessage("tool-1", TOOL_CALL_STATUS.RUNNING)];
      const prevToolCalls = new Map([
        [
          toolId,
          {
            id: toolId,
            name: "test_tool",
            arguments: {},
            status: TOOL_CALL_STATUS.APPROVED as const,
            startedAt,
          },
        ],
      ]);

      const { toolCalls } = extractToolCallsFromMessages(messages, prevToolCalls);

      const tool = toolCalls.get(toolId);
      expect(tool?.startedAt).toBe(startedAt);
    });
  });

  describe("hook export", () => {
    it("exports useToolCalls function", async () => {
      const { useToolCalls } = await import("@/ui/hooks/useToolCalls");
      expect(typeof useToolCalls).toBe("function");
    });

    it("exports mapBlockStatusToToolStatus function", async () => {
      const { mapBlockStatusToToolStatus } = await import("@/ui/hooks/useToolCalls");
      expect(typeof mapBlockStatusToToolStatus).toBe("function");
    });

    it("exports extractToolCallsFromMessages function", async () => {
      const { extractToolCallsFromMessages } = await import("@/ui/hooks/useToolCalls");
      expect(typeof extractToolCallsFromMessages).toBe("function");
    });
  });
});

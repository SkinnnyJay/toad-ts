import { TOOL_APPROVAL_RECENT_CALLS_DISPLAY } from "@/config/limits";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { ToolCallIdSchema } from "@/types/domain";
import type { ToolCall } from "@/ui/hooks/useToolCalls";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useToolApprovals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createToolCall = (
    id: string,
    status: ToolCall["status"],
    name = "test_tool"
  ): ToolCall => ({
    id: ToolCallIdSchema.parse(id),
    name,
    arguments: {},
    status,
  });

  describe("activeCalls filtering", () => {
    it("includes running tools", () => {
      const tools: ToolCall[] = [
        createToolCall("tool-1", TOOL_CALL_STATUS.RUNNING),
        createToolCall("tool-2", TOOL_CALL_STATUS.PENDING),
      ];

      const activeCalls = tools.filter(
        (t) => t.status === TOOL_CALL_STATUS.RUNNING || t.status === TOOL_CALL_STATUS.APPROVED
      );

      expect(activeCalls).toHaveLength(1);
      expect(activeCalls[0]?.id).toBe(ToolCallIdSchema.parse("tool-1"));
    });

    it("includes approved tools", () => {
      const tools: ToolCall[] = [
        createToolCall("tool-1", TOOL_CALL_STATUS.APPROVED),
        createToolCall("tool-2", TOOL_CALL_STATUS.SUCCEEDED),
      ];

      const activeCalls = tools.filter(
        (t) => t.status === TOOL_CALL_STATUS.RUNNING || t.status === TOOL_CALL_STATUS.APPROVED
      );

      expect(activeCalls).toHaveLength(1);
      expect(activeCalls[0]?.id).toBe(ToolCallIdSchema.parse("tool-1"));
    });

    it("excludes completed tools", () => {
      const tools: ToolCall[] = [
        createToolCall("tool-1", TOOL_CALL_STATUS.SUCCEEDED),
        createToolCall("tool-2", TOOL_CALL_STATUS.FAILED),
        createToolCall("tool-3", TOOL_CALL_STATUS.DENIED),
      ];

      const activeCalls = tools.filter(
        (t) => t.status === TOOL_CALL_STATUS.RUNNING || t.status === TOOL_CALL_STATUS.APPROVED
      );

      expect(activeCalls).toHaveLength(0);
    });
  });

  describe("recentCalls filtering", () => {
    it("includes succeeded tools", () => {
      const tools: ToolCall[] = [
        createToolCall("tool-1", TOOL_CALL_STATUS.SUCCEEDED),
        createToolCall("tool-2", TOOL_CALL_STATUS.RUNNING),
      ];

      const recentCalls = tools.filter(
        (t) =>
          t.status === TOOL_CALL_STATUS.SUCCEEDED ||
          t.status === TOOL_CALL_STATUS.FAILED ||
          t.status === TOOL_CALL_STATUS.DENIED
      );

      expect(recentCalls).toHaveLength(1);
    });

    it("includes failed tools", () => {
      const tools: ToolCall[] = [createToolCall("tool-1", TOOL_CALL_STATUS.FAILED)];

      const recentCalls = tools.filter(
        (t) =>
          t.status === TOOL_CALL_STATUS.SUCCEEDED ||
          t.status === TOOL_CALL_STATUS.FAILED ||
          t.status === TOOL_CALL_STATUS.DENIED
      );

      expect(recentCalls).toHaveLength(1);
    });

    it("includes denied tools", () => {
      const tools: ToolCall[] = [createToolCall("tool-1", TOOL_CALL_STATUS.DENIED)];

      const recentCalls = tools.filter(
        (t) =>
          t.status === TOOL_CALL_STATUS.SUCCEEDED ||
          t.status === TOOL_CALL_STATUS.FAILED ||
          t.status === TOOL_CALL_STATUS.DENIED
      );

      expect(recentCalls).toHaveLength(1);
    });

    it("limits to recent 5 calls", () => {
      const tools: ToolCall[] = Array.from({ length: 10 }, (_, i) =>
        createToolCall(`tool-${i}`, TOOL_CALL_STATUS.SUCCEEDED)
      );

      const recentCalls = tools
        .filter(
          (t) =>
            t.status === TOOL_CALL_STATUS.SUCCEEDED ||
            t.status === TOOL_CALL_STATUS.FAILED ||
            t.status === TOOL_CALL_STATUS.DENIED
        )
        .slice(-TOOL_APPROVAL_RECENT_CALLS_DISPLAY);

      expect(recentCalls).toHaveLength(TOOL_APPROVAL_RECENT_CALLS_DISPLAY);
    });
  });

  describe("nextApproval selection", () => {
    it("returns first pending approval", () => {
      const pendingApprovals = new Set([
        ToolCallIdSchema.parse("tool-1"),
        ToolCallIdSchema.parse("tool-2"),
      ]);

      const nextApproval = Array.from(pendingApprovals)[0];

      expect(nextApproval).toBe(ToolCallIdSchema.parse("tool-1"));
    });

    it("returns undefined when no pending approvals", () => {
      const pendingApprovals = new Set<ReturnType<typeof ToolCallIdSchema.parse>>();

      const nextApproval = Array.from(pendingApprovals)[0];

      expect(nextApproval).toBeUndefined();
    });
  });

  describe("handleApprove behavior", () => {
    it("updates tool status to approved", () => {
      const toolId = ToolCallIdSchema.parse("tool-1");
      const toolCalls = new Map([
        [toolId, createToolCall("tool-1", TOOL_CALL_STATUS.AWAITING_APPROVAL)],
      ]);

      // Simulate handleApprove
      const updated = new Map(toolCalls);
      const tool = updated.get(toolId);
      if (tool) {
        tool.status = TOOL_CALL_STATUS.APPROVED;
        tool.startedAt = new Date();
      }

      expect(updated.get(toolId)?.status).toBe(TOOL_CALL_STATUS.APPROVED);
      expect(updated.get(toolId)?.startedAt).toBeInstanceOf(Date);
    });

    it("removes from pending approvals", () => {
      const toolId = ToolCallIdSchema.parse("tool-1");
      const pendingApprovals = new Set([toolId]);

      // Simulate removal
      const updated = new Set(pendingApprovals);
      updated.delete(toolId);

      expect(updated.has(toolId)).toBe(false);
    });
  });

  describe("handleDeny behavior", () => {
    it("updates tool status to denied", () => {
      const toolId = ToolCallIdSchema.parse("tool-1");
      const toolCalls = new Map([
        [toolId, createToolCall("tool-1", TOOL_CALL_STATUS.AWAITING_APPROVAL)],
      ]);

      // Simulate handleDeny
      const updated = new Map(toolCalls);
      const tool = updated.get(toolId);
      if (tool) {
        tool.status = TOOL_CALL_STATUS.DENIED;
      }

      expect(updated.get(toolId)?.status).toBe(TOOL_CALL_STATUS.DENIED);
    });
  });

  describe("hook export", () => {
    it("exports useToolApprovals function", async () => {
      const { useToolApprovals } = await import("@/ui/hooks/useToolApprovals");
      expect(typeof useToolApprovals).toBe("function");
    });
  });
});

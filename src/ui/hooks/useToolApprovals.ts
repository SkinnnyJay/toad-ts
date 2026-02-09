import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { ToolCallId } from "@/types/domain";
import type { ToolCall } from "@/ui/hooks/useToolCalls";
import { useCallback, useMemo } from "react";

export interface UseToolApprovalsOptions {
  toolCalls: Map<ToolCallId, ToolCall>;
  pendingApprovals: Set<ToolCallId>;
  setToolCalls: React.Dispatch<React.SetStateAction<Map<ToolCallId, ToolCall>>>;
  setPendingApprovals: React.Dispatch<React.SetStateAction<Set<ToolCallId>>>;
  onToolApproved?: (id: ToolCallId) => void;
  onToolDenied?: (id: ToolCallId) => void;
}

export interface UseToolApprovalsResult {
  handleApprove: (id: ToolCallId) => void;
  handleDeny: (id: ToolCallId) => void;
  nextApproval: ToolCallId | undefined;
  approvalTool: ToolCall | null;
  activeCalls: ToolCall[];
  recentCalls: ToolCall[];
}

const RECENT_CALLS_DISPLAY = 5;

/**
 * Hook to manage tool call approvals and denials.
 * Provides handlers and computed lists for the UI.
 */
export function useToolApprovals({
  toolCalls,
  pendingApprovals,
  setToolCalls,
  setPendingApprovals,
  onToolApproved,
  onToolDenied,
}: UseToolApprovalsOptions): UseToolApprovalsResult {
  const handleApprove = useCallback(
    (id: ToolCallId) => {
      setToolCalls((prev) => {
        const updated = new Map(prev);
        const tool = updated.get(id);
        if (tool) {
          tool.status = TOOL_CALL_STATUS.APPROVED;
          tool.startedAt = new Date();
        }
        return updated;
      });
      setPendingApprovals((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      onToolApproved?.(id);
    },
    [setToolCalls, setPendingApprovals, onToolApproved]
  );

  const handleDeny = useCallback(
    (id: ToolCallId) => {
      setToolCalls((prev) => {
        const updated = new Map(prev);
        const tool = updated.get(id);
        if (tool) {
          tool.status = TOOL_CALL_STATUS.DENIED;
        }
        return updated;
      });
      setPendingApprovals((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      onToolDenied?.(id);
    },
    [setToolCalls, setPendingApprovals, onToolDenied]
  );

  // Get the next pending approval
  const nextApproval = Array.from(pendingApprovals)[0];
  const approvalTool = nextApproval ? (toolCalls.get(nextApproval) ?? null) : null;

  // Memoize active and recent tool calls to prevent unnecessary recalculations
  const activeCalls = useMemo(
    () =>
      Array.from(toolCalls.values()).filter(
        (t) => t.status === TOOL_CALL_STATUS.RUNNING || t.status === TOOL_CALL_STATUS.APPROVED
      ),
    [toolCalls]
  );

  const recentCalls = useMemo(
    () =>
      Array.from(toolCalls.values())
        .filter(
          (t) =>
            t.status === TOOL_CALL_STATUS.SUCCEEDED ||
            t.status === TOOL_CALL_STATUS.FAILED ||
            t.status === TOOL_CALL_STATUS.DENIED
        )
        .slice(-RECENT_CALLS_DISPLAY),
    [toolCalls]
  );

  return {
    handleApprove,
    handleDeny,
    nextApproval,
    approvalTool,
    activeCalls,
    recentCalls,
  };
}

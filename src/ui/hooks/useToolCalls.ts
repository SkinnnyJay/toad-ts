import { TIMEOUT } from "@/config/timeouts";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { FALLBACK } from "@/constants/fallbacks";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { useAppStore } from "@/store/app-store";
import type { Message, ToolCallId } from "@/types/domain";
import { useEffect, useState } from "react";

export interface ToolCall {
  id: ToolCallId;
  name: string;
  description?: string;
  arguments: Record<string, unknown>;
  status:
    | typeof TOOL_CALL_STATUS.PENDING
    | typeof TOOL_CALL_STATUS.AWAITING_APPROVAL
    | typeof TOOL_CALL_STATUS.APPROVED
    | typeof TOOL_CALL_STATUS.DENIED
    | typeof TOOL_CALL_STATUS.RUNNING
    | typeof TOOL_CALL_STATUS.SUCCEEDED
    | typeof TOOL_CALL_STATUS.FAILED;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UseToolCallsResult {
  toolCalls: Map<ToolCallId, ToolCall>;
  pendingApprovals: Set<ToolCallId>;
  setToolCalls: React.Dispatch<React.SetStateAction<Map<ToolCallId, ToolCall>>>;
  setPendingApprovals: React.Dispatch<React.SetStateAction<Set<ToolCallId>>>;
}

/**
 * Maps a message block status to internal ToolCall status.
 */
export const mapBlockStatusToToolStatus = (
  blockStatus: string | undefined,
  existingStatus?: ToolCall["status"]
): ToolCall["status"] => {
  if (blockStatus === TOOL_CALL_STATUS.PENDING) {
    return existingStatus === TOOL_CALL_STATUS.DENIED
      ? TOOL_CALL_STATUS.DENIED
      : TOOL_CALL_STATUS.AWAITING_APPROVAL;
  }
  if (blockStatus === TOOL_CALL_STATUS.RUNNING) {
    return TOOL_CALL_STATUS.RUNNING;
  }
  if (blockStatus === TOOL_CALL_STATUS.SUCCEEDED) {
    return TOOL_CALL_STATUS.SUCCEEDED;
  }
  if (blockStatus === TOOL_CALL_STATUS.FAILED) {
    return TOOL_CALL_STATUS.FAILED;
  }
  return TOOL_CALL_STATUS.PENDING;
};

/**
 * Extracts tool calls from messages.
 */
export const extractToolCallsFromMessages = (
  messages: Message[],
  prevToolCalls: Map<ToolCallId, ToolCall>
): { toolCalls: Map<ToolCallId, ToolCall>; pendingApprovals: Set<ToolCallId> } => {
  const newToolCalls = new Map<ToolCallId, ToolCall>();
  const newPendingApprovals = new Set<ToolCallId>();

  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === CONTENT_BLOCK_TYPE.TOOL_CALL) {
        const existing = prevToolCalls.get(block.toolCallId);
        const status = mapBlockStatusToToolStatus(block.status, existing?.status);

        const toolCall: ToolCall = {
          id: block.toolCallId,
          name: block.name ?? FALLBACK.UNKNOWN,
          arguments: block.arguments ?? {},
          status,
          result: block.result,
          startedAt: existing?.startedAt,
          completedAt:
            status === TOOL_CALL_STATUS.SUCCEEDED || status === TOOL_CALL_STATUS.FAILED
              ? new Date()
              : undefined,
        };

        // Track if this needs approval
        if (status === TOOL_CALL_STATUS.AWAITING_APPROVAL && !existing) {
          newPendingApprovals.add(block.toolCallId);
        }

        newToolCalls.set(block.toolCallId, toolCall);
      }
    }
  }

  return { toolCalls: newToolCalls, pendingApprovals: newPendingApprovals };
};

/**
 * Hook to extract and manage tool calls from session messages.
 * Includes throttling to reduce UI flickering.
 */
export function useToolCalls(): UseToolCallsResult {
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const currentSessionId = useAppStore((state) => state.currentSessionId);

  const [toolCalls, setToolCalls] = useState<Map<ToolCallId, ToolCall>>(new Map());
  const [pendingApprovals, setPendingApprovals] = useState<Set<ToolCallId>>(new Set());

  // Extract tool calls from messages - with throttling to reduce updates
  useEffect(() => {
    if (!currentSessionId) return;

    // Throttle updates to reduce flickering
    const timeoutId = setTimeout(() => {
      const sessionMessages = getMessagesForSession(currentSessionId);

      setToolCalls((prevToolCalls) => {
        const { toolCalls: newToolCalls, pendingApprovals: newPendingApprovals } =
          extractToolCallsFromMessages(sessionMessages, prevToolCalls);

        // Update pending approvals
        setPendingApprovals(newPendingApprovals);

        return newToolCalls;
      });
    }, TIMEOUT.THROTTLE_MS);

    return () => clearTimeout(timeoutId);
  }, [getMessagesForSession, currentSessionId]);

  return {
    toolCalls,
    pendingApprovals,
    setToolCalls,
    setPendingApprovals,
  };
}

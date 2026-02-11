import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { FALLBACK } from "@/constants/fallbacks";
import { PERMISSION } from "@/constants/permissions";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { TOOL_CALL_VARIANT } from "@/constants/tool-call-variant";
import { useAppStore } from "@/store/app-store";
import type { ToolCallId } from "@/types/domain";
import { type PermissionProfile, ToolCallApproval } from "@/ui/components/ToolCallApproval";
import { TextAttributes } from "@opentui/core";
import type { BoxProps } from "@opentui/react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ToolCallItem } from "./ToolCallItem";
import type { ToolCall } from "./toolCall.types";

export interface ToolCallManagerProps extends BoxProps {
  permissionProfiles?: Record<string, PermissionProfile>;
  defaultPermission?: PermissionProfile;
  autoApproveTimeout?: number;
  onToolApproved?: (id: ToolCallId) => void;
  onToolDenied?: (id: ToolCallId) => void;
}

const getToolPermission = (
  toolName: string,
  profiles?: Record<string, PermissionProfile>,
  defaultPerm: PermissionProfile = PERMISSION.ASK
): PermissionProfile => {
  if (!profiles) return defaultPerm;

  if (profiles[toolName]) return profiles[toolName];

  for (const [pattern, permission] of Object.entries(profiles)) {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (toolName.startsWith(prefix)) return permission;
    }
  }

  return defaultPerm;
};

export function ToolCallManager({
  permissionProfiles,
  defaultPermission = PERMISSION.ASK,
  autoApproveTimeout = TIMEOUT.AUTO_APPROVE_DEFAULT,
  onToolApproved,
  onToolDenied,
  ...boxProps
}: ToolCallManagerProps): ReactNode {
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const showToolDetails = useAppStore((state) => state.uiState.showToolDetails);

  const [toolCalls, setToolCalls] = useState<Map<ToolCallId, ToolCall>>(new Map());
  const [pendingApprovals, setPendingApprovals] = useState<Set<ToolCallId>>(new Set());

  useEffect(() => {
    if (!currentSessionId) return;

    const timeoutId = setTimeout(() => {
      const sessionMessages = getMessagesForSession(currentSessionId);

      setToolCalls((prevToolCalls) => {
        const newToolCalls = new Map<ToolCallId, ToolCall>();
        const newPendingApprovals = new Set<ToolCallId>();

        sessionMessages.forEach((message) => {
          message.content.forEach((block) => {
            if (block.type !== CONTENT_BLOCK_TYPE.TOOL_CALL) {
              return;
            }

            const existing = prevToolCalls.get(block.toolCallId);

            let status: ToolCall["status"] = TOOL_CALL_STATUS.PENDING;
            if (block.status === TOOL_CALL_STATUS.PENDING) {
              status =
                existing?.status === TOOL_CALL_STATUS.DENIED
                  ? TOOL_CALL_STATUS.DENIED
                  : TOOL_CALL_STATUS.AWAITING_APPROVAL;
            } else if (block.status === TOOL_CALL_STATUS.RUNNING) {
              status = TOOL_CALL_STATUS.RUNNING;
            } else if (block.status === TOOL_CALL_STATUS.SUCCEEDED) {
              status = TOOL_CALL_STATUS.SUCCEEDED;
            } else if (block.status === TOOL_CALL_STATUS.FAILED) {
              status = TOOL_CALL_STATUS.FAILED;
            }

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

            if (status === TOOL_CALL_STATUS.AWAITING_APPROVAL && !existing) {
              newPendingApprovals.add(block.toolCallId);
            }

            newToolCalls.set(block.toolCallId, toolCall);
          });
        });

        setPendingApprovals(newPendingApprovals);

        return newToolCalls;
      });
    }, TIMEOUT.THROTTLE_MS);

    return () => clearTimeout(timeoutId);
  }, [getMessagesForSession, currentSessionId]);

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
    [onToolApproved]
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
    [onToolDenied]
  );

  const nextApproval = Array.from(pendingApprovals)[0];
  const approvalTool = nextApproval ? toolCalls.get(nextApproval) : null;

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
        .slice(-LIMIT.RECENT_CALLS_DISPLAY),
    [toolCalls]
  );

  const hasContent =
    approvalTool || (showToolDetails && (activeCalls.length > 0 || recentCalls.length > 0));

  if (!hasContent) return null;

  return (
    <box flexDirection="column" gap={1} {...boxProps}>
      {approvalTool && (
        <ToolCallApproval
          request={{
            id: approvalTool.id,
            name: approvalTool.name,
            description: approvalTool.description,
            arguments: approvalTool.arguments,
            permissionProfile: getToolPermission(
              approvalTool.name,
              permissionProfiles,
              defaultPermission
            ),
          }}
          onApprove={handleApprove}
          onDeny={handleDeny}
          autoApproveTimeout={autoApproveTimeout}
          defaultPermission={defaultPermission}
        />
      )}

      {showToolDetails && activeCalls.length > 0 && (
        <box flexDirection="column">
          <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
            Active Tools:
          </text>
          {activeCalls.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} variant={TOOL_CALL_VARIANT.ACTIVE} />
          ))}
        </box>
      )}

      {showToolDetails && recentCalls.length > 0 && (
        <box flexDirection="column">
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            Recent:
          </text>
          {recentCalls.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} variant={TOOL_CALL_VARIANT.RECENT} />
          ))}
        </box>
      )}
    </box>
  );
}

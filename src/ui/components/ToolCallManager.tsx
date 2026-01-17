import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { PERMISSION } from "@/constants/permissions";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { useAppStore } from "@/store/app-store";
import type { ToolCallId } from "@/types/domain";
import { type PermissionProfile, ToolCallApproval } from "@/ui/components/ToolCallApproval";
import type { BoxProps } from "ink";
import { Box, Text } from "ink";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "./TruncationProvider";

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

  // Check exact match
  if (profiles[toolName]) return profiles[toolName];

  // Check wildcard patterns
  for (const [pattern, permission] of Object.entries(profiles)) {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (toolName.startsWith(prefix)) return permission;
    }
  }

  return defaultPerm;
};

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";
const VISIBLE_RESULT_LINES = 80;

const formatResultLines = (result: unknown): string[] => {
  if (result === undefined || result === null) return ["null"];

  if (typeof result === "string") return result.split(/\r?\n/);

  try {
    return JSON.stringify(result, null, 2).split(/\r?\n/);
  } catch {
    return [String(result)];
  }
};

const formatDuration = (start: Date, end: Date): string => {
  const ms = end.getTime() - start.getTime();
  if (ms < LIMIT.DURATION_FORMAT_MS_THRESHOLD) return `${ms}ms`;
  if (ms < LIMIT.DURATION_FORMAT_MIN_THRESHOLD) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / LIMIT.DURATION_FORMAT_MIN_THRESHOLD)}m ${Math.floor((ms % LIMIT.DURATION_FORMAT_MIN_THRESHOLD) / 1000)}s`;
};

// Memoized component for active tools to prevent re-renders
const ActiveToolItem = memo(({ tool }: { tool: ToolCall }) => (
  <Box paddingLeft={1}>
    <Text color={COLOR.YELLOW}>⟳ {tool.name}</Text>
    {tool.startedAt && tool.status === TOOL_CALL_STATUS.SUCCEEDED && tool.completedAt && (
      <Text color={COLOR.GRAY}> ({formatDuration(tool.startedAt, tool.completedAt)})</Text>
    )}
  </Box>
));
ActiveToolItem.displayName = "ActiveToolItem";

const ToolResultOutput = memo(({ toolId, result }: { toolId: ToolCallId; result: unknown }) => {
  const lines = useMemo(() => formatResultLines(result), [result]);
  const truncatedHead = Math.max(0, lines.length - VISIBLE_RESULT_LINES);
  const { expanded, isActive } = useTruncationToggle({
    id: `${toolId}-result`,
    label: "Tool result",
    isTruncated: truncatedHead > 0,
    defaultExpanded: EXPAND_ALL,
  });
  const visibleLines = expanded || truncatedHead === 0 ? lines : lines.slice(-VISIBLE_RESULT_LINES);

  return (
    <Box flexDirection="column" gap={0}>
      {visibleLines.map((line, idx) => (
        <Text key={`${toolId}-line-${idx}-${line}`}>{line || " "}</Text>
      ))}
      {truncatedHead > 0 ? (
        <Text dimColor color={COLOR.GRAY}>
          {`${isActive ? "▶" : "•"} … ${truncatedHead} more lines ${
            expanded ? "(expanded)" : "(collapsed)"
          } · ${TRUNCATION_SHORTCUT_HINT}`}
        </Text>
      ) : null}
    </Box>
  );
});
ToolResultOutput.displayName = "ToolResultOutput";

// Memoized component for recent tool calls
const RecentToolItem = memo(({ tool }: { tool: ToolCall }) => (
  <Box paddingLeft={1} flexDirection="column">
    <Box>
      <Text
        color={
          tool.status === TOOL_CALL_STATUS.SUCCEEDED
            ? COLOR.GREEN
            : tool.status === TOOL_CALL_STATUS.FAILED
              ? COLOR.RED
              : COLOR.GRAY
        }
      >
        {tool.status === TOOL_CALL_STATUS.SUCCEEDED
          ? "✓"
          : tool.status === TOOL_CALL_STATUS.FAILED
            ? "✗"
            : "⊘"}{" "}
        {tool.name}
      </Text>
      {tool.startedAt && tool.completedAt && (
        <Text color={COLOR.GRAY}> ({formatDuration(tool.startedAt, tool.completedAt)})</Text>
      )}
    </Box>
    {tool.result !== undefined && tool.result !== null && (
      <Box paddingLeft={2} flexDirection="column" gap={0}>
        <Text color={COLOR.GRAY} dimColor>
          →
        </Text>
        <ToolResultOutput toolId={tool.id} result={tool.result} />
      </Box>
    )}
    {tool.error && (
      <Box paddingLeft={2}>
        <Text color={COLOR.RED}>Error: {tool.error}</Text>
      </Box>
    )}
  </Box>
));
RecentToolItem.displayName = "RecentToolItem";

export function ToolCallManager({
  permissionProfiles,
  defaultPermission = PERMISSION.ASK,
  autoApproveTimeout = TIMEOUT.AUTO_APPROVE_DEFAULT,
  onToolApproved,
  onToolDenied,
  ...boxProps
}: ToolCallManagerProps): JSX.Element | null {
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
        const newToolCalls = new Map<ToolCallId, ToolCall>();
        const newPendingApprovals = new Set<ToolCallId>();

        sessionMessages.forEach((message) => {
          message.content.forEach((block) => {
            if (block.type === "tool_call") {
              const existing = prevToolCalls.get(block.toolCallId);

              // Map status from message to our internal status
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
                name: block.name ?? "unknown",
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
          });
        });

        // Update pending approvals
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
          tool.status = "denied";
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

  // Get the next pending approval
  const nextApproval = Array.from(pendingApprovals)[0];
  const approvalTool = nextApproval ? toolCalls.get(nextApproval) : null;

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
        .slice(-LIMIT.RECENT_CALLS_DISPLAY),
    [toolCalls]
  );

  const hasContent = approvalTool || activeCalls.length > 0 || recentCalls.length > 0;

  if (!hasContent) return null;

  return (
    <Box flexDirection="column" gap={1} {...boxProps}>
      {/* Approval prompt */}
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

      {/* Active tool calls */}
      {activeCalls.length > 0 && (
        <Box flexDirection="column">
          <Text color={COLOR.CYAN} bold>
            Active Tools:
          </Text>
          {activeCalls.map((tool) => (
            <ActiveToolItem key={tool.id} tool={tool} />
          ))}
        </Box>
      )}

      {/* Recent completions */}
      {recentCalls.length > 0 && (
        <Box flexDirection="column">
          <Text color={COLOR.GRAY} dimColor>
            Recent:
          </Text>
          {recentCalls.map((tool) => (
            <RecentToolItem key={tool.id} tool={tool} />
          ))}
        </Box>
      )}
    </Box>
  );
}

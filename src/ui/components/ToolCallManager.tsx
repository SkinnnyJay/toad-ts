import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { PERMISSION } from "@/constants/permissions";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { useAppStore } from "@/store/app-store";
import type { ToolCallId } from "@/types/domain";
import { type PermissionProfile, ToolCallApproval } from "@/ui/components/ToolCallApproval";
import { TextAttributes } from "@opentui/core";
import type { BoxProps } from "@opentui/react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { DiffRenderer } from "./DiffRenderer";
import { MarkdownRenderer } from "./MarkdownRenderer";
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

const formatResultLines = (result: unknown): string[] => {
  if (result === undefined || result === null) return ["null"];

  if (typeof result === "string") return result.split(/\r?\n/);

  try {
    return JSON.stringify(result, null, 2).split(/\r?\n/);
  } catch {
    return [String(result)];
  }
};

const isShellLikeResult = (
  value: unknown
): value is { stdout?: string; stderr?: string; exitCode?: number | string } =>
  typeof value === "object" && value !== null && ("stdout" in value || "stderr" in value);

/**
 * File edit tool names that we should render as diffs
 */
const FILE_EDIT_TOOL_PATTERNS = ["strreplace", "str_replace", "edit", "write", "patch", "modify"];

/**
 * Checks if a tool name is a file edit tool
 */
const isFileEditTool = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  return FILE_EDIT_TOOL_PATTERNS.some((pattern) => lowerName.includes(pattern));
};

/**
 * Extracts diff information from tool arguments
 * Returns { oldContent, newContent, filename } if this is a file edit tool
 */
interface FileEditInfo {
  oldContent: string;
  newContent: string;
  filename: string;
}

const extractFileEditInfo = (
  toolName: string,
  args: Record<string, unknown>
): FileEditInfo | null => {
  if (!isFileEditTool(toolName)) return null;

  // Try to extract filename
  const filename =
    (args.path as string) ??
    (args.file as string) ??
    (args.filename as string) ??
    (args.file_path as string) ??
    "unknown";

  // Handle StrReplace-style tools (old_string -> new_string)
  if ("old_string" in args && "new_string" in args) {
    return {
      oldContent: String(args.old_string ?? ""),
      newContent: String(args.new_string ?? ""),
      filename,
    };
  }

  // Handle Write-style tools (content only, new file)
  if ("content" in args || "contents" in args) {
    const content = String(args.content ?? args.contents ?? "");
    // For write operations, old content is empty (new file) or we don't have it
    return {
      oldContent: "",
      newContent: content,
      filename,
    };
  }

  // Handle patch-style tools
  if ("patch" in args || "diff" in args) {
    // These already contain diff format, we'd need to parse them differently
    // For now, return null and let the default renderer handle it
    return null;
  }

  return null;
};

const LogBlock = memo(function LogBlock({
  label,
  content,
  color,
  truncateId,
}: {
  label: string;
  content: string | undefined;
  color: string;
  truncateId: string;
}): JSX.Element | null {
  if (!content || content.length === 0) return null;
  const lines = content.split(/\r?\n/);
  const isLong = lines.length > LIMIT.LONG_OUTPUT_LINE_THRESHOLD;
  const { expanded, isActive } = useTruncationToggle({
    id: truncateId,
    label,
    isTruncated: isLong,
    defaultExpanded: EXPAND_ALL,
  });
  const visibleLines =
    expanded || !isLong ? lines : lines.slice(0, LIMIT.LONG_OUTPUT_LINE_THRESHOLD);

  return (
    <box flexDirection="column" gap={0} paddingLeft={2}>
      <text fg={color} attributes={TextAttributes.BOLD}>
        {label}
      </text>
      {visibleLines.map((line) => (
        <text key={`${truncateId}-${line.slice(0, 32)}`}>{line || " "}</text>
      ))}

      {isLong ? (
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          {`${isActive ? "▶" : "•"} showing ${visibleLines.length}/${lines.length} lines (${expanded ? "expanded" : "collapsed"}) · ${TRUNCATION_SHORTCUT_HINT}`}
        </text>
      ) : null}
    </box>
  );
});

const formatDuration = (start: Date, end: Date): string => {
  const ms = end.getTime() - start.getTime();
  if (ms < LIMIT.DURATION_FORMAT_MS_THRESHOLD) return `${ms}ms`;
  if (ms < LIMIT.DURATION_FORMAT_MIN_THRESHOLD) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / LIMIT.DURATION_FORMAT_MIN_THRESHOLD)}m ${Math.floor((ms % LIMIT.DURATION_FORMAT_MIN_THRESHOLD) / 1000)}s`;
};

// Memoized component for active tools to prevent re-renders
const ActiveToolItem = memo(({ tool }: { tool: ToolCall }) => (
  <box paddingLeft={1}>
    <text fg={COLOR.YELLOW}>
      ⟳ {tool.name} {tool.status === TOOL_CALL_STATUS.RUNNING ? "(running…)" : "(approved)"}
    </text>
    {tool.startedAt && tool.status === TOOL_CALL_STATUS.SUCCEEDED && tool.completedAt && (
      <text fg={COLOR.GRAY}> ({formatDuration(tool.startedAt, tool.completedAt)})</text>
    )}
  </box>
));
ActiveToolItem.displayName = "ActiveToolItem";

/**
 * Component to render file edit diffs
 */
const FileEditDiffOutput = memo(function FileEditDiffOutput({
  toolId,
  editInfo,
}: {
  toolId: ToolCallId;
  editInfo: FileEditInfo;
}): JSX.Element {
  return (
    <DiffRenderer
      oldContent={editInfo.oldContent}
      newContent={editInfo.newContent}
      filename={editInfo.filename}
    />
  );
});

const ToolResultOutput = memo(
  ({
    toolId,
    toolName,
    toolArgs,
    result,
  }: {
    toolId: ToolCallId;
    toolName: string;
    toolArgs: Record<string, unknown>;
    result: unknown;
  }) => {
    // Check if this is a file edit tool and extract diff info
    const fileEditInfo = useMemo(
      () => extractFileEditInfo(toolName, toolArgs),
      [toolName, toolArgs]
    );

    // Render diff for file edit tools
    if (fileEditInfo) {
      return (
        <box flexDirection="column" gap={0}>
          <FileEditDiffOutput toolId={toolId} editInfo={fileEditInfo} />
          {typeof result === "string" && result.trim().length > 0 && (
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              {result}
            </text>
          )}
        </box>
      );
    }

    if (isShellLikeResult(result)) {
      const { stdout, stderr, exitCode } = result;
      return (
        <box flexDirection="column" gap={0}>
          <LogBlock
            label="STDOUT"
            content={stdout}
            color={COLOR.WHITE}
            truncateId={`${toolId}-stdout`}
          />
          <LogBlock
            label="STDERR"
            content={stderr}
            color={COLOR.RED}
            truncateId={`${toolId}-stderr`}
          />
          {exitCode !== undefined ? (
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>{`Exit: ${exitCode}`}</text>
          ) : null}
        </box>
      );
    }

    // Render markdown-ish tool outputs when present
    if (typeof result === "string" && result.trim().length > 0) {
      return (
        <box flexDirection="column" gap={0}>
          <MarkdownRenderer markdown={result} />
        </box>
      );
    }

    const lines = useMemo(() => formatResultLines(result), [result]);
    const truncatedHead = Math.max(0, lines.length - UI.VISIBLE_RESULT_LINES);
    const { expanded, isActive } = useTruncationToggle({
      id: `${toolId}-result`,
      label: "Tool result",
      isTruncated: truncatedHead > 0,
      defaultExpanded: EXPAND_ALL,
    });
    const visibleLines =
      expanded || truncatedHead === 0 ? lines : lines.slice(-UI.VISIBLE_RESULT_LINES);

    return (
      <box flexDirection="column" gap={0}>
        {visibleLines.map((line) => (
          <text key={`${toolId}-line-${line.slice(0, 32)}`}>{line || " "}</text>
        ))}
        {truncatedHead > 0 ? (
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            {`${isActive ? "▶" : "•"} showing ${visibleLines.length}/${lines.length} lines (${expanded ? "expanded" : "collapsed"}) · ${TRUNCATION_SHORTCUT_HINT}`}
          </text>
        ) : null}
      </box>
    );
  }
);
ToolResultOutput.displayName = "ToolResultOutput";

// Memoized component for recent tool calls
const RecentToolItem = memo(({ tool }: { tool: ToolCall }) => (
  <box paddingLeft={1} flexDirection="column">
    <box>
      <text
        fg={
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
      </text>
      {tool.startedAt && tool.completedAt && (
        <text fg={COLOR.GRAY}> ({formatDuration(tool.startedAt, tool.completedAt)})</text>
      )}
    </box>
    {tool.result !== undefined && tool.result !== null && (
      <box paddingLeft={2} flexDirection="column" gap={0}>
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          →
        </text>
        <ToolResultOutput
          toolId={tool.id}
          toolName={tool.name}
          toolArgs={tool.arguments}
          result={tool.result}
        />
      </box>
    )}
    {tool.error && (
      <box paddingLeft={2}>
        <text fg={COLOR.RED}>Error: {tool.error}</text>
      </box>
    )}
  </box>
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
    <box flexDirection="column" gap={1} {...boxProps}>
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
        <box flexDirection="column">
          <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
            Active Tools:
          </text>
          {activeCalls.map((tool) => (
            <ActiveToolItem key={tool.id} tool={tool} />
          ))}
        </box>
      )}

      {/* Recent completions */}
      {recentCalls.length > 0 && (
        <box flexDirection="column">
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            Recent:
          </text>
          {recentCalls.map((tool) => (
            <RecentToolItem key={tool.id} tool={tool} />
          ))}
        </box>
      )}
    </box>
  );
}

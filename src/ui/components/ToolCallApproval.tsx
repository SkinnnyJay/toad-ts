import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { PERMISSION, type Permission } from "@/constants/permissions";
import type { ToolCallId } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";

export type PermissionProfile = Permission;

export interface ToolCallRequest {
  id: ToolCallId;
  name: string;
  description?: string;
  arguments: Record<string, unknown>;
  permissionProfile?: PermissionProfile;
}

export interface ToolCallApprovalProps {
  request: ToolCallRequest;
  onApprove: (id: ToolCallId) => void;
  onDeny: (id: ToolCallId) => void;
  autoApproveTimeout?: number;
  defaultPermission?: PermissionProfile;
}

const formatArguments = (args: Record<string, unknown>): string => {
  const entries = Object.entries(args);
  if (entries.length === 0) return "no arguments";

  const formatted = entries
    .map(([key, value]) => {
      const displayValue =
        typeof value === "string"
          ? value.length > LIMIT.STRING_TRUNCATE_MEDIUM
            ? `"${value.slice(0, LIMIT.STRING_TRUNCATE_TOOL_ARG)}…"`
            : `"${value}"`
          : JSON.stringify(value);
      return `  ${key}: ${displayValue}`;
    })
    .join("\n");

  return `\n${formatted}`;
};

export function ToolCallApproval({
  request,
  onApprove,
  onDeny,
  autoApproveTimeout = TIMEOUT.AUTO_APPROVE_DISABLED,
  defaultPermission = PERMISSION.ASK,
}: ToolCallApprovalProps): JSX.Element | null {
  const [countdown, setCountdown] = useState(autoApproveTimeout);
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);

  const permission = request.permissionProfile ?? defaultPermission;

  // Handle auto-approval/denial based on permission profile
  useEffect(() => {
    if (permission === PERMISSION.ALLOW) {
      onApprove(request.id);
      setDecision("approved");
    } else if (permission === PERMISSION.DENY) {
      onDeny(request.id);
      setDecision("denied");
    }
  }, [permission, request.id, onApprove, onDeny]);

  // Handle countdown for auto-approval
  useEffect(() => {
    if (permission !== PERMISSION.ASK || countdown <= 0 || decision) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onApprove(request.id);
          setDecision("approved");
          return 0;
        }
        return prev - 1;
      });
    }, TIMEOUT.AUTO_APPROVE_DEFAULT * TIMEOUT.MS_PER_SECOND);

    return () => clearTimeout(timer);
  }, [countdown, decision, permission, request.id, onApprove]);

  const handleApprove = useCallback(() => {
    if (decision) return;
    onApprove(request.id);
    setDecision("approved");
  }, [decision, request.id, onApprove]);

  const handleDeny = useCallback(() => {
    if (decision) return;
    onDeny(request.id);
    setDecision("denied");
  }, [decision, request.id, onDeny]);

  // Handle keyboard input
  useKeyboard((key) => {
    if (permission !== PERMISSION.ASK || decision) return;

    if (
      key.name === KEYBOARD_INPUT.YES_LOWER ||
      key.name === "return" ||
      key.name === "linefeed"
    ) {
      key.preventDefault();
      key.stopPropagation();
      handleApprove();
    } else if (key.name === KEYBOARD_INPUT.NO_LOWER || key.name === "escape") {
      key.preventDefault();
      key.stopPropagation();
      handleDeny();
    }
  });

  // Don't render if not in "ask" mode or already decided
  if (permission !== PERMISSION.ASK || decision) {
    if (decision) {
      return (
        <box>
          <text fg={decision === "approved" ? COLOR.GREEN : COLOR.RED}>
            ✓ Tool call "{request.name}" {decision}
          </text>
        </box>
      );
    }
    return null;
  }

  return (
    <box flexDirection="column" padding={1} border={true} borderStyle="rounded">
      <box flexDirection="row" gap={1}>
        <text fg={COLOR.YELLOW}>⚡</text>
        <text attributes={TextAttributes.BOLD}>Tool Request: {request.name}</text>
      </box>

      {request.description && (
        <text fg={COLOR.GRAY} wrapMode="word">
          {request.description}
        </text>
      )}

      <box marginTop={1}>
        <text fg={COLOR.CYAN}>Arguments: {formatArguments(request.arguments)}</text>
      </box>

      <box marginTop={1} flexDirection="row" gap={2}>
        <text fg={COLOR.GREEN}>[Y]es/Enter to approve</text>
        <text fg={COLOR.RED}>[N]o/Esc to deny</text>
        {countdown > 0 && (
          <text fg={COLOR.YELLOW}>(auto-approve in {countdown}s)</text>
        )}
      </box>
    </box>
  );
}

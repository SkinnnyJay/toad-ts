import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { APPROVAL_DECISION, type ApprovalDecision } from "@/constants/approval-decisions";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { PERMISSION, type Permission } from "@/constants/permissions";
import type { UiSymbols } from "@/constants/ui-symbols";
import type { ToolCallId } from "@/types/domain";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

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

const formatArguments = (args: Record<string, unknown>, symbols: UiSymbols): string => {
  const entries = Object.entries(args);
  if (entries.length === 0) return "no arguments";

  const formatted = entries
    .map(([key, value]) => {
      const displayValue =
        typeof value === "string"
          ? value.length > LIMIT.STRING_TRUNCATE_MEDIUM
            ? `"${value.slice(0, LIMIT.STRING_TRUNCATE_TOOL_ARG)}${symbols.ELLIPSIS}"`
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
}: ToolCallApprovalProps): ReactNode {
  const symbols = useUiSymbols();
  const [countdown, setCountdown] = useState(autoApproveTimeout);
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);

  const permission = request.permissionProfile ?? defaultPermission;

  // Handle auto-approval/denial based on permission profile
  useEffect(() => {
    if (permission === PERMISSION.ALLOW) {
      onApprove(request.id);
      setDecision(APPROVAL_DECISION.APPROVED);
    } else if (permission === PERMISSION.DENY) {
      onDeny(request.id);
      setDecision(APPROVAL_DECISION.DENIED);
    }
  }, [permission, request.id, onApprove, onDeny]);

  // Handle countdown for auto-approval
  useEffect(() => {
    if (permission !== PERMISSION.ASK || countdown <= 0 || decision) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onApprove(request.id);
          setDecision(APPROVAL_DECISION.APPROVED);
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
    setDecision(APPROVAL_DECISION.APPROVED);
  }, [decision, request.id, onApprove]);

  const handleDeny = useCallback(() => {
    if (decision) return;
    onDeny(request.id);
    setDecision(APPROVAL_DECISION.DENIED);
  }, [decision, request.id, onDeny]);

  // Handle keyboard input
  useKeyboard((key) => {
    if (permission !== PERMISSION.ASK || decision) return;

    if (
      key.name === KEYBOARD_INPUT.YES_LOWER ||
      key.name === KEY_NAME.RETURN ||
      key.name === KEY_NAME.LINEFEED
    ) {
      key.preventDefault();
      key.stopPropagation();
      handleApprove();
    } else if (key.name === KEYBOARD_INPUT.NO_LOWER || key.name === KEY_NAME.ESCAPE) {
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
          <text fg={decision === APPROVAL_DECISION.APPROVED ? COLOR.GREEN : COLOR.RED}>
            {symbols.CHECK} Tool call "{request.name}" {decision}
          </text>
        </box>
      );
    }
    return null;
  }

  return (
    <box flexDirection="column" padding={1} border={true} borderStyle="rounded">
      <box flexDirection="row" gap={1}>
        <text fg={COLOR.YELLOW}>{symbols.LIGHTNING}</text>
        <text attributes={TextAttributes.BOLD}>Tool Request: {request.name}</text>
      </box>

      {request.description && (
        <text fg={COLOR.GRAY} wrapMode="word">
          {request.description}
        </text>
      )}

      <box marginTop={1}>
        <text fg={COLOR.CYAN}>Arguments: {formatArguments(request.arguments, symbols)}</text>
      </box>

      <box marginTop={1} flexDirection="row" gap={2}>
        <text fg={COLOR.GREEN}>[Y]es/Enter to approve</text>
        <text fg={COLOR.RED}>[N]o/Esc to deny</text>
        {countdown > 0 && <text fg={COLOR.YELLOW}>(auto-approve in {countdown}s)</text>}
      </box>
    </box>
  );
}

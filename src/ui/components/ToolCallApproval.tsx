import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { PERMISSION, type Permission } from "@/constants/permissions";
import type { ToolCallId } from "@/types/domain";
import type { BoxProps } from "ink";
import { Box, Text, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";

export type PermissionProfile = Permission;

export interface ToolCallRequest {
  id: ToolCallId;
  name: string;
  description?: string;
  arguments: Record<string, unknown>;
  permissionProfile?: PermissionProfile;
}

export interface ToolCallApprovalProps extends BoxProps {
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
            ? `"${value.slice(0, LIMIT.STRING_TRUNCATE_TOOL_ARG)}..."`
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
  ...boxProps
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
  useInput((input, key) => {
    if (permission !== PERMISSION.ASK || decision) return;

    if (input === KEYBOARD_INPUT.YES_LOWER || input === KEYBOARD_INPUT.YES_UPPER || key.return) {
      handleApprove();
    } else if (
      input === KEYBOARD_INPUT.NO_LOWER ||
      input === KEYBOARD_INPUT.NO_UPPER ||
      key.escape
    ) {
      handleDeny();
    }
  });

  // Don't render if not in "ask" mode or already decided
  if (permission !== PERMISSION.ASK || decision) {
    if (decision) {
      return (
        <Box {...boxProps}>
          <Text color={decision === "approved" ? COLOR.GREEN : COLOR.RED}>
            ✓ Tool call "{request.name}" {decision}
          </Text>
        </Box>
      );
    }
    return null;
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" {...boxProps}>
      <Box flexDirection="row" gap={1}>
        <Text color={COLOR.YELLOW}>⚡</Text>
        <Text bold>Tool Request: {request.name}</Text>
      </Box>

      {request.description && (
        <Text color={COLOR.GRAY} wrap="wrap">
          {request.description}
        </Text>
      )}

      <Box marginTop={1}>
        <Text color={COLOR.CYAN}>Arguments: {formatArguments(request.arguments)}</Text>
      </Box>

      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text color={COLOR.GREEN}>[Y]es/Enter to approve</Text>
        <Text color={COLOR.RED}>[N]o/Esc to deny</Text>
        {countdown > 0 && <Text color={COLOR.YELLOW}>(auto-approve in {countdown}s)</Text>}
      </Box>
    </Box>
  );
}

import { COLOR } from "@/constants/colors";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo } from "react";
import type { ToolCall } from "./toolCall.types";

export interface ToolCallStatusConfig {
  icon: string;
  color: string;
  label: string;
}

export const getToolCallStatusConfig = (status: ToolCall["status"]): ToolCallStatusConfig => {
  switch (status) {
    case TOOL_CALL_STATUS.SUCCEEDED:
      return { icon: "✓", color: COLOR.GREEN, label: "complete" };
    case TOOL_CALL_STATUS.FAILED:
      return { icon: "✗", color: COLOR.RED, label: "failed" };
    case TOOL_CALL_STATUS.RUNNING:
      return { icon: "⟳", color: COLOR.CYAN, label: "running…" };
    case TOOL_CALL_STATUS.APPROVED:
      return { icon: "⟳", color: COLOR.YELLOW, label: "approved" };
    case TOOL_CALL_STATUS.DENIED:
      return { icon: "⊘", color: COLOR.GRAY, label: "denied" };
    default:
      return { icon: "⊘", color: COLOR.GRAY, label: "pending" };
  }
};

export const ToolCallStatus = memo(function ToolCallStatus({
  status,
}: {
  status: ToolCall["status"];
}): ReactNode {
  const { icon, color, label } = getToolCallStatusConfig(status);
  return (
    <text fg={color} attributes={TextAttributes.DIM}>
      {icon} {label}
    </text>
  );
});

ToolCallStatus.displayName = "ToolCallStatus";

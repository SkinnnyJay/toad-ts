import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { TOOL_CALL_VARIANT, type ToolCallVariant } from "@/constants/tool-call-variant";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo } from "react";
import { ToolCallResult } from "./ToolCallResult";
import { getToolCallStatusConfig } from "./ToolCallStatus";
import { formatDuration } from "./formatToolCallDuration";
import type { ToolCall } from "./toolCall.types";

export interface ToolCallItemProps {
  tool: ToolCall;
  variant: ToolCallVariant;
}

export const ToolCallItem = memo(function ToolCallItem({
  tool,
  variant,
}: ToolCallItemProps): ReactNode {
  const { icon, color, label } = getToolCallStatusConfig(tool.status);

  if (variant === TOOL_CALL_VARIANT.ACTIVE) {
    return (
      <box paddingLeft={1}>
        <text fg={color} attributes={TextAttributes.DIM}>
          {icon} {tool.name} ({label})
        </text>
      </box>
    );
  }

  return (
    <box paddingLeft={1} flexDirection="column">
      <box>
        <text fg={color}>
          {icon} {tool.name}
        </text>
        {tool.startedAt && tool.completedAt && (
          <text fg={COLOR.GRAY}> ({formatDuration(tool.startedAt, tool.completedAt)})</text>
        )}
      </box>
      {tool.result !== undefined && tool.result !== null && (
        <box paddingLeft={UI.SIDEBAR_PADDING} flexDirection="column" gap={0}>
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            →
          </text>
          <ToolCallResult tool={tool} />
        </box>
      )}
      {tool.error && (
        <box paddingLeft={UI.SIDEBAR_PADDING}>
          <text fg={COLOR.RED}>Error: {tool.error}</text>
        </box>
      )}
    </box>
  );
});

ToolCallItem.displayName = "ToolCallItem";

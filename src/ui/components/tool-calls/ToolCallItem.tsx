import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo } from "react";
import { ToolCallResult } from "./ToolCallResult";
import { getToolCallStatusConfig } from "./ToolCallStatus";
import type { ToolCall } from "./toolCall.types";

export interface ToolCallItemProps {
  tool: ToolCall;
  variant: "active" | "recent";
}

const formatDuration = (start: Date, end: Date): string => {
  const ms = end.getTime() - start.getTime();
  if (ms < LIMIT.DURATION_FORMAT_MS_THRESHOLD) return `${ms}ms`;
  if (ms < LIMIT.DURATION_FORMAT_MIN_THRESHOLD) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / LIMIT.DURATION_FORMAT_MIN_THRESHOLD)}m ${Math.floor(
    (ms % LIMIT.DURATION_FORMAT_MIN_THRESHOLD) / 1000
  )}s`;
};

export const ToolCallItem = memo(function ToolCallItem({
  tool,
  variant,
}: ToolCallItemProps): ReactNode {
  const { icon, color, label } = getToolCallStatusConfig(tool.status);

  if (variant === "active") {
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
        <box paddingLeft={2} flexDirection="column" gap={0}>
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            →
          </text>
          <ToolCallResult tool={tool} />
        </box>
      )}
      {tool.error && (
        <box paddingLeft={2}>
          <text fg={COLOR.RED}>Error: {tool.error}</text>
        </box>
      )}
    </box>
  );
});

ToolCallItem.displayName = "ToolCallItem";

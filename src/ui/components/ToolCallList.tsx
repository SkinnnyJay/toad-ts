import { COLOR } from "@/constants/colors";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { TextAttributes } from "@opentui/core";

export interface ToolCallListItem {
  id: string;
  name: string;
  status:
    | typeof TOOL_CALL_STATUS.PENDING
    | typeof TOOL_CALL_STATUS.RUNNING
    | typeof TOOL_CALL_STATUS.SUCCEEDED
    | typeof TOOL_CALL_STATUS.FAILED;
  result?: unknown;
}

export interface ToolCallListProps {
  toolCalls: ToolCallListItem[];
}

const statusColor = (status: ToolCallListItem["status"]): string => {
  switch (status) {
    case TOOL_CALL_STATUS.PENDING:
      return COLOR.GRAY;
    case TOOL_CALL_STATUS.RUNNING:
      return COLOR.YELLOW;
    case TOOL_CALL_STATUS.SUCCEEDED:
      return COLOR.GREEN;
    case TOOL_CALL_STATUS.FAILED:
      return COLOR.RED;
  }
};

export function ToolCallList({ toolCalls }: ToolCallListProps): JSX.Element | null {
  if (toolCalls.length === 0) return null;
  return (
    <box flexDirection="column" gap={0}>
      <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
        Tool Calls
      </text>
      {toolCalls.map((tool) => (
        <text key={tool.id} fg={statusColor(tool.status)}>
          {tool.name} ({tool.status})
        </text>
      ))}
    </box>
  );
}

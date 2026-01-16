import { COLOR } from "@/constants/colors";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { BoxProps } from "ink";
import { Box, Text } from "ink";

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

export interface ToolCallListProps extends BoxProps {
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

export function ToolCallList({ toolCalls, ...boxProps }: ToolCallListProps): JSX.Element | null {
  if (toolCalls.length === 0) return null;
  return (
    <Box flexDirection="column" gap={0} {...boxProps}>
      <Text color={COLOR.CYAN}>Tool Calls</Text>
      {toolCalls.map((tool) => (
        <Text key={tool.id} color={statusColor(tool.status)}>
          {tool.name} ({tool.status})
        </Text>
      ))}
    </Box>
  );
}

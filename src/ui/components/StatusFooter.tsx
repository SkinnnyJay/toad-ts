import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import type { FocusTarget } from "@/constants/focus-target";
import type { ConnectionStatus, SessionId } from "@/types/domain";
import { Box, Text } from "ink";

export interface StatusFooterProps {
  taskProgress?: { completed: number; total: number };
  planProgress?: { completed: number; total: number };
  focusTarget?: FocusTarget;
  connectionStatus?: ConnectionStatus;
  sessionMode?: string;
  sessionId?: SessionId;
  agentName?: string;
}

const globalShortcuts = [
  { key: "^C", label: "Exit" },
  { key: "^P", label: "Commands" },
  { key: "Esc", label: "Back to Chat" },
  { key: "Cmd+F", label: "Focus Files" },
  { key: "/help", label: "Panel Help" },
];

const truncateMiddle = (value: string, max: number): string => {
  if (value.length <= max) return value;
  const half = Math.floor((max - 3) / 2);
  return `${value.slice(0, half)}...${value.slice(-half)}`;
};

export function StatusFooter({
  taskProgress,
  planProgress,
  focusTarget = "chat",
  connectionStatus,
  sessionMode,
  sessionId,
  agentName,
}: StatusFooterProps): JSX.Element {
  const planText =
    planProgress && planProgress.total > 0
      ? `Plan ${planProgress.completed}/${planProgress.total}`
      : undefined;
  const taskText = taskProgress
    ? `Tasks ${taskProgress.completed}/${taskProgress.total}`
    : undefined;

  const trimmedAgent = agentName
    ? truncateMiddle(agentName, LIMIT.STRING_TRUNCATE_LONG)
    : undefined;
  const trimmedSession = sessionId
    ? truncateMiddle(sessionId, 2 * LIMIT.ID_TRUNCATE_LENGTH)
    : undefined;

  const statusParts = [
    connectionStatus ? `Link: ${connectionStatus}` : undefined,
    trimmedAgent ? `Agent: ${trimmedAgent}` : undefined,
    sessionMode ? `Mode: ${sessionMode}` : undefined,
    trimmedSession ? `Session: ${trimmedSession}` : undefined,
  ].filter(Boolean) as string[];

  return (
    <Box
      width="100%"
      flexDirection="row"
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingX={1}
      paddingY={0}
      gap={2}
      justifyContent="space-between"
      alignItems="center"
    >
      <Box flexDirection="row" gap={2}>
        {globalShortcuts.map((sc) => (
          <Text key={sc.key}>
            <Text bold color={COLOR.CYAN}>
              {sc.key}
            </Text>{" "}
            {sc.label}
          </Text>
        ))}
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text>
          <Text bold color={COLOR.YELLOW}>
            Focus:
          </Text>{" "}
          {focusTarget}
        </Text>
        {statusParts.map((part) => (
          <Text key={part} color={COLOR.GRAY}>
            {part}
          </Text>
        ))}
        {planText ? <Text color={COLOR.GRAY}>{planText}</Text> : null}
        {taskText ? <Text color={COLOR.GRAY}>{taskText}</Text> : null}
      </Box>
    </Box>
  );
}

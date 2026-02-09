import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import type { FocusTarget } from "@/constants/focus-target";
import type { ConnectionStatus, SessionId } from "@/types/domain";
import { TextAttributes } from "@opentui/core";

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
    <box
      width="100%"
      flexDirection="row"
      border={true}
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingX={1}
      paddingY={0}
      gap={2}
      justifyContent="space-between"
      alignItems="center"
    >
      <box flexDirection="row" gap={2}>
        {globalShortcuts.map((sc) => (
          <text key={sc.key}>
            <span fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
              {sc.key}
            </span>{" "}
            {sc.label}
          </text>
        ))}
      </box>
      <box flexDirection="row" gap={2}>
        <text>
          <span fg={COLOR.YELLOW} attributes={TextAttributes.BOLD}>
            Focus:
          </span>{" "}
          {focusTarget}
        </text>
        {statusParts.map((part) => (
          <text key={part} fg={COLOR.GRAY}>
            {part}
          </text>
        ))}
        {planText ? <text fg={COLOR.GRAY}>{planText}</text> : null}
        {taskText ? <text fg={COLOR.GRAY}>{taskText}</text> : null}
      </box>
    </box>
  );
}

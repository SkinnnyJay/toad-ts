import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import type { ConnectionStatus, SessionId, SessionMode } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

export interface StatusFooterProps {
  taskProgress?: { completed: number; total: number };
  planProgress?: { completed: number; total: number };
  checkpointStatus?: { cursor: number; total: number };
  focusTarget?: FocusTarget;
  connectionStatus?: ConnectionStatus;
  sessionMode?: SessionMode;
  sessionId?: SessionId;
  agentName?: string;
}

const globalShortcuts = [
  { key: "^C", label: "Exit" },
  { key: "^P", label: "Commands" },
  { key: "^B", label: "Tasks" },
  { key: "Esc Esc", label: "Rewind" },
  { key: "^X←/→", label: "Child Sessions" },
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
  checkpointStatus,
  focusTarget = FOCUS_TARGET.CHAT,
  connectionStatus,
  sessionMode,
  sessionId,
  agentName,
}: StatusFooterProps): ReactNode {
  const planText =
    planProgress && planProgress.total > 0
      ? `Plan ${planProgress.completed}/${planProgress.total}`
      : undefined;
  const taskText = taskProgress
    ? `Tasks ${taskProgress.completed}/${taskProgress.total}`
    : undefined;
  const checkpointText =
    checkpointStatus && checkpointStatus.total > 0
      ? `Checkpoint ${checkpointStatus.cursor}/${checkpointStatus.total}`
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
  ].filter((value): value is string => Boolean(value));

  return (
    <box
      width="100%"
      flexDirection="row"
      border={true}
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
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
        {checkpointText ? <text fg={COLOR.GRAY}>{checkpointText}</text> : null}
      </box>
    </box>
  );
}

import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import type { BackgroundTask } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

export interface BackgroundTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: BackgroundTask[];
}

const statusColor = (status: BackgroundTask["status"]): string => {
  switch (status) {
    case BACKGROUND_TASK_STATUS.RUNNING:
      return COLOR.YELLOW;
    case BACKGROUND_TASK_STATUS.COMPLETED:
      return COLOR.GREEN;
    case BACKGROUND_TASK_STATUS.FAILED:
      return COLOR.RED;
    case BACKGROUND_TASK_STATUS.CANCELLED:
      return COLOR.GRAY;
    default:
      return COLOR.GRAY;
  }
};

const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

export function BackgroundTasksModal({
  isOpen,
  onClose,
  tasks,
}: BackgroundTasksModalProps): ReactNode {
  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEY_NAME.B)) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;

  const contentMinHeight = UI.MODAL_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.MODAL_HEIGHT}
      width={UI.MODAL_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Background Tasks (Esc/Ctrl+B to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight} gap={1}>
        {tasks.length === 0 ? (
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            No background tasks running.
          </text>
        ) : (
          tasks.map((task) => (
            <box key={task.id} flexDirection="row" gap={UI.SIDEBAR_PADDING}>
              <text fg={statusColor(task.status)} attributes={TextAttributes.BOLD}>
                {task.status.toUpperCase()}
              </text>
              <text fg={COLOR.WHITE}>{truncate(task.command, LIMIT.STRING_TRUNCATE_LONG)}</text>
            </box>
          ))
        )}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>Esc/Ctrl+B: Close</text>
      </box>
    </box>
  );
}

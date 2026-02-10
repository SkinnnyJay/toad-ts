import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { taskStatusColor } from "@/ui/status-colors";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

interface ProgressModalProps {
  isOpen: boolean;
  sessionId?: SessionId;
  onClose: () => void;
}

export function ProgressModal({ isOpen, sessionId, onClose }: ProgressModalProps): ReactNode {
  const plan = useAppStore((state) => (sessionId ? state.getPlanBySession(sessionId) : undefined));
  const subAgents = useAppStore((state) =>
    Object.values(state.subAgents).filter((agent) => agent !== undefined)
  );

  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === "escape" || (key.ctrl && key.name === "s")) {
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
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Progress (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight} gap={1}>
        <box flexDirection="column">
          <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
            Plan Tasks
          </text>
          {!plan ? (
            <text attributes={TextAttributes.DIM}>No active plan.</text>
          ) : plan.tasks.length === 0 ? (
            <text attributes={TextAttributes.DIM}>No tasks queued.</text>
          ) : (
            plan.tasks.map((task) => (
              <text key={task.id} fg={taskStatusColor(task.status)}>
                • {task.title} ({task.status})
              </text>
            ))
          )}
        </box>

        <box flexDirection="column">
          <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
            Sub-agents
          </text>
          {subAgents.length === 0 ? (
            <text attributes={TextAttributes.DIM}>No active sub-agents.</text>
          ) : (
            subAgents.map((agent) => (
              <text key={agent.id}>
                • {agent.id} ({agent.status})
              </text>
            ))
          )}
        </box>
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>Esc/Ctrl+S: Close</text>
      </box>
    </box>
  );
}

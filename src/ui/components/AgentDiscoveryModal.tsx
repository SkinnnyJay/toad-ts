import type { AgentInfo } from "@/agents/agent-manager";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

interface AgentDiscoveryModalProps {
  isOpen: boolean;
  agents: AgentInfo[];
  onClose: () => void;
}

export function AgentDiscoveryModal({
  isOpen,
  agents,
  onClose,
}: AgentDiscoveryModalProps): ReactNode {
  const symbols = useUiSymbols();
  const visibleAgents = agents.filter((agent) => !agent.hidden);
  const hiddenCount = agents.length - visibleAgents.length;

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
          Agent Discovery (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        {visibleAgents.length === 0 ? (
          <text attributes={TextAttributes.DIM}>No agents available.</text>
        ) : (
          visibleAgents.map((agent) => (
            <box key={agent.id} flexDirection="column" gap={0}>
              <text>
                {symbols.BULLET} {agent.name} ({agent.id})
              </text>
              <text attributes={TextAttributes.DIM}>
                Harness: {agent.harnessId}
                {agent.model ? ` · Model: ${agent.model}` : ""}
              </text>
              {agent.description ? (
                <text attributes={TextAttributes.DIM}>{agent.description}</text>
              ) : null}
            </box>
          ))
        )}
        {hiddenCount > 0 ? (
          <text attributes={TextAttributes.DIM}>
            {`${symbols.ELLIPSIS} ${hiddenCount} hidden agents`}
          </text>
        ) : null}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>Esc/Ctrl+S: Close</text>
      </box>
    </box>
  );
}

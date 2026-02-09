import { COLOR } from "@/constants/colors";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { DefaultProviderTab } from "@/ui/components/DefaultProviderTab";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentOption[];
}

export function SettingsModal({ isOpen, onClose, agents }: SettingsModalProps): JSX.Element | null {
  useKeyboard((key) => {
    if (!isOpen) return;

    if (key.name === "escape" || (key.ctrl && key.name === "s")) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  const handleSave = (): void => {
    // Settings are saved automatically in DefaultProviderTab
    // This callback can be used for future notifications
  };

  if (!isOpen) return null;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingX={1}
      paddingY={1}
      minHeight={20}
      width="80%"
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Settings (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="row" marginBottom={1} borderStyle="single" border={["bottom"]}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Default Provider
        </text>
        {/* Future tabs can be added here with left/right arrow navigation */}
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={15}>
        <DefaultProviderTab agents={agents} onSave={handleSave} />
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓: Navigate | Enter: Select | Esc/Ctrl+S: Close
        </text>
      </box>
    </box>
  );
}

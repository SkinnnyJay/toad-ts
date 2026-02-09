import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { DefaultProviderTab } from "@/ui/components/DefaultProviderTab";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentOption[];
}

export function SettingsModal({ isOpen, onClose, agents }: SettingsModalProps): ReactNode {
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
  const contentMinHeight = UI.POPUP_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

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
      minHeight={UI.POPUP_HEIGHT}
      width={UI.POPUP_WIDTH}
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

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
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

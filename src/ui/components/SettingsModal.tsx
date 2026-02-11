import type { KeybindConfig } from "@/config/app-config";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { SETTINGS_TAB, SETTINGS_TAB_VALUES, type SettingsTab } from "@/constants/settings-tabs";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { DefaultProviderTab } from "@/ui/components/DefaultProviderTab";
import { KeybindsTab } from "@/ui/components/KeybindsTab";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentOption[];
  keybinds: KeybindConfig;
  onUpdateKeybinds: (keybinds: KeybindConfig) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  agents,
  keybinds,
  onUpdateKeybinds,
}: SettingsModalProps): ReactNode {
  const [activeTab, setActiveTab] = useState<SettingsTab>(SETTINGS_TAB.DEFAULT_PROVIDER);
  const [isEditingKeybind, setIsEditingKeybind] = useState(false);

  useKeyboard((key) => {
    if (!isOpen) return;

    if ((key.name === KEY_NAME.LEFT || key.name === KEY_NAME.RIGHT) && !isEditingKeybind) {
      key.preventDefault();
      key.stopPropagation();
      const currentIndex = SETTINGS_TAB_VALUES.indexOf(activeTab);
      if (currentIndex >= 0) {
        const nextIndex =
          key.name === KEY_NAME.RIGHT
            ? (currentIndex + 1) % SETTINGS_TAB_VALUES.length
            : (currentIndex - 1 + SETTINGS_TAB_VALUES.length) % SETTINGS_TAB_VALUES.length;
        const nextTab = SETTINGS_TAB_VALUES[nextIndex];
        if (nextTab) {
          setActiveTab(nextTab);
          setIsEditingKeybind(false);
        }
      }
      return;
    }

    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEYBOARD_INPUT.SKIP_LOWER)) {
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
        <text
          fg={activeTab === SETTINGS_TAB.DEFAULT_PROVIDER ? COLOR.CYAN : COLOR.GRAY}
          attributes={TextAttributes.BOLD}
        >
          Default Provider
        </text>
        <text fg={COLOR.GRAY}> | </text>
        <text
          fg={activeTab === SETTINGS_TAB.KEYBINDS ? COLOR.CYAN : COLOR.GRAY}
          attributes={TextAttributes.BOLD}
        >
          Keybinds
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        {activeTab === SETTINGS_TAB.DEFAULT_PROVIDER ? (
          <DefaultProviderTab agents={agents} onSave={handleSave} />
        ) : (
          <KeybindsTab
            isActive={activeTab === SETTINGS_TAB.KEYBINDS}
            keybinds={keybinds}
            onUpdate={onUpdateKeybinds}
            onEditingChange={setIsEditingKeybind}
          />
        )}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓: Navigate | Enter: Select | ←/→: Tabs | Esc/Ctrl+S: Close
        </text>
      </box>
    </box>
  );
}

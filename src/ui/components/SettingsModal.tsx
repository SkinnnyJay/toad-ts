import { COLOR } from "@/constants/colors";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { DefaultProviderTab } from "@/ui/components/DefaultProviderTab";
import { Box, Text, useInput } from "ink";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentOption[];
}

export function SettingsModal({ isOpen, onClose, agents }: SettingsModalProps): JSX.Element | null {
  useInput(
    (input, key) => {
      if (!isOpen) return;

      if (key.escape || (key.ctrl && input === "s")) {
        onClose();
        return;
      }
    },
    { isActive: isOpen }
  );

  const handleSave = (): void => {
    // Settings are saved automatically in DefaultProviderTab
    // This callback can be used for future notifications
  };

  if (!isOpen) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingX={1}
      paddingY={1}
      minHeight={20}
      width="80%"
    >
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold color={COLOR.CYAN}>
          Settings (Esc/Ctrl+S to close)
        </Text>
      </Box>

      <Box flexDirection="row" marginBottom={1} borderStyle="single" borderBottom={true}>
        <Text color={COLOR.CYAN} bold>
          Default Provider
        </Text>
        {/* Future tabs can be added here with left/right arrow navigation */}
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={15}>
        <DefaultProviderTab agents={agents} onSave={handleSave} />
      </Box>

      <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop={true}>
        <Text dimColor>↑/↓: Navigate | Enter: Select | Esc/Ctrl+S: Close</Text>
      </Box>
    </Box>
  );
}

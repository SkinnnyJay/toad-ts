import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS } from "@/constants/command-definitions";
import { Box, Text, useInput } from "ink";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const calculateColumnWidths = (
  commands: typeof COMMAND_DEFINITIONS
): { command: number; description: number; args: number } => {
  let maxCommand = 8; // "Command" header length
  let maxDescription = 11; // "Description" header length
  let maxArgs = 9; // "Arguments" header length

  for (const cmd of commands) {
    maxCommand = Math.max(maxCommand, cmd.name.length);
    maxDescription = Math.max(maxDescription, cmd.description.length);
    maxArgs = Math.max(maxArgs, (cmd.args || "").length);
  }

  return {
    command: maxCommand + 2,
    description: maxDescription + 2,
    args: maxArgs + 2,
  };
};

const formatRow = (
  command: string,
  description: string,
  args: string,
  widths: { command: number; description: number; args: number }
): string => {
  const cmdPadded = command.padEnd(widths.command);
  const descPadded = description.padEnd(widths.description);
  const argsPadded = args.padEnd(widths.args);
  return `${cmdPadded}  ${descPadded}  ${argsPadded}`;
};

export function HelpModal({ isOpen, onClose }: HelpModalProps): JSX.Element | null {
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

  if (!isOpen) return null;

  const widths = calculateColumnWidths(COMMAND_DEFINITIONS);
  const header = formatRow("Command", "Description", "Arguments", widths);
  const separator = "─".repeat(header.length);

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
          Available Commands (Esc/Ctrl+S to close)
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={15}>
        <Text color={COLOR.CYAN} bold>
          {header}
        </Text>
        <Text dimColor>{separator}</Text>
        {COMMAND_DEFINITIONS.map((cmd) => (
          <Text key={cmd.name}>{formatRow(cmd.name, cmd.description, cmd.args || "", widths)}</Text>
        ))}
      </Box>

      <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop={true}>
        <Text dimColor>Esc/Ctrl+S: Close</Text>
      </Box>
    </Box>
  );
}

import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS } from "@/constants/command-definitions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";

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
  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === "escape" || (key.ctrl && key.name === "s")) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;

  const widths = calculateColumnWidths(COMMAND_DEFINITIONS);
  const header = formatRow("Command", "Description", "Arguments", widths);
  const separator = "─".repeat(header.length);

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
          Available Commands (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={15}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          {header}
        </text>
        <text attributes={TextAttributes.DIM}>{separator}</text>
        {COMMAND_DEFINITIONS.map((cmd) => (
          <text key={cmd.name}>
            {formatRow(cmd.name, cmd.description, cmd.args || "", widths)}
          </text>
        ))}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>Esc/Ctrl+S: Close</text>
      </box>
    </box>
  );
}

import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS } from "@/constants/command-definitions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const calculateColumnWidths = (
  commands: typeof COMMAND_DEFINITIONS
): { command: number; description: number; args: number } => {
  const commandHeader = "Command";
  const descriptionHeader = "Description";
  const argsHeader = "Arguments";
  let maxCommand = commandHeader.length;
  let maxDescription = Math.max(LIMIT.HELP_MAX_DESCRIPTION_WIDTH, descriptionHeader.length);
  let maxArgs = argsHeader.length;

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

export function HelpModal({ isOpen, onClose }: HelpModalProps): ReactNode {
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
          Available Commands (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          {header}
        </text>
        <text attributes={TextAttributes.DIM}>{separator}</text>
        {COMMAND_DEFINITIONS.map((cmd) => (
          <text key={cmd.name}>{formatRow(cmd.name, cmd.description, cmd.args || "", widths)}</text>
        ))}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>Esc/Ctrl+S: Close</text>
      </box>
    </box>
  );
}

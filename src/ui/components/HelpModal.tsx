import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COMMAND_DEFINITIONS, type CommandDefinition } from "@/constants/command-definitions";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { SEMANTIC_COLOR, getCategoryColor } from "@/constants/semantic-colors";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Slash commands to show; when omitted, shows all COMMAND_DEFINITIONS (e.g. filtered by provider). */
  commands?: CommandDefinition[];
}

const calculateColumnWidths = (
  commands: CommandDefinition[]
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

export function HelpModal({
  isOpen,
  onClose,
  commands = COMMAND_DEFINITIONS,
}: HelpModalProps): ReactNode {
  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEYBOARD_INPUT.SKIP_LOWER)) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;

  const widths = calculateColumnWidths(commands);
  const contentMinHeight = UI.MODAL_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={SEMANTIC_COLOR.COMMAND}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.MODAL_HEIGHT}
      width={UI.MODAL_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={SEMANTIC_COLOR.SECTION_HEADER} attributes={TextAttributes.BOLD}>
          Available Commands (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        <box flexDirection="row">
          <text fg={SEMANTIC_COLOR.SECTION_HEADER} attributes={TextAttributes.BOLD}>
            {"Command".padEnd(widths.command)}
            {"  "}
          </text>
          <text fg={SEMANTIC_COLOR.SECTION_HEADER} attributes={TextAttributes.BOLD}>
            {"Description".padEnd(widths.description)}
            {"  "}
          </text>
          <text fg={SEMANTIC_COLOR.SECTION_HEADER} attributes={TextAttributes.BOLD}>
            {"Arguments".padEnd(widths.args)}
          </text>
        </box>
        <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
          {"─".repeat(widths.command + widths.description + widths.args + 4)}
        </text>
        {commands.map((cmd) => (
          <box key={cmd.name} flexDirection="row">
            <text fg={SEMANTIC_COLOR.COMMAND}>
              {cmd.name.padEnd(widths.command)}
              {"  "}
            </text>
            <text fg={SEMANTIC_COLOR.DESCRIPTION} attributes={TextAttributes.DIM}>
              {cmd.description.padEnd(widths.description)}
              {"  "}
            </text>
            <text fg={SEMANTIC_COLOR.ARGS}>{(cmd.args ?? "").padEnd(widths.args)}</text>
            {cmd.category ? (
              <text fg={getCategoryColor(cmd.category)} attributes={TextAttributes.DIM}>
                {" "}
                [{cmd.category}]
              </text>
            ) : null}
          </box>
        ))}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
          Esc/Ctrl+S: Close
        </text>
      </box>
    </box>
  );
}

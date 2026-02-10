import { COLOR } from "@/constants/colors";
import type { CommandDefinition } from "@/constants/command-definitions";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

export interface CommandSuggestionsProps {
  commands: CommandDefinition[];
  selectedIndex: number;
}

export function CommandSuggestions({
  commands,
  selectedIndex,
}: CommandSuggestionsProps): ReactNode {
  if (commands.length === 0) return null;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="single"
      borderColor={COLOR.CYAN}
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
    >
      <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
        Commands:
      </text>
      {commands.map((cmd, index) => (
        <box key={cmd.name} paddingLeft={1}>
          <text
            fg={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
            attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
          >
            {index === selectedIndex ? "▶ " : "  "}
            {cmd.name}
          </text>
          {cmd.args ? <text fg={COLOR.GRAY}> {cmd.args}</text> : null}
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>{` - ${cmd.description}`}</text>
        </box>
      ))}
      <box marginTop={1}>
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          ↑↓ Navigate · Tab/Enter Select · Esc Cancel
        </text>
      </box>
    </box>
  );
}

export interface FileSuggestionsProps {
  files: string[];
  selectedIndex: number;
  isLoading: boolean;
  error: string | null;
}

export function FileSuggestions({
  files,
  selectedIndex,
  isLoading,
  error,
}: FileSuggestionsProps): ReactNode {
  if (files.length === 0 && !isLoading && !error) return null;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="single"
      borderColor={COLOR.GREEN}
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
    >
      <text fg={COLOR.GREEN} attributes={TextAttributes.BOLD}>
        Files:
      </text>
      {files.map((file, index) => (
        <box key={file} paddingLeft={1}>
          <text
            fg={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
            attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
          >
            {index === selectedIndex ? "▶ " : "  "}@{file}
          </text>
        </box>
      ))}
      {isLoading ? (
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          Loading files…
        </text>
      ) : error ? (
        <text fg={COLOR.RED}>{error}</text>
      ) : null}
      <box marginTop={1}>
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          ↑↓ Navigate · Tab/Enter Insert · Esc Cancel
        </text>
      </box>
    </box>
  );
}

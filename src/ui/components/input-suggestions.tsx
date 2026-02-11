import { COLOR } from "@/constants/colors";
import type { CommandDefinition } from "@/constants/command-definitions";
import { FILE_SUGGESTION_KIND, type FileSuggestionKind } from "@/constants/file-suggestion-kind";
import { SEMANTIC_COLOR, getCategoryColor } from "@/constants/semantic-colors";
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
      borderColor={SEMANTIC_COLOR.COMMAND}
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
    >
      <text fg={SEMANTIC_COLOR.SECTION_HEADER} attributes={TextAttributes.BOLD}>
        Commands:
      </text>
      {commands.map((cmd, index) => (
        <box key={cmd.name} flexDirection="row" paddingLeft={1}>
          <text
            fg={index === selectedIndex ? SEMANTIC_COLOR.SELECTED : undefined}
            attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
          >
            {index === selectedIndex ? "▶ " : "  "}
          </text>
          <text
            fg={index === selectedIndex ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.COMMAND}
            attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
          >
            {cmd.name}
          </text>
          {cmd.args ? <text fg={SEMANTIC_COLOR.ARGS}> {cmd.args}</text> : null}
          <text fg={SEMANTIC_COLOR.DESCRIPTION} attributes={TextAttributes.DIM}>
            {` - ${cmd.description}`}
          </text>
          {cmd.category ? (
            <text fg={getCategoryColor(cmd.category)} attributes={TextAttributes.DIM}>
              {" "}
              [{cmd.category}]
            </text>
          ) : null}
        </box>
      ))}
      <box marginTop={1}>
        <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
          ↑↓ Navigate · Tab/Enter Select · Esc Cancel
        </text>
      </box>
    </box>
  );
}

export interface FileSuggestionsProps {
  suggestions: FileMentionSuggestion[];
  selectedIndex: number;
  isLoading: boolean;
  error: string | null;
}

export interface FileMentionSuggestion {
  kind: FileSuggestionKind;
  /** What to show after '@' in the suggestions list. */
  displayText: string;
  /** What to insert after '@' when selected. */
  insertText: string;
}

const suggestionColor = (kind: FileSuggestionKind): string => {
  switch (kind) {
    case FILE_SUGGESTION_KIND.FILE:
      return SEMANTIC_COLOR.FILE;
    case FILE_SUGGESTION_KIND.FOLDER:
      return SEMANTIC_COLOR.FOLDER;
  }
};

export function FileSuggestions({
  suggestions,
  selectedIndex,
  isLoading,
  error,
}: FileSuggestionsProps): ReactNode {
  if (suggestions.length === 0 && !isLoading && !error) return null;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="single"
      borderColor={SEMANTIC_COLOR.FILE}
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
    >
      <text fg={SEMANTIC_COLOR.FILE} attributes={TextAttributes.BOLD}>
        Paths:
      </text>
      {suggestions.map((suggestion, index) => (
        <box key={`${suggestion.kind}:${suggestion.displayText}`} paddingLeft={1}>
          <text
            fg={index === selectedIndex ? SEMANTIC_COLOR.SELECTED : undefined}
            attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
          >
            {index === selectedIndex ? "▶ " : "  "}
          </text>
          <text
            fg={
              index === selectedIndex ? SEMANTIC_COLOR.SELECTED : suggestionColor(suggestion.kind)
            }
            attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
          >
            @{suggestion.displayText}
          </text>
        </box>
      ))}
      {isLoading ? (
        <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
          Loading paths…
        </text>
      ) : error ? (
        <text fg={COLOR.RED}>{error}</text>
      ) : null}
      <box marginTop={1}>
        <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
          ↑↓ Navigate · Tab/Enter Insert · Esc Cancel
        </text>
      </box>
    </box>
  );
}

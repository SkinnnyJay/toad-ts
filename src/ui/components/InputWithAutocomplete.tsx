import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS, type CommandDefinition } from "@/constants/command-definitions";
import fg from "fast-glob";
import fuzzysort from "fuzzysort";
import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";

export type SlashCommand = CommandDefinition;

export interface InputWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  slashCommands?: SlashCommand[];
  placeholder?: string;
  /** Enable multiline editing; Enter inserts newline, Ctrl+Enter submits. Default: false. */
  multiline?: boolean;
  /** Enable @-mention file suggestions. Default: true. */
  enableMentions?: boolean;
}

const DEFAULT_COMMANDS: SlashCommand[] = COMMAND_DEFINITIONS;
const MENTION_REGEX = /@([\w./-]*)$/;
const MAX_FILES = 400;
const MENTION_SUGGESTION_LIMIT = 8;

export function InputWithAutocomplete({
  value,
  onChange,
  onSubmit,
  slashCommands = DEFAULT_COMMANDS,
  placeholder = "Type a message or / for commands...",
  multiline = false,
  enableMentions = true,
}: InputWithAutocompleteProps): JSX.Element {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Load project file list for @ mentions (basic ignore for node_modules/.git)
  useEffect(() => {
    if (!enableMentions) return;
    let cancelled = false;
    const loadFiles = async () => {
      try {
        setIsLoadingFiles(true);
        const files = await fg("**/*", {
          cwd: process.cwd(),
          onlyFiles: true,
          dot: false,
          ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.next/**"],
        });
        if (cancelled) return;
        setFilePaths(files.slice(0, MAX_FILES));
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setFileError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingFiles(false);
        }
      }
    };

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [enableMentions]);

  // Update cursor position when value changes externally
  useEffect(() => {
    setCursorPosition(value.length);
  }, [value]);

  // Calculate autocomplete suggestions for slash commands
  const commandSuggestions = useMemo(() => {
    if (!value.startsWith("/")) return [];
    const query = value.toLowerCase();
    return slashCommands.filter((cmd) => cmd.name.toLowerCase().startsWith(query));
  }, [value, slashCommands]);

  // Detect active @ mention token before cursor
  const mentionQuery = useMemo(() => {
    if (!enableMentions) return null;
    const beforeCursor = value.slice(0, cursorPosition);
    const match = beforeCursor.match(MENTION_REGEX);
    return match ? match[1] : null;
  }, [cursorPosition, enableMentions, value]);

  const mentionSuggestions = useMemo(() => {
    if (!enableMentions || !mentionQuery) return [];
    if (filePaths.length === 0) return [];
    const results = fuzzysort.go(mentionQuery, filePaths, {
      limit: MENTION_SUGGESTION_LIMIT,
    });
    return results.map((r) => r.target);
  }, [enableMentions, filePaths, mentionQuery]);

  // Show/hide autocomplete based on input
  useEffect(() => {
    setShowAutocomplete(value.startsWith("/") && commandSuggestions.length > 0);
    setSelectedIndex(0);
  }, [value, commandSuggestions]);

  const hasMentionSuggestions = mentionSuggestions.length > 0;

  // Handle keyboard input
  useInput((input, key) => {
    // Navigation inside suggestion lists
    if (showAutocomplete && commandSuggestions.length > 0) {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.tab || (key.return && commandSuggestions.length > 0)) {
        const selected = commandSuggestions[selectedIndex];
        if (selected) {
          const newValue = selected.name + (selected.args ? " " : "");
          onChange(newValue);
          setCursorPosition(newValue.length);
          setShowAutocomplete(false);
        }
        return;
      }
      if (key.escape) {
        setShowAutocomplete(false);
        return;
      }
    }

    if (hasMentionSuggestions) {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : mentionSuggestions.length - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < mentionSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.tab || key.return) {
        const selected = mentionSuggestions[selectedIndex];
        if (selected) {
          const before = value.slice(0, cursorPosition);
          const after = value.slice(cursorPosition);
          const replaced = before.replace(MENTION_REGEX, `@${selected} `) + after;
          const newCursor = before.replace(MENTION_REGEX, `@${selected} `).length;
          onChange(replaced);
          setCursorPosition(newCursor);
        }
        return;
      }
      if (key.escape) {
        setSelectedIndex(0);
        return;
      }
    }

    // Submit vs newline behavior
    if (key.return) {
      const wantsNewline = multiline && (key.shift || key.meta);
      if (wantsNewline) {
        const newValue = `${value.slice(0, cursorPosition)}\n${value.slice(cursorPosition)}`;
        onChange(newValue);
        setCursorPosition((prev) => prev + 1);
        return;
      }
      // Default: submit on Enter (and Ctrl+Enter)
      onSubmit(value);
      onChange("");
      setCursorPosition(0);
      return;
    }

    if (key.leftArrow) {
      setCursorPosition((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPosition((prev) => Math.min(value.length, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition((prev) => Math.max(0, prev - 1));
      }
      return;
    }

    // Handle regular character input
    // Don't capture input if modifier keys are pressed (Command, Ctrl, Shift)
    // Also don't capture escape sequences (Option/Alt key combinations on macOS)
    // This prevents numbers from appearing when using Command+number or Option+number shortcuts
    const isEscapeSequence = input.length >= 2 && input.charCodeAt(0) === 0x1b;
    const isModifierKey = key.ctrl || key.meta || key.shift;

    if (input && !isModifierKey && !isEscapeSequence) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition((prev) => prev + input.length);
    }
  });

  // Format display value with cursor
  const displayValue = useMemo(() => {
    if (value.length === 0) {
      return <Text dimColor>{placeholder}</Text>;
    }

    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    const cursor = <Text inverse> </Text>;

    return (
      <>
        <Text>{before}</Text>
        {cursor}
        <Text>{after}</Text>
      </>
    );
  }, [value, cursorPosition, placeholder]);

  return (
    <Box flexDirection="column" flexGrow={1} minWidth={0}>
      {/* Slash command suggestions */}
      {showAutocomplete && commandSuggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={COLOR.CYAN}
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <Text color={COLOR.CYAN} bold>
            Commands:
          </Text>
          {commandSuggestions.map((cmd, index) => (
            <Box key={cmd.name} paddingLeft={1}>
              <Text
                color={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? "▶ " : "  "}
                {cmd.name}
              </Text>
              {cmd.args && <Text color={COLOR.GRAY}> {cmd.args}</Text>}
              <Text color={COLOR.GRAY} dimColor>{` - ${cmd.description}`}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text dimColor color={COLOR.GRAY}>
              ↑↓ Navigate · Tab/Enter Select · Esc Cancel
            </Text>
          </Box>
        </Box>
      )}

      {/* @ mention suggestions */}
      {enableMentions && hasMentionSuggestions && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={COLOR.GREEN}
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <Text color={COLOR.GREEN} bold>
            Files:
          </Text>
          {mentionSuggestions.map((file, index) => (
            <Box key={file} paddingLeft={1}>
              <Text
                color={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? "▶ " : "  "}@{file}
              </Text>
            </Box>
          ))}
          {isLoadingFiles ? (
            <Text dimColor>Loading files…</Text>
          ) : fileError ? (
            <Text color={COLOR.RED}>{fileError}</Text>
          ) : null}
          <Box marginTop={1}>
            <Text dimColor color={COLOR.GRAY}>
              ↑↓ Navigate · Tab/Enter Insert · Esc Cancel
            </Text>
          </Box>
        </Box>
      )}

      {/* Input field */}
      <Box borderStyle="single" paddingLeft={1} paddingRight={1} flexGrow={1} minWidth={0}>
        <Text>› </Text>
        {displayValue}
      </Box>
    </Box>
  );
}

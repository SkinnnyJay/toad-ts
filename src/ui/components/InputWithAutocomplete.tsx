import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS, type CommandDefinition } from "@/constants/command-definitions";
import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";

export type SlashCommand = CommandDefinition;

export interface InputWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  slashCommands?: SlashCommand[];
  placeholder?: string;
}

const DEFAULT_COMMANDS: SlashCommand[] = COMMAND_DEFINITIONS;

export function InputWithAutocomplete({
  value,
  onChange,
  onSubmit,
  slashCommands = DEFAULT_COMMANDS,
  placeholder = "Type a message or / for commands...",
}: InputWithAutocompleteProps): JSX.Element {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Update cursor position when value changes externally
  useEffect(() => {
    setCursorPosition(value.length);
  }, [value]);

  // Calculate autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!value.startsWith("/")) return [];

    const query = value.toLowerCase();
    return slashCommands.filter((cmd) => cmd.name.toLowerCase().startsWith(query));
  }, [value, slashCommands]);

  // Show/hide autocomplete based on input
  useEffect(() => {
    setShowAutocomplete(value.startsWith("/") && suggestions.length > 0);
    setSelectedIndex(0);
  }, [value, suggestions]);

  // Handle keyboard input
  useInput((input, key) => {
    if (showAutocomplete) {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.tab || (key.return && suggestions.length > 0)) {
        const selected = suggestions[selectedIndex];
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

    if (key.return) {
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
    if (input && !key.ctrl && !key.meta) {
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
      {/* Autocomplete suggestions */}
      {showAutocomplete && suggestions.length > 0 && (
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
          {suggestions.map((cmd, index) => (
            <Box key={cmd.name} paddingLeft={1}>
              <Text
                color={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? "▶ " : "  "}
                {cmd.name}
              </Text>
              {cmd.args && <Text color={COLOR.GRAY}> {cmd.args}</Text>}
              <Text color={COLOR.GRAY} dimColor>
                {" "}
                - {cmd.description}
              </Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text dimColor color={COLOR.GRAY}>
              ↑↓ Navigate · Tab/Enter Select · Esc Cancel
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

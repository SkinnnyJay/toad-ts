import { COLOR } from "@/constants/colors";
import type { CommandDefinition } from "@/constants/command-definitions";
import fuzzysort from "fuzzysort";
import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";

interface CommandPaletteProps {
  commands: CommandDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: CommandDefinition) => void;
}

const MAX_RESULTS = 10;

export function CommandPalette({
  commands,
  isOpen,
  onClose,
  onSelect,
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setIndex(0);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return commands.slice(0, MAX_RESULTS).map((cmd) => ({ cmd, score: 0 }));
    const scored = fuzzysort.go(query, commands, {
      limit: MAX_RESULTS,
      key: "name",
    });
    return scored.map((res) => ({ cmd: res.obj, score: res.score }));
  }, [commands, query]);

  useInput((input, key) => {
    if (!isOpen) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setIndex((prev) => Math.min(results.length - 1, prev + 1));
      return;
    }

    if (key.return) {
      const selected = results[index]?.cmd;
      if (selected) {
        onSelect(selected);
      }
      onClose();
      return;
    }

    // Simple query typing (no cursor support here)
    if (input && !key.ctrl && !key.meta) {
      setQuery((prev) => `${prev}${input}`);
      return;
    }

    if (key.backspace || key.delete) {
      setQuery((prev) => prev.slice(0, -1));
      return;
    }
  });

  if (!isOpen) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLOR.CYAN}
      paddingX={1}
      paddingY={1}
      width="100%"
      minHeight={5}
      gap={1}
    >
      <Text color={COLOR.CYAN} bold>
        Command Palette
      </Text>
      <Text>{query || "Type to search commands..."}</Text>
      <Box flexDirection="column" gap={0}>
        {results.map(({ cmd }, idx) => (
          <Text key={cmd.name} color={idx === index ? COLOR.YELLOW : undefined}>
            {idx === index ? "› " : "  "}
            {cmd.name} {cmd.args ?? ""} — {cmd.description}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

import { COLOR } from "@/constants/colors";
import type { CommandDefinition } from "@/constants/command-definitions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import fuzzysort from "fuzzysort";
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

  useKeyboard((key) => {
    if (!isOpen) return;

    if (key.name === "escape") {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }

    if (key.name === "up") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.name === "down") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => Math.min(results.length - 1, prev + 1));
      return;
    }

    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      key.stopPropagation();
      const selected = results[index]?.cmd;
      if (selected) {
        onSelect(selected);
      }
      onClose();
      return;
    }

    // Simple query typing (no cursor support here)
    if (!key.ctrl && !key.meta && key.name.length === 1 && key.name !== " ") {
      setQuery((prev) => `${prev}${key.name}`);
      return;
    }

    if (key.name === "backspace" || key.name === "delete") {
      setQuery((prev) => prev.slice(0, -1));
      return;
    }
  });

  if (!isOpen) return null;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="single"
      borderColor={COLOR.CYAN}
      paddingX={1}
      paddingY={1}
      width="100%"
      minHeight={5}
      gap={1}
    >
      <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
        Command Palette
      </text>
      <text>{query || "Type to search commands…"}</text>
      <box flexDirection="column" gap={0}>
        {results.map(({ cmd }, idx) => (
          <text key={cmd.name} fg={idx === index ? COLOR.YELLOW : undefined}>
            {idx === index ? "› " : "  "}
            {cmd.name} {cmd.args ?? ""} — {cmd.description}
          </text>
        ))}
      </box>
    </box>
  );
}

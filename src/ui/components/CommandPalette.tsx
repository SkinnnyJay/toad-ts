import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import type { CommandDefinition } from "@/constants/command-definitions";
import { COMMAND_PALETTE_ROW_TYPE } from "@/constants/command-palette-row-types";
import { KEY_NAME } from "@/constants/key-names";
import { SEMANTIC_COLOR, getCategoryColor } from "@/constants/semantic-colors";
import { useAppStore } from "@/store/app-store";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import fuzzysort from "fuzzysort";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

const SECTION_RECENT = "recent";

type PaletteRow =
  | {
      type: typeof COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER;
      sectionKey: string;
      label: string;
    }
  | { type: typeof COMMAND_PALETTE_ROW_TYPE.COMMAND; cmd: CommandDefinition };

interface CommandPaletteProps {
  commands: CommandDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: CommandDefinition) => void;
}

function groupCommandsByCategory(
  commands: CommandDefinition[]
): { category: string; commands: CommandDefinition[] }[] {
  const byCategory = new Map<string, CommandDefinition[]>();
  const order: string[] = [];
  for (const cmd of commands) {
    const cat = cmd.category ?? "other";
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
      order.push(cat);
    }
    byCategory.get(cat)?.push(cmd);
  }
  return order.map((category) => ({
    category,
    commands: byCategory.get(category) ?? [],
  }));
}

export function CommandPalette({
  commands,
  isOpen,
  onClose,
  onSelect,
}: CommandPaletteProps): ReactNode {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const terminalDimensions = useTerminalDimensions();
  const recentCommandNames = useAppStore((state) => state.recentCommandNames);
  const loadRecentCommandsFromSettings = useAppStore(
    (state) => state.loadRecentCommandsFromSettings
  );
  const recordCommandUsed = useAppStore((state) => state.recordCommandUsed);

  /**
   * Available height for the palette = terminal rows minus all chrome
   * (header, footer, status bar, etc.) that sits outside the response area.
   * The palette container in Chat.tsx is a flexGrow box that fills the
   * response area exactly, so we match that here.
   */
  const availableHeight = useMemo(
    () =>
      Math.max(UI.COMMAND_PALETTE_HEADER_ROWS + 1, terminalDimensions.rows - UI.CHAT_CHROME_ROWS),
    [terminalDimensions.rows]
  );
  const maxPaletteHeight = useMemo(
    () => Math.min(UI.COMMAND_PALETTE_MAX_HEIGHT, availableHeight),
    [availableHeight]
  );
  const listHeight = useMemo(
    () =>
      Math.max(
        1,
        Math.min(UI.COMMAND_PALETTE_LIST_ROWS, maxPaletteHeight - UI.COMMAND_PALETTE_HEADER_ROWS)
      ),
    [maxPaletteHeight]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setIndex(0);
      loadRecentCommandsFromSettings();
    }
  }, [isOpen, loadRecentCommandsFromSettings]);

  const commandsByName = useMemo(() => {
    const m = new Map<string, CommandDefinition>();
    for (const cmd of commands) m.set(cmd.name, cmd);
    return m;
  }, [commands]);

  const visibleRows = useMemo((): PaletteRow[] => {
    if (query.trim()) {
      const scored = fuzzysort.go(query, commands, {
        limit: LIMIT.COMMAND_PALETTE_MAX_RESULTS,
        key: "name",
      });
      return scored.map((res) => ({
        type: COMMAND_PALETTE_ROW_TYPE.COMMAND,
        cmd: res.obj,
      }));
    }

    const rows: PaletteRow[] = [];
    let commandsAdded = 0;
    const recent = recentCommandNames
      .filter((name) => commandsByName.has(name))
      .slice(-LIMIT.RECENT_COMMANDS_DISPLAY)
      .reverse();
    if (recent.length > 0) {
      const recentRows: PaletteRow[] = [
        {
          type: COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER,
          sectionKey: SECTION_RECENT,
          label: "Recently used",
        },
      ];
      if (!collapsedSections[SECTION_RECENT]) {
        for (const name of recent) {
          if (commandsAdded >= LIMIT.COMMAND_PALETTE_MAX_RESULTS) break;
          const cmd = commandsByName.get(name);
          if (!cmd) continue;
          recentRows.push({ type: COMMAND_PALETTE_ROW_TYPE.COMMAND, cmd });
          commandsAdded += 1;
        }
      }
      // Only show the section if it contains at least one command row.
      if (recentRows.some((r) => r.type === COMMAND_PALETTE_ROW_TYPE.COMMAND)) {
        rows.push(...recentRows);
      }
    }

    const grouped = groupCommandsByCategory(commands);
    for (const { category, commands: catCommands } of grouped) {
      if (catCommands.length === 0) continue;
      if (commandsAdded >= LIMIT.COMMAND_PALETTE_MAX_RESULTS) break;

      const sectionRows: PaletteRow[] = [
        {
          type: COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER,
          sectionKey: category,
          label: category,
        },
      ];
      if (!collapsedSections[category]) {
        for (const cmd of catCommands) {
          if (commandsAdded >= LIMIT.COMMAND_PALETTE_MAX_RESULTS) break;
          sectionRows.push({ type: COMMAND_PALETTE_ROW_TYPE.COMMAND, cmd });
          commandsAdded += 1;
        }
      }
      // Only show the section if it contains at least one command row.
      if (sectionRows.some((r) => r.type === COMMAND_PALETTE_ROW_TYPE.COMMAND)) {
        rows.push(...sectionRows);
      }
    }
    return rows;
  }, [query, commands, commandsByName, recentCommandNames, collapsedSections]);

  const toggleSection = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  useEffect(() => {
    if (index >= visibleRows.length) setIndex(Math.max(0, visibleRows.length - 1));
  }, [visibleRows.length, index]);

  useKeyboard((key) => {
    if (!isOpen) return;

    if (key.name === KEY_NAME.ESCAPE) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }

    if (key.name === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.name === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => Math.min(visibleRows.length - 1, prev + 1));
      return;
    }

    if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
      const row = visibleRows[index];
      if (!row) return;
      if (row.type === COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER) {
        toggleSection(row.sectionKey);
        return;
      }
      recordCommandUsed(row.cmd.name);
      onSelect(row.cmd);
      onClose();
      return;
    }

    if (!key.ctrl && !key.meta && key.name.length === 1 && key.name !== KEY_NAME.SPACE) {
      setQuery((prev) => `${prev}${key.name}`);
      return;
    }

    if (key.name === KEY_NAME.BACKSPACE || key.name === KEY_NAME.DELETE) {
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
      borderColor={SEMANTIC_COLOR.COMMAND}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
      width={UI.COMMAND_PALETTE_WIDTH}
      minHeight={UI.COMMAND_PALETTE_HEADER_ROWS + 1}
      height={maxPaletteHeight}
      overflow="hidden"
      gap={0}
    >
      <ScrollArea height={listHeight} viewportCulling={true} focused={isOpen}>
        <box flexDirection="column" gap={0}>
          {visibleRows.map((row, idx) => {
            const isSelected = idx === index;
            if (row.type === COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER) {
              const collapsed = collapsedSections[row.sectionKey];
              return (
                <box
                  key={`section-${row.sectionKey}`}
                  flexDirection="row"
                  overflow="hidden"
                  minWidth={0}
                >
                  <text fg={isSelected ? SEMANTIC_COLOR.SELECTED : undefined}>
                    {isSelected ? "› " : "  "}
                  </text>
                  <text
                    fg={isSelected ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.SECTION_HEADER}
                    attributes={TextAttributes.BOLD}
                    truncate={true}
                  >
                    {row.sectionKey === SECTION_RECENT
                      ? row.label
                      : `${row.label.charAt(0).toUpperCase()}${row.label.slice(1)}`}{" "}
                    {collapsed ? "[+]" : "[-]"}
                  </text>
                </box>
              );
            }
            const { cmd } = row;
            return (
              <box key={cmd.name} flexDirection="row" overflow="hidden" minWidth={0}>
                <text fg={isSelected ? SEMANTIC_COLOR.SELECTED : undefined}>
                  {isSelected ? "› " : "  "}
                </text>
                <text
                  fg={isSelected ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.COMMAND}
                  truncate={true}
                >
                  {cmd.name}
                </text>
                {cmd.args ? (
                  <text fg={SEMANTIC_COLOR.ARGS} truncate={true}>
                    {" "}
                    {cmd.args}
                  </text>
                ) : null}
                <text
                  fg={SEMANTIC_COLOR.DESCRIPTION}
                  attributes={TextAttributes.DIM}
                  truncate={true}
                >
                  {" — "}
                  {cmd.description}
                </text>
                {cmd.category ? (
                  <text
                    fg={getCategoryColor(cmd.category)}
                    attributes={TextAttributes.DIM}
                    truncate={true}
                  >
                    {" "}
                    [{cmd.category}]
                  </text>
                ) : null}
              </box>
            );
          })}
        </box>
      </ScrollArea>
    </box>
  );
}

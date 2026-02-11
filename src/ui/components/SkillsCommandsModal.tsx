import { UI } from "@/config/ui";
import { DISCOVERY_SUBPATH } from "@/constants/discovery-subpaths";
import {
  DISCOVERY_VIEW,
  type DiscoveryViewMode,
  SOURCE_ORDER,
  getSourceColor,
} from "@/constants/discovery-view";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { SEMANTIC_COLOR } from "@/constants/semantic-colors";
import type { LoadedCommand, LoadedSkill } from "@/types/domain";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useMemo, useState } from "react";

type DiscoveryItem = Pick<LoadedSkill, "name" | "description" | "source">;

interface SkillsCommandsModalProps {
  isOpen: boolean;
  mode: (typeof DISCOVERY_SUBPATH)[keyof typeof DISCOVERY_SUBPATH];
  skills?: LoadedSkill[];
  commands?: LoadedCommand[];
  onClose: () => void;
}

function toItems(skills?: LoadedSkill[], commands?: LoadedCommand[]): DiscoveryItem[] {
  if (skills && skills.length > 0) {
    return skills.map((s) => ({ name: s.name, description: s.description, source: s.source }));
  }
  if (commands && commands.length > 0) {
    return commands.map((c) => ({ name: c.name, description: c.description, source: c.source }));
  }
  return [];
}

function flatSorted(items: DiscoveryItem[]): DiscoveryItem[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function groupBySource(items: DiscoveryItem[]): Array<{ source: string; items: DiscoveryItem[] }> {
  const bySource = new Map<string, DiscoveryItem[]>();
  for (const item of items) {
    const list = bySource.get(item.source) ?? [];
    list.push(item);
    bySource.set(item.source, list);
  }
  const result: Array<{ source: string; items: DiscoveryItem[] }> = [];
  for (const source of SOURCE_ORDER) {
    const list = bySource.get(source);
    if (list && list.length > 0) {
      result.push({
        source,
        items: list.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
      });
      bySource.delete(source);
    }
  }
  for (const [source, list] of bySource) {
    result.push({
      source,
      items: list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    });
  }
  return result;
}

export function SkillsCommandsModal({
  isOpen,
  mode,
  skills,
  commands,
  onClose,
}: SkillsCommandsModalProps): ReactNode {
  const symbols = useUiSymbols();
  const [viewMode, setViewMode] = useState<DiscoveryViewMode>(DISCOVERY_VIEW.FLAT);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => toItems(skills, commands), [skills, commands]);
  const flatList = useMemo(() => flatSorted(items), [items]);
  const grouped = useMemo(() => groupBySource(items), [items]);

  const flatCount = flatList.length;
  const groupedCount = grouped.reduce((acc, g) => acc + g.items.length, 0);

  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEYBOARD_INPUT.SKIP_LOWER)) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }
    if (key.name === KEY_NAME.TAB) {
      key.preventDefault();
      key.stopPropagation();
      setViewMode((prev) =>
        prev === DISCOVERY_VIEW.FLAT ? DISCOVERY_VIEW.GROUPED : DISCOVERY_VIEW.FLAT
      );
      setIndex(0);
      return;
    }
    if (viewMode === DISCOVERY_VIEW.FLAT && flatCount > 0) {
      if (key.name === KEY_NAME.UP) {
        key.preventDefault();
        key.stopPropagation();
        setIndex((prev) => (prev - 1 + flatCount) % flatCount);
        return;
      }
      if (key.name === KEY_NAME.DOWN) {
        key.preventDefault();
        key.stopPropagation();
        setIndex((prev) => (prev + 1) % flatCount);
        return;
      }
    }
    if (viewMode === DISCOVERY_VIEW.GROUPED && groupedCount > 0) {
      if (key.name === KEY_NAME.UP) {
        key.preventDefault();
        key.stopPropagation();
        setIndex((prev) => (prev - 1 + groupedCount) % groupedCount);
        return;
      }
      if (key.name === KEY_NAME.DOWN) {
        key.preventDefault();
        key.stopPropagation();
        setIndex((prev) => (prev + 1) % groupedCount);
        return;
      }
    }
  });

  if (!isOpen) return null;

  const title = mode === DISCOVERY_SUBPATH.SKILLS ? "Skills" : "Commands";
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
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={SEMANTIC_COLOR.SECTION_HEADER} attributes={TextAttributes.BOLD}>
            {title}
          </text>
          <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
            {" "}
            (Tab: {viewMode === DISCOVERY_VIEW.FLAT ? "Grouped" : "Flat"} | Esc/Ctrl+S: Close)
          </text>
        </box>
      </box>

      <box flexDirection="row" gap={1} marginBottom={1}>
        <text
          fg={viewMode === DISCOVERY_VIEW.FLAT ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.HINT}
          attributes={viewMode === DISCOVERY_VIEW.FLAT ? TextAttributes.BOLD : undefined}
        >
          {symbols.BULLET} Flat
        </text>
        <text
          fg={viewMode === DISCOVERY_VIEW.GROUPED ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.HINT}
          attributes={viewMode === DISCOVERY_VIEW.GROUPED ? TextAttributes.BOLD : undefined}
        >
          {symbols.BULLET} Grouped
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        {items.length === 0 ? (
          <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
            No {mode} discovered. Add {mode} under .claude/{mode}/, .cursor/{mode}/, or similar.
          </text>
        ) : viewMode === DISCOVERY_VIEW.FLAT ? (
          flatList.map((item, i) => {
            const isSelected = i === index;
            const sourceColor = getSourceColor(item.source);
            return (
              <box key={`${item.source}-${item.name}-${i}`} flexDirection="column" gap={0}>
                <text fg={isSelected ? SEMANTIC_COLOR.SELECTED : undefined}>
                  {isSelected ? `${symbols.CHEVRON} ` : "  "}
                  <text fg={sourceColor}>[{item.source}]</text>{" "}
                  <text fg={isSelected ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.SKILL_NAME}>
                    {item.name}
                  </text>
                </text>
                {item.description ? (
                  <text
                    fg={SEMANTIC_COLOR.DESCRIPTION}
                    attributes={TextAttributes.DIM}
                    marginLeft={2}
                  >
                    {item.description}
                  </text>
                ) : null}
              </box>
            );
          })
        ) : (
          grouped.map(({ source, items: groupItems }) => (
            <box key={source} flexDirection="column" gap={0} marginBottom={1}>
              <text fg={getSourceColor(source)} attributes={TextAttributes.BOLD}>
                [{source}]
              </text>
              {groupItems.map((item, i) => {
                const groupStartIndex = grouped
                  .slice(
                    0,
                    grouped.findIndex((g) => g.source === source)
                  )
                  .reduce((acc, g) => acc + g.items.length, 0);
                const globalIdx = groupStartIndex + i;
                const isSelected = globalIdx === index;
                return (
                  <box key={`${source}-${item.name}-${i}`} flexDirection="column" gap={0}>
                    <text fg={isSelected ? SEMANTIC_COLOR.SELECTED : undefined}>
                      {isSelected ? `${symbols.CHEVRON} ` : "  "}
                      <text fg={isSelected ? SEMANTIC_COLOR.SELECTED : SEMANTIC_COLOR.SKILL_NAME}>
                        {item.name}
                      </text>
                    </text>
                    {item.description ? (
                      <text
                        fg={SEMANTIC_COLOR.DESCRIPTION}
                        attributes={TextAttributes.DIM}
                        marginLeft={2}
                      >
                        {item.description}
                      </text>
                    ) : null}
                  </box>
                );
              })}
            </box>
          ))
        )}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text fg={SEMANTIC_COLOR.HINT} attributes={TextAttributes.DIM}>
          Tab: Switch view | ↑/↓: Navigate | Esc/Ctrl+S: Close
        </text>
      </box>
    </box>
  );
}

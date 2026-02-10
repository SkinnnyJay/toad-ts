import type { KeybindConfig } from "@/config/app-config";
import { COLOR } from "@/constants/colors";
import { KEYBIND_ACTION } from "@/constants/keybind-actions";
import type { KeybindAction } from "@/constants/keybind-actions";
import { NONE } from "@/constants/keybinds";
import { formatKeyEvent } from "@/ui/keybinds/keybinds";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useMemo, useState } from "react";

const KEYBIND_ROW = {
  LEADER: "leader",
} as const;

const KEYBIND_LABEL = {
  LEADER: "Leader key",
  [KEYBIND_ACTION.FOCUS_CHAT]: "Focus chat",
  [KEYBIND_ACTION.FOCUS_FILES]: "Focus files",
  [KEYBIND_ACTION.FOCUS_PLAN]: "Focus plan",
  [KEYBIND_ACTION.FOCUS_CONTEXT]: "Focus context",
  [KEYBIND_ACTION.FOCUS_SESSIONS]: "Focus sessions",
  [KEYBIND_ACTION.FOCUS_AGENT]: "Focus agents",
  [KEYBIND_ACTION.OPEN_HELP]: "Open help",
  [KEYBIND_ACTION.TOGGLE_SESSIONS]: "Toggle sessions",
  [KEYBIND_ACTION.TOGGLE_BACKGROUND_TASKS]: "Toggle background tasks",
  [KEYBIND_ACTION.OPEN_THEMES]: "Open themes",
  [KEYBIND_ACTION.OPEN_SETTINGS]: "Open settings",
  [KEYBIND_ACTION.TOGGLE_TOOL_DETAILS]: "Toggle tool details",
  [KEYBIND_ACTION.TOGGLE_THINKING]: "Toggle thinking",
  [KEYBIND_ACTION.PERMISSION_MODE_CYCLE]: "Cycle permission mode",
  [KEYBIND_ACTION.SESSION_CHILD_CYCLE]: "Cycle child sessions",
  [KEYBIND_ACTION.SESSION_CHILD_CYCLE_REVERSE]: "Cycle child sessions (reverse)",
} as const;

const KEYBIND_ACTION_ORDER: KeybindAction[] = [
  KEYBIND_ACTION.FOCUS_CHAT,
  KEYBIND_ACTION.FOCUS_FILES,
  KEYBIND_ACTION.FOCUS_PLAN,
  KEYBIND_ACTION.FOCUS_CONTEXT,
  KEYBIND_ACTION.FOCUS_SESSIONS,
  KEYBIND_ACTION.FOCUS_AGENT,
  KEYBIND_ACTION.OPEN_HELP,
  KEYBIND_ACTION.TOGGLE_SESSIONS,
  KEYBIND_ACTION.TOGGLE_BACKGROUND_TASKS,
  KEYBIND_ACTION.OPEN_THEMES,
  KEYBIND_ACTION.OPEN_SETTINGS,
  KEYBIND_ACTION.TOGGLE_TOOL_DETAILS,
  KEYBIND_ACTION.TOGGLE_THINKING,
  KEYBIND_ACTION.PERMISSION_MODE_CYCLE,
  KEYBIND_ACTION.SESSION_CHILD_CYCLE,
  KEYBIND_ACTION.SESSION_CHILD_CYCLE_REVERSE,
];

interface KeybindsTabProps {
  isActive: boolean;
  keybinds: KeybindConfig;
  onUpdate: (keybinds: KeybindConfig) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export function KeybindsTab({
  isActive,
  keybinds,
  onUpdate,
  onEditingChange,
}: KeybindsTabProps): ReactNode {
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const bindings = keybinds.bindings ?? {};

  const rows = useMemo(() => {
    return [
      { id: KEYBIND_ROW.LEADER, label: KEYBIND_LABEL.LEADER },
      ...KEYBIND_ACTION_ORDER.map((action) => ({
        id: action,
        label: KEYBIND_LABEL[action],
      })),
    ];
  }, []);

  useKeyboard((key) => {
    if (!isActive) {
      return;
    }

    if (isEditing) {
      key.preventDefault();
      key.stopPropagation();

      if (key.name === "escape") {
        setIsEditing(false);
        onEditingChange?.(false);
        return;
      }

      if (key.name === "backspace" || key.name === "delete") {
        updateBinding(NONE);
        return;
      }

      const chord = formatKeyEvent(key);
      if (!chord) {
        return;
      }
      updateBinding(chord);
      return;
    }

    if (key.name === "up") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + rows.length) % rows.length);
      return;
    }

    if (key.name === "down") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + 1) % rows.length);
      return;
    }

    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      key.stopPropagation();
      setIsEditing(true);
      onEditingChange?.(true);
    }
  });

  const updateBinding = (binding: string): void => {
    const selected = rows[index];
    if (!selected) {
      return;
    }
    if (selected.id === KEYBIND_ROW.LEADER) {
      onUpdate({
        leader: binding,
        bindings,
      });
    } else {
      onUpdate({
        leader: keybinds.leader,
        bindings: {
          ...bindings,
          [selected.id]: binding,
        },
      });
    }
    setIsEditing(false);
    onEditingChange?.(false);
  };

  if (!isActive) {
    return null;
  }

  return (
    <box flexDirection="column" flexGrow={1} minHeight={0}>
      <text attributes={TextAttributes.DIM}>
        Select a keybind and press Enter to edit. Esc cancels.
      </text>
      <box flexDirection="column" marginTop={1} gap={0}>
        {rows.map((row, idx) => {
          const isSelected = idx === index;
          const binding =
            row.id === KEYBIND_ROW.LEADER ? keybinds.leader : (bindings[row.id] ?? NONE);
          return (
            <box key={row.id} flexDirection="row" justifyContent="space-between">
              <text fg={isSelected ? COLOR.GREEN : COLOR.WHITE}>
                {isSelected ? "› " : "  "}
                {row.label}
              </text>
              <text fg={isEditing && isSelected ? COLOR.YELLOW : COLOR.GRAY}>{binding}</text>
            </box>
          );
        })}
      </box>
    </box>
  );
}

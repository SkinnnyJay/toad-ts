import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { useAppStore } from "@/store/app-store";
import { THEME_DEFINITIONS, THEME_ORDER } from "@/ui/theme/theme-definitions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

interface ThemesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemesModal({ isOpen, onClose }: ThemesModalProps): ReactNode {
  const currentTheme = useAppStore((state) => state.uiState.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const [index, setIndex] = useState(0);

  const themes = useMemo(() => THEME_ORDER.map((themeId) => THEME_DEFINITIONS[themeId]), []);

  useEffect(() => {
    const selectedIndex = themes.findIndex((theme) => theme.id === currentTheme);
    if (selectedIndex >= 0) {
      setIndex(selectedIndex);
    }
  }, [currentTheme, themes]);

  useKeyboard((key) => {
    if (!isOpen) return;
    if (themes.length === 0) return;

    if (key.name === "up") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + themes.length) % themes.length);
      return;
    }
    if (key.name === "down") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + 1) % themes.length);
      return;
    }
    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      key.stopPropagation();
      const selected = themes[index];
      if (selected) {
        setTheme(selected.id);
      }
      return;
    }
    if (key.name === "escape") {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;

  const contentMinHeight = UI.POPUP_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.POPUP_HEIGHT}
      width={UI.POPUP_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Themes (Esc to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight} gap={1}>
        {themes.map((theme, idx) => {
          const isSelected = idx === index;
          const isActive = theme.id === currentTheme;
          return (
            <box key={theme.id} flexDirection="column" paddingLeft={1} paddingRight={1}>
              <text fg={isSelected ? COLOR.GREEN : isActive ? COLOR.CYAN : COLOR.WHITE}>
                {isSelected ? "› " : "  "}
                {isActive && !isSelected ? "● " : "  "}
                {theme.label}
              </text>
              <text attributes={TextAttributes.DIM}>{theme.description}</text>
            </box>
          );
        })}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>↑/↓: Navigate | Enter: Apply theme | Esc: Close</text>
      </box>
    </box>
  );
}

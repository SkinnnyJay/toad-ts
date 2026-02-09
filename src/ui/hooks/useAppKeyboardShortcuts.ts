import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { VIEW, type View } from "@/constants/views";
import { useInput } from "ink";
import { useState } from "react";

export interface UseAppKeyboardShortcutsOptions {
  view: View;
}

export interface UseAppKeyboardShortcutsResult {
  focusTarget: FocusTarget;
  setFocusTarget: (target: FocusTarget) => void;
  isSessionsPopupOpen: boolean;
  setIsSessionsPopupOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
}

/**
 * Focus target mapping for number shortcuts.
 * Command/Ctrl + 1-5 maps to different focus targets.
 */
export const FOCUS_NUMBER_MAP: Record<string, FocusTarget> = {
  "1": FOCUS_TARGET.FILES,
  "2": FOCUS_TARGET.PLAN,
  "3": FOCUS_TARGET.CONTEXT,
  "4": FOCUS_TARGET.SESSIONS,
  "5": FOCUS_TARGET.AGENT,
};

/**
 * Detects Option+backtick escape sequence.
 * On macOS, Option+` produces an escape sequence starting with 0x1b.
 */
export const isOptionBacktick = (input: string): boolean => {
  return input.length >= 2 && input.charCodeAt(0) === 0x1b && input.slice(1) === "`";
};

/**
 * Hook to manage application-level keyboard shortcuts.
 * Handles focus navigation, modal toggles, and escape sequences.
 */
export function useAppKeyboardShortcuts({
  view,
}: UseAppKeyboardShortcutsOptions): UseAppKeyboardShortcutsResult {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(FOCUS_TARGET.CHAT);
  const [isSessionsPopupOpen, setIsSessionsPopupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useInput((input, key) => {
    // Only handle shortcuts in chat view
    if (view !== VIEW.CHAT) return;

    // Option+` (backtick) to focus back on chat
    if (isOptionBacktick(input)) {
      setFocusTarget(FOCUS_TARGET.CHAT);
      return;
    }

    // Command/Ctrl+number sets focus (1=Files, 2=Plan, 3=Context, 4=Sessions, 5=Sub-agents)
    if ((key.meta || key.ctrl) && /^[1-5]$/.test(input)) {
      setFocusTarget(FOCUS_NUMBER_MAP[input] ?? FOCUS_TARGET.CHAT);
      return;
    }

    // Cmd/Ctrl+F focuses Files panel
    if ((key.meta || key.ctrl) && (input === "f" || input === "F")) {
      setFocusTarget(FOCUS_TARGET.FILES);
      return;
    }

    // Cmd/Ctrl+? or Cmd/Ctrl+/ opens help
    if ((key.meta || key.ctrl) && (input === "?" || input === "/")) {
      setIsHelpOpen(true);
      return;
    }

    // Escape returns focus to chat
    if (key.escape) {
      setFocusTarget(FOCUS_TARGET.CHAT);
      return;
    }

    // Ctrl+S toggles sessions popup
    if (key.ctrl && (input === "s" || input === "S")) {
      setIsSessionsPopupOpen((prev) => !prev);
    }
  });

  return {
    focusTarget,
    setFocusTarget,
    isSessionsPopupOpen,
    setIsSessionsPopupOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isHelpOpen,
    setIsHelpOpen,
  };
}

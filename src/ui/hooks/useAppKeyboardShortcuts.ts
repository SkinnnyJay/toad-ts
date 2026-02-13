import { DEFAULT_APP_CONFIG, type KeybindConfig } from "@/config/app-config";
import { TIMEOUT } from "@/config/timeouts";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBIND_ACTION } from "@/constants/keybind-actions";
import { NAVIGATION_DIRECTION, type NavigationDirection } from "@/constants/navigation-direction";
import { VIEW, type View } from "@/constants/views";
import { useAppStore } from "@/store/app-store";
import {
  createKeybindRuntime,
  isActionTriggered,
  isLeaderKey,
  normalizeKeyName,
} from "@/ui/keybinds/keybinds";
import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseAppKeyboardShortcutsOptions {
  view: View;
  onNavigateChildSession?: (direction: NavigationDirection) => void;
  keybinds?: KeybindConfig;
  onCyclePermissionMode?: () => void;
  onRunBreadcrumbAction?: () => void;
  /** When true, Escape is not consumed so App-owned modals (Context, Hooks, etc.) can close. */
  hasOtherModalOpen?: boolean;
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
  isBackgroundTasksOpen: boolean;
  setIsBackgroundTasksOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isThemesOpen: boolean;
  setIsThemesOpen: (open: boolean) => void;
  isRewindOpen: boolean;
  setIsRewindOpen: (open: boolean) => void;
  isSkillsOpen: boolean;
  setIsSkillsOpen: (open: boolean) => void;
  isCommandsOpen: boolean;
  setIsCommandsOpen: (open: boolean) => void;
}

/**
 * Focus target mapping for number shortcuts.
 * Command/Ctrl + digit keys maps to different focus targets.
 */
const FOCUS_TARGET_SEQUENCE = [
  FOCUS_TARGET.FILES,
  FOCUS_TARGET.PLAN,
  FOCUS_TARGET.CONTEXT,
  FOCUS_TARGET.SESSIONS,
  FOCUS_TARGET.AGENT,
  FOCUS_TARGET.TODOS,
] as const;

export const FOCUS_NUMBER_MAP: Record<string, FocusTarget> = Object.fromEntries(
  FOCUS_TARGET_SEQUENCE.map((target, index) => [String(index + 1), target])
);

export type FocusShortcutKey = string;

export const isFocusShortcutKey = (keyName: string): keyName is FocusShortcutKey => {
  return Object.hasOwn(FOCUS_NUMBER_MAP, keyName);
};

/**
 * Detects Option+backtick escape sequence.
 * On macOS, Option+` produces an escape sequence starting with 0x1b.
 */
export const isOptionBacktick = (key: Pick<KeyEvent, "option" | "name">): boolean => {
  return key.option && key.name === KEY_NAME.BACKTICK;
};

/**
 * Hook to manage application-level keyboard shortcuts.
 * Handles focus navigation, modal toggles, and escape sequences.
 */
export function useAppKeyboardShortcuts({
  view,
  onNavigateChildSession,
  keybinds,
  onCyclePermissionMode,
  onRunBreadcrumbAction,
  hasOtherModalOpen = false,
}: UseAppKeyboardShortcutsOptions): UseAppKeyboardShortcutsResult {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(FOCUS_TARGET.CHAT);
  const [isSessionsPopupOpen, setIsSessionsPopupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBackgroundTasksOpen, setIsBackgroundTasksOpen] = useState(false);
  const [isThemesOpen, setIsThemesOpen] = useState(false);
  const [isRewindOpen, setIsRewindOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isCommandsOpen, setIsCommandsOpen] = useState(false);
  const leaderActive = useRef(false);
  const leaderTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastEscapeAt = useRef<number | null>(null);
  const toggleToolDetails = useAppStore((state) => state.toggleToolDetails);
  const toggleThinking = useAppStore((state) => state.toggleThinking);
  const keybindRuntime = useMemo(() => {
    const base = DEFAULT_APP_CONFIG.keybinds;
    const config = {
      leader: keybinds?.leader ?? base.leader,
      bindings: {
        ...base.bindings,
        ...(keybinds?.bindings ?? {}),
      },
    };
    return createKeybindRuntime(config);
  }, [keybinds]);

  const resetLeader = useCallback(() => {
    leaderActive.current = false;
    if (leaderTimeout.current) {
      clearTimeout(leaderTimeout.current);
      leaderTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      resetLeader();
    };
  }, [resetLeader]);

  useKeyboard((key) => {
    // Only handle shortcuts in chat view
    if (view !== VIEW.CHAT) return;

    const keyName = normalizeKeyName(key.name);
    const isLeaderPressed = isLeaderKey(key, keybindRuntime);
    if (isLeaderPressed) {
      key.preventDefault();
      key.stopPropagation();
      leaderActive.current = true;
      if (leaderTimeout.current) {
        clearTimeout(leaderTimeout.current);
      }
      leaderTimeout.current = setTimeout(() => {
        leaderActive.current = false;
        leaderTimeout.current = null;
      }, TIMEOUT.LEADER_KEY_TIMEOUT_MS);
      return;
    }

    if (
      isOptionBacktick(key) ||
      isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_CHAT, leaderActive.current)
    ) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.CHAT);
      return;
    }

    if ((key.meta || key.ctrl) && isFocusShortcutKey(keyName)) {
      key.preventDefault();
      key.stopPropagation();
      const focusTargetForShortcut = FOCUS_NUMBER_MAP[keyName];
      if (!focusTargetForShortcut) {
        return;
      }
      setFocusTarget(focusTargetForShortcut);
      return;
    }

    if (isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_FILES, leaderActive.current)) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.FILES);
      return;
    }

    if (isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_PLAN, leaderActive.current)) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.PLAN);
      return;
    }

    if (
      isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_CONTEXT, leaderActive.current)
    ) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.CONTEXT);
      return;
    }

    if (
      isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_SESSIONS, leaderActive.current)
    ) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.SESSIONS);
      return;
    }

    if (isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_AGENT, leaderActive.current)) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.AGENT);
      return;
    }

    if (isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.FOCUS_TODOS, leaderActive.current)) {
      key.preventDefault();
      key.stopPropagation();
      setFocusTarget(FOCUS_TARGET.TODOS);
      return;
    }

    if (isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.OPEN_HELP, leaderActive.current)) {
      key.preventDefault();
      key.stopPropagation();
      setIsHelpOpen(true);
      return;
    }

    if (
      isActionTriggered(
        key,
        keybindRuntime,
        KEYBIND_ACTION.TOGGLE_BACKGROUND_TASKS,
        leaderActive.current
      )
    ) {
      key.preventDefault();
      key.stopPropagation();
      setIsBackgroundTasksOpen((prev) => !prev);
      return;
    }

    if (
      isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.TOGGLE_SESSIONS, leaderActive.current)
    ) {
      key.preventDefault();
      key.stopPropagation();
      setIsSessionsPopupOpen((prev) => !prev);
      return;
    }

    if (isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.OPEN_THEMES, leaderActive.current)) {
      key.preventDefault();
      key.stopPropagation();
      setIsThemesOpen(true);
      resetLeader();
      return;
    }

    if (
      isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.OPEN_SETTINGS, leaderActive.current)
    ) {
      key.preventDefault();
      key.stopPropagation();
      setIsSettingsOpen(true);
      resetLeader();
      return;
    }

    if (
      isActionTriggered(
        key,
        keybindRuntime,
        KEYBIND_ACTION.TOGGLE_TOOL_DETAILS,
        leaderActive.current
      )
    ) {
      key.preventDefault();
      key.stopPropagation();
      toggleToolDetails();
      resetLeader();
      return;
    }

    if (
      isActionTriggered(key, keybindRuntime, KEYBIND_ACTION.TOGGLE_THINKING, leaderActive.current)
    ) {
      key.preventDefault();
      key.stopPropagation();
      toggleThinking();
      resetLeader();
      return;
    }

    if (
      isActionTriggered(
        key,
        keybindRuntime,
        KEYBIND_ACTION.PERMISSION_MODE_CYCLE,
        leaderActive.current
      )
    ) {
      key.preventDefault();
      key.stopPropagation();
      onCyclePermissionMode?.();
      return;
    }

    if (
      isActionTriggered(
        key,
        keybindRuntime,
        KEYBIND_ACTION.SESSION_CHILD_CYCLE,
        leaderActive.current
      )
    ) {
      key.preventDefault();
      key.stopPropagation();
      onNavigateChildSession?.(NAVIGATION_DIRECTION.NEXT);
      resetLeader();
      return;
    }

    if (
      isActionTriggered(
        key,
        keybindRuntime,
        KEYBIND_ACTION.SESSION_CHILD_CYCLE_REVERSE,
        leaderActive.current
      )
    ) {
      key.preventDefault();
      key.stopPropagation();
      onNavigateChildSession?.(NAVIGATION_DIRECTION.PREV);
      resetLeader();
      return;
    }

    if (
      isActionTriggered(
        key,
        keybindRuntime,
        KEYBIND_ACTION.RUN_BREADCRUMB_ACTION,
        leaderActive.current
      )
    ) {
      key.preventDefault();
      key.stopPropagation();
      onRunBreadcrumbAction?.();
      resetLeader();
      return;
    }

    // Escape: close modal if one is open, otherwise double-escape for Rewind or return focus to chat
    if (keyName === KEY_NAME.ESCAPE) {
      if (hasOtherModalOpen) {
        return;
      }
      if (isRewindOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsRewindOpen(false);
        return;
      }
      if (isSkillsOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsSkillsOpen(false);
        return;
      }
      if (isCommandsOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsCommandsOpen(false);
        return;
      }
      if (isSessionsPopupOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsSessionsPopupOpen(false);
        return;
      }
      if (isSettingsOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsSettingsOpen(false);
        return;
      }
      if (isHelpOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsHelpOpen(false);
        return;
      }
      if (isBackgroundTasksOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsBackgroundTasksOpen(false);
        return;
      }
      if (isThemesOpen) {
        key.preventDefault();
        key.stopPropagation();
        setIsThemesOpen(false);
        return;
      }
      const now = Date.now();
      const last = lastEscapeAt.current;
      lastEscapeAt.current = now;
      if (last && now - last <= TIMEOUT.DOUBLE_ESCAPE_MS) {
        key.preventDefault();
        key.stopPropagation();
        setIsRewindOpen(true);
        lastEscapeAt.current = null;
        return;
      }
      resetLeader();
      setFocusTarget(FOCUS_TARGET.CHAT);
      return;
    }

    if (leaderActive.current) {
      resetLeader();
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
    isBackgroundTasksOpen,
    setIsBackgroundTasksOpen,
    isThemesOpen,
    setIsThemesOpen,
    isRewindOpen,
    setIsRewindOpen,
    isSkillsOpen,
    setIsSkillsOpen,
    isCommandsOpen,
    setIsCommandsOpen,
  };
}

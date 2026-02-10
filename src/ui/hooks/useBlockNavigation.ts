import type { Message, MessageId } from "@/types/domain";
import { useCallback, useState } from "react";

export interface BlockNavigationState {
  /** Currently focused message index (-1 = none) */
  focusedIndex: number;
  /** Currently focused message ID */
  focusedMessageId: MessageId | null;
  /** Navigate to the next message block */
  navigateNext: () => void;
  /** Navigate to the previous message block */
  navigatePrev: () => void;
  /** Navigate to the first message */
  navigateFirst: () => void;
  /** Navigate to the last message */
  navigateLast: () => void;
  /** Clear focus */
  clearFocus: () => void;
  /** Whether block navigation is active */
  isActive: boolean;
}

/**
 * TOAD-style block navigation: cursor through conversation messages like Jupyter cells.
 * Arrow keys move between blocks, Enter/Space triggers per-block actions.
 */
export const useBlockNavigation = (messages: Message[]): BlockNavigationState => {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const navigateNext = useCallback(() => {
    setFocusedIndex((prev) => {
      const next = prev + 1;
      return next < messages.length ? next : prev;
    });
  }, [messages.length]);

  const navigatePrev = useCallback(() => {
    setFocusedIndex((prev) => {
      const next = prev - 1;
      return next >= 0 ? next : prev;
    });
  }, []);

  const navigateFirst = useCallback(() => {
    if (messages.length > 0) setFocusedIndex(0);
  }, [messages.length]);

  const navigateLast = useCallback(() => {
    if (messages.length > 0) setFocusedIndex(messages.length - 1);
  }, [messages.length]);

  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  const focusedMessageId =
    focusedIndex >= 0 && focusedIndex < messages.length
      ? (messages[focusedIndex]?.id ?? null)
      : null;

  return {
    focusedIndex,
    focusedMessageId,
    navigateNext,
    navigatePrev,
    navigateFirst,
    navigateLast,
    clearFocus,
    isActive: focusedIndex >= 0,
  };
};

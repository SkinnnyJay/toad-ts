import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import type { Message, MessageId } from "@/types/domain";
import { copyToClipboard } from "@/utils/clipboard/clipboard.utils";
import { useCallback, useState } from "react";

export interface BlockAction {
  type: "copy" | "resend" | "export";
  messageId: MessageId;
}

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
  /** Copy focused block text to clipboard */
  copyFocusedBlock: () => Promise<boolean>;
  /** Get the focused message object */
  getFocusedMessage: () => Message | null;
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

  const copyFocusedBlock = useCallback(async (): Promise<boolean> => {
    if (focusedIndex < 0 || focusedIndex >= messages.length) return false;
    const message = messages[focusedIndex];
    if (!message) return false;
    const text = message.content
      .filter((b) => b.type === CONTENT_BLOCK_TYPE.TEXT && "text" in b)
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
    return copyToClipboard(text);
  }, [focusedIndex, messages]);

  const getFocusedMessage = useCallback((): Message | null => {
    if (focusedIndex < 0 || focusedIndex >= messages.length) return null;
    return messages[focusedIndex] ?? null;
  }, [focusedIndex, messages]);

  return {
    focusedIndex,
    focusedMessageId,
    navigateNext,
    navigatePrev,
    navigateFirst,
    navigateLast,
    clearFocus,
    isActive: focusedIndex >= 0,
    copyFocusedBlock,
    getFocusedMessage,
  };
};

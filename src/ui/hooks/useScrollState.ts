import { useCallback, useEffect, useState } from "react";

export interface UseScrollStateOptions {
  totalItems: number;
  visibleItems: number;
  controlledScrollOffset?: number;
  onScrollChange?: (offset: number) => void;
}

export interface UseScrollStateResult {
  scrollOffset: number;
  setScrollOffset: (offset: number) => void;
  userHasScrolled: boolean;
  setUserHasScrolled: (value: boolean) => void;
  maxScrollOffset: number;
  clampedScrollOffset: number;
  isAtBottom: boolean;
}

/**
 * Hook to manage scroll state for virtualized lists.
 * Supports both controlled and uncontrolled modes.
 */
export function useScrollState({
  totalItems,
  visibleItems,
  controlledScrollOffset,
  onScrollChange,
}: UseScrollStateOptions): UseScrollStateResult {
  const [internalScrollOffset, setInternalScrollOffset] = useState(0);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // Use controlled scroll offset if provided, otherwise use internal state
  const isControlled = controlledScrollOffset !== undefined;
  const scrollOffset = isControlled ? controlledScrollOffset : internalScrollOffset;

  const setScrollOffset = useCallback(
    (newOffset: number) => {
      if (isControlled) {
        onScrollChange?.(newOffset);
      } else {
        setInternalScrollOffset(newOffset);
      }
    },
    [isControlled, onScrollChange]
  );

  const maxScrollOffset = Math.max(0, totalItems - visibleItems);

  // Clamp scrollOffset to valid range
  const clampedScrollOffset = Math.max(0, Math.min(scrollOffset, maxScrollOffset));

  // Sync internal state if clamped value differs
  useEffect(() => {
    if (!isControlled && clampedScrollOffset !== scrollOffset) {
      setScrollOffset(clampedScrollOffset);
    }
  }, [clampedScrollOffset, isControlled, scrollOffset, setScrollOffset]);

  // Auto-scroll to bottom when new items arrive (if user hasn't manually scrolled)
  // Only auto-scroll in uncontrolled mode
  useEffect(() => {
    if (!isControlled && !userHasScrolled && totalItems > 0) {
      setScrollOffset(maxScrollOffset);
    }
  }, [totalItems, maxScrollOffset, userHasScrolled, isControlled, setScrollOffset]);

  const isAtBottom = scrollOffset >= maxScrollOffset;

  return {
    scrollOffset,
    setScrollOffset,
    userHasScrolled,
    setUserHasScrolled,
    maxScrollOffset,
    clampedScrollOffset,
    isAtBottom,
  };
}

/**
 * Calculates scrollbar properties for rendering.
 */
export const calculateScrollbarProps = (
  totalItems: number,
  visibleItems: number,
  scrollOffset: number,
  scrollbarHeight: number
): { needsScrollbar: boolean; thumbSize: number; thumbPosition: number } => {
  const needsScrollbar = totalItems > visibleItems;
  const maxScrollOffset = Math.max(0, totalItems - visibleItems);

  const thumbSize =
    needsScrollbar && totalItems > 0
      ? Math.max(1, Math.round((visibleItems / totalItems) * scrollbarHeight))
      : scrollbarHeight;

  const thumbPosition =
    needsScrollbar && maxScrollOffset > 0
      ? Math.round((scrollOffset / maxScrollOffset) * (scrollbarHeight - thumbSize))
      : 0;

  return { needsScrollbar, thumbSize, thumbPosition };
};

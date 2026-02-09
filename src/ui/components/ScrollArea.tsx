import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { Box, Text, useInput, useStdout } from "ink";
import React, { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

interface ScrollAreaProps {
  children: ReactNode;
  height?: number;
  showScrollbar?: boolean;
  isFocused?: boolean;
  estimatedLinesPerItem?: number;
  scrollOffset?: number; // Controlled scroll offset
  onScrollChange?: (offset: number) => void; // Callback for scroll changes
  showScrollHints?: boolean; // Show scroll hints (not implemented yet)
}

export const ScrollArea = memo(function ScrollArea({
  children,
  height,
  showScrollbar = true,
  isFocused = true,
  estimatedLinesPerItem = 3,
  scrollOffset: controlledScrollOffset,
  onScrollChange,
  showScrollHints: _showScrollHints = true, // Reserved for future use
}: ScrollAreaProps): JSX.Element {
  const { stdout } = useStdout();
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

  // Get terminal dimensions (clamped to avoid negative heights on rapid resize)
  const terminalRows = stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS;

  const normalizedHeight = useMemo(() => {
    const requestedHeight = height ?? Math.max(5, terminalRows - 20);
    return Math.max(3, Math.floor(requestedHeight));
  }, [height, terminalRows]);

  // Convert children to array - memoize to prevent recreation on every render
  const childArray = useMemo(() => React.Children.toArray(children).filter(Boolean), [children]);
  const totalItems = childArray.length;

  // Calculate how many items can fit in the visible area
  const safeEstimated = Math.max(1, Math.floor(estimatedLinesPerItem));
  const visibleItems = Math.max(1, Math.floor(normalizedHeight / safeEstimated));
  const maxScrollOffset = Math.max(0, totalItems - visibleItems);

  // Clamp scrollOffset to valid range
  const clampedScrollOffset = Math.max(0, Math.min(scrollOffset, maxScrollOffset));

  useEffect(() => {
    if (!isControlled && clampedScrollOffset !== scrollOffset) {
      setScrollOffset(clampedScrollOffset);
    }
  }, [clampedScrollOffset, isControlled, scrollOffset, setScrollOffset]);

  // Auto-scroll to bottom when new messages arrive (if user hasn't manually scrolled)
  // Only auto-scroll in uncontrolled mode
  useEffect(() => {
    if (!isControlled && !userHasScrolled && totalItems > 0) {
      setScrollOffset(maxScrollOffset);
    }
  }, [totalItems, maxScrollOffset, userHasScrolled, isControlled, setScrollOffset]);

  // Handle keyboard scrolling
  useInput((input, key) => {
    if (!isFocused) return;

    let newOffset = scrollOffset;
    let didScroll = false;

    if (key.upArrow || input === "k") {
      newOffset = Math.max(0, scrollOffset - 1);
      didScroll = true;
    } else if (key.downArrow || input === "j") {
      newOffset = Math.min(maxScrollOffset, scrollOffset + 1);
      didScroll = true;
    } else if (key.pageUp) {
      newOffset = Math.max(0, scrollOffset - visibleItems);
      didScroll = true;
    } else if (key.pageDown) {
      newOffset = Math.min(maxScrollOffset, scrollOffset + visibleItems);
      didScroll = true;
    }

    if (didScroll && newOffset !== scrollOffset) {
      setScrollOffset(newOffset);
      setUserHasScrolled(true);
      // Resume auto-scroll if at bottom
      if (newOffset >= maxScrollOffset) {
        setUserHasScrolled(false);
      }
    }
  });

  // Get the visible slice - THIS IS KEY!
  // Only render the items that should be visible based on scrollOffset
  const visibleChildren = useMemo(() => {
    const start = clampedScrollOffset;
    const end = Math.min(start + visibleItems, totalItems);
    const sliced = childArray.slice(start, end);
    // Ensure we never return more items than can fit
    return sliced.slice(0, visibleItems);
  }, [childArray, clampedScrollOffset, visibleItems, totalItems]);

  // Calculate scrollbar properties
  const needsScrollbar = totalItems > visibleItems;
  // Scrollbar height should match the effective height (number of visible lines)
  const scrollbarHeight = Math.max(1, normalizedHeight);
  const thumbSize =
    needsScrollbar && totalItems > 0
      ? Math.max(1, Math.round((visibleItems / totalItems) * scrollbarHeight))
      : scrollbarHeight;
  const thumbPosition =
    needsScrollbar && maxScrollOffset > 0
      ? Math.round((scrollOffset / maxScrollOffset) * (scrollbarHeight - thumbSize))
      : 0;

  // Generate scrollbar items with stable keys
  const scrollbarItems = useMemo(() => {
    return Array.from({ length: scrollbarHeight }, (_, i) => ({
      id: `scrollbar-line-${i}`,
      index: i,
    }));
  }, [scrollbarHeight]);

  return (
    <Box flexDirection="row" width="100%" height={normalizedHeight} overflow="hidden" minWidth={0}>
      <Box
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        height={normalizedHeight}
        overflow="hidden"
        minWidth={0}
        minHeight={0}
        width="100%"
      >
        {/* Only show the windowed children, not all of them! */}
        {visibleChildren}
      </Box>
      {showScrollbar && needsScrollbar && (
        <Box flexDirection="column" marginLeft={1} flexShrink={0} height={normalizedHeight}>
          {scrollbarItems.map(({ id, index: i }) => (
            <Text
              key={id}
              color={i >= thumbPosition && i < thumbPosition + thumbSize ? COLOR.CYAN : COLOR.GRAY}
            >
              {i >= thumbPosition && i < thumbPosition + thumbSize ? "█" : "│"}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
});

ScrollArea.displayName = "ScrollArea";

import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import type { Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { useScrollState } from "@/ui/hooks/useScrollState";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, memo, useMemo } from "react";

interface MessageListProps {
  messages: Message[];
  /** Render only the most recent N messages to reduce output load. */
  maxMessages?: number;
  height?: number;
  isFocused?: boolean;
}

const RESERVED_ROWS = {
  statusFooter: 3,
  inputArea: 7,
  marginBetween: 1,
  chatHeader: 4,
} as const;

export const MessageList = memo(
  ({
    messages,
    maxMessages = LIMIT.MESSAGE_LIST_MAX_MESSAGES,
    height,
    isFocused = true,
  }: MessageListProps): ReactNode => {
    const terminal = useTerminalDimensions();
    const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

    const limitedMessages = useMemo(() => {
      if (messages.length <= maxMessages) return messages;
      return messages.slice(-maxMessages);
    }, [maxMessages, messages]);

    const terminalRows = terminal.rows ?? UI.TERMINAL_DEFAULT_ROWS;
    const reservedSpace =
      RESERVED_ROWS.statusFooter +
      RESERVED_ROWS.inputArea +
      RESERVED_ROWS.marginBetween +
      RESERVED_ROWS.chatHeader;
    const rawHeight = height ?? Math.max(LIMIT.MIN_TERMINAL_ROWS, terminalRows - reservedSpace);
    const effectiveHeight = Math.max(8, Math.floor(rawHeight));

    // Calculate ScrollArea height: effectiveHeight minus border (2 lines) and padding (2 lines)
    const scrollAreaHeight = Math.max(3, effectiveHeight - 4);
    const visibleItems = Math.max(
      1,
      Math.floor(scrollAreaHeight / LIMIT.MESSAGE_LIST_ESTIMATED_ROW_HEIGHT)
    );

    const {
      clampedScrollOffset,
      setScrollOffset,
      userHasScrolled,
      setUserHasScrolled,
      isAtBottom,
    } = useScrollState({
      totalItems: limitedMessages.length,
      visibleItems,
    });

    useKeyboard((key) => {
      if (!isFocused || limitedMessages.length <= visibleItems) return;
      const pageJump = Math.max(1, visibleItems - 1);

      if (key.name === "pageup") {
        key.preventDefault();
        key.stopPropagation();
        setUserHasScrolled(true);
        setScrollOffset(Math.max(0, clampedScrollOffset - pageJump));
      }

      if (key.name === "pagedown") {
        key.preventDefault();
        key.stopPropagation();
        const nextOffset = Math.min(
          clampedScrollOffset + pageJump,
          Math.max(0, limitedMessages.length - visibleItems)
        );
        setScrollOffset(nextOffset);
        if (nextOffset >= limitedMessages.length - visibleItems) {
          setUserHasScrolled(false);
        }
      }

      if (key.name === "home") {
        key.preventDefault();
        key.stopPropagation();
        setUserHasScrolled(true);
        setScrollOffset(0);
      }

      if (key.name === "end") {
        key.preventDefault();
        key.stopPropagation();
        const endOffset = Math.max(0, limitedMessages.length - visibleItems);
        setScrollOffset(endOffset);
        setUserHasScrolled(false);
      }
    });

    const windowStart = Math.max(0, clampedScrollOffset - LIMIT.MESSAGE_LIST_BUFFER);
    const windowEnd = Math.min(
      limitedMessages.length,
      clampedScrollOffset + visibleItems + LIMIT.MESSAGE_LIST_BUFFER
    );
    const visibleMessages = limitedMessages.slice(windowStart, windowEnd);

    const messageElements = useMemo(
      () => visibleMessages.map((message) => <MessageItem key={message.id} message={message} />),
      [visibleMessages]
    );

    if (isEmpty) {
      return (
        <box
          width="100%"
          height={effectiveHeight}
          flexDirection="column"
          justifyContent="flex-end"
          alignItems="flex-start"
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          border={true}
          borderStyle="single"
          borderColor={COLOR.GRAY}
        >
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            No messages yet
          </text>
        </box>
      );
    }

    return (
      <box
        width="100%"
        height={effectiveHeight}
        border={true}
        borderStyle="single"
        borderColor={COLOR.GRAY}
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        paddingBottom={1}
        flexDirection="column"
      >
        <ScrollArea
          height={scrollAreaHeight}
          stickyScroll={!userHasScrolled || isAtBottom}
          stickyStart="bottom"
          viewportCulling={true}
          focused={isFocused}
        >
          {messageElements}
        </ScrollArea>
      </box>
    );
  }
);

MessageList.displayName = "MessageList";

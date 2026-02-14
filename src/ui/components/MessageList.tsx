import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { KEY_NAME } from "@/constants/key-names";
import type { ContentBlock as ChatContentBlock, Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { useScrollState } from "@/ui/hooks/useScrollState";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { useToolCalls } from "@/ui/hooks/useToolCalls";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, memo, useMemo } from "react";
import stripAnsi from "strip-ansi";

interface MessageListProps {
  messages: Message[];
  /** Optional hard cap of most-recent messages; omit to use full transcript virtualization. */
  maxMessages?: number;
  height?: number;
  isFocused?: boolean;
}

const RESERVED_ROWS = {
  statusFooter: LIMIT.MESSAGE_LIST_RESERVED_STATUS_FOOTER_ROWS,
  inputArea: LIMIT.MESSAGE_LIST_RESERVED_INPUT_AREA_ROWS,
  marginBetween: 1,
  chatHeader: LIMIT.MESSAGE_LIST_RESERVED_CHAT_HEADER_ROWS,
} as const;

const MESSAGE_LIST_MIN_HEIGHT = LIMIT.MESSAGE_LIST_MIN_HEIGHT;

function estimateWrappedLines(text: string, wrapWidth: number): number {
  const plain = stripAnsi(text ?? "");
  if (plain.length === 0) return 0;
  const lines = plain.split(/\r?\n/);
  let total = 0;
  for (const line of lines) {
    total += Math.max(1, Math.ceil(line.length / wrapWidth));
  }
  return total;
}

function estimateBlockLines(block: ChatContentBlock, wrapWidth: number): number {
  switch (block.type) {
    case CONTENT_BLOCK_TYPE.TEXT:
    case CONTENT_BLOCK_TYPE.THINKING:
      return estimateWrappedLines(block.text ?? "", wrapWidth);
    case CONTENT_BLOCK_TYPE.CODE:
      return Math.min(estimateWrappedLines(block.text ?? "", wrapWidth), LIMIT.MAX_BLOCK_LINES) + 1;
    case CONTENT_BLOCK_TYPE.TOOL_CALL:
      return LIMIT.MESSAGE_LIST_TOOL_CALL_LINES;
    case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
    case CONTENT_BLOCK_TYPE.RESOURCE:
      return 1;
    default:
      return 1;
  }
}

function estimateTotalContentLines(messages: Message[]): number {
  const wrapWidth = LIMIT.MESSAGE_BAR_WRAP_WIDTH;
  let total = 0;
  for (const message of messages) {
    total += 1; // header per message
    for (const block of message.content) {
      total += estimateBlockLines(block, wrapWidth);
    }
    if (message.isStreaming) {
      total += LIMIT.STREAMING_BAR_BUFFER_LINES;
    }
    total += LIMIT.MESSAGE_LIST_MESSAGE_MARGIN_ROWS; // margin between messages
  }
  return total;
}

export const MessageList = memo(
  ({ messages, maxMessages, height, isFocused = true }: MessageListProps): ReactNode => {
    const { toolCalls } = useToolCalls();
    const terminal = useTerminalDimensions();
    const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

    const limitedMessages = useMemo(() => {
      if (!maxMessages || maxMessages <= 0 || messages.length <= maxMessages) {
        return messages;
      }
      return messages.slice(-maxMessages);
    }, [maxMessages, messages]);

    const terminalRows = terminal.rows ?? UI.TERMINAL_DEFAULT_ROWS;
    const reservedSpace =
      RESERVED_ROWS.statusFooter +
      RESERVED_ROWS.inputArea +
      RESERVED_ROWS.marginBetween +
      RESERVED_ROWS.chatHeader;
    const maxHeight = Math.max(LIMIT.MIN_TERMINAL_ROWS, terminalRows - reservedSpace);

    const estimatedContentLines = useMemo(
      () => estimateTotalContentLines(limitedMessages),
      [limitedMessages]
    );

    const effectiveHeight =
      height !== undefined ? Math.max(MESSAGE_LIST_MIN_HEIGHT, Math.floor(height)) : maxHeight;

    // ScrollArea height: effectiveHeight minus border (2 lines) and padding (2 lines)
    const scrollAreaHeight = Math.max(
      LIMIT.MESSAGE_LIST_MIN_SCROLLAREA_HEIGHT,
      effectiveHeight - LIMIT.MESSAGE_LIST_SCROLLAREA_FRAME_ROWS
    );
    const visibleItems = Math.max(
      1,
      Math.floor(scrollAreaHeight / LIMIT.MESSAGE_LIST_ESTIMATED_ROW_HEIGHT)
    );
    const shouldEnableScrollY =
      limitedMessages.length > visibleItems || estimatedContentLines > scrollAreaHeight;

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
      if (!isFocused || !shouldEnableScrollY) return;
      const pageJump = Math.max(1, visibleItems - 1);

      if (key.name === KEY_NAME.PAGEUP) {
        key.preventDefault();
        key.stopPropagation();
        setUserHasScrolled(true);
        setScrollOffset(Math.max(0, clampedScrollOffset - pageJump));
      }

      if (key.name === KEY_NAME.PAGEDOWN) {
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

      if (key.name === KEY_NAME.HOME) {
        key.preventDefault();
        key.stopPropagation();
        setUserHasScrolled(true);
        setScrollOffset(0);
      }

      if (key.name === KEY_NAME.END) {
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
      () =>
        visibleMessages.map((message) => (
          <MessageItem key={message.id} message={message} toolCallsById={toolCalls} />
        )),
      [toolCalls, visibleMessages]
    );

    if (isEmpty) {
      return (
        <box
          width="100%"
          flexShrink={0}
          minHeight={MESSAGE_LIST_MIN_HEIGHT}
          height={effectiveHeight}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          border={true}
          borderStyle="single"
          borderColor={COLOR.GRAY}
          alignItems="center"
          justifyContent="center"
        >
          <text fg={COLOR.GRAY}>No messages yet</text>
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
          scrollY={shouldEnableScrollY}
        >
          {messageElements}
        </ScrollArea>
      </box>
    );
  }
);

MessageList.displayName = "MessageList";

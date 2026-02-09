import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import type { Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo, useMemo } from "react";

interface MessageListProps {
  messages: Message[];
  /** Render only the most recent N messages to reduce output load. */
  maxMessages?: number;
  height?: number;
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
  }: MessageListProps): ReactNode => {
    const terminal = useTerminalDimensions();
    const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

    const limitedMessages = useMemo(() => {
      if (messages.length <= maxMessages) return messages;
      return messages.slice(-maxMessages);
    }, [maxMessages, messages]);

    const messageElements = useMemo(
      () => limitedMessages.map((message) => <MessageItem key={message.id} message={message} />),
      [limitedMessages]
    );

    const terminalRows = terminal.rows ?? UI.TERMINAL_DEFAULT_ROWS;
    const reservedSpace =
      RESERVED_ROWS.statusFooter +
      RESERVED_ROWS.inputArea +
      RESERVED_ROWS.marginBetween +
      RESERVED_ROWS.chatHeader;
    const rawHeight = height ?? Math.max(LIMIT.MIN_TERMINAL_ROWS, terminalRows - reservedSpace);
    const effectiveHeight = Math.max(8, Math.floor(rawHeight));

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

    // Calculate ScrollArea height: effectiveHeight minus border (2 lines) and padding (2 lines)
    const scrollAreaHeight = Math.max(3, effectiveHeight - 4);

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
          stickyScroll={true}
          stickyStart="bottom"
          viewportCulling={true}
          focused={true}
        >
          {messageElements}
        </ScrollArea>
      </box>
    );
  }
);

MessageList.displayName = "MessageList";

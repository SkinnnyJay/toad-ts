import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import type { Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { Box, Text, useStdout } from "ink";
import { memo, useMemo } from "react";
import stripAnsi from "strip-ansi";

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
  ({ messages, maxMessages = 120, height }: MessageListProps): JSX.Element => {
    const { stdout } = useStdout();
    const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

    const limitedMessages = useMemo(() => {
      if (messages.length <= maxMessages) return messages;
      return messages.slice(-maxMessages);
    }, [maxMessages, messages]);

    const estimatedLinesPerItem = useMemo(() => {
      if (limitedMessages.length === 0) return 1;
      const totalLines = limitedMessages.reduce((sum, message) => {
        const blockLines = message.content.reduce((blockSum, block) => {
          if (
            block.type === CONTENT_BLOCK_TYPE.TEXT ||
            block.type === CONTENT_BLOCK_TYPE.THINKING
          ) {
            return blockSum + stripAnsi(block.text ?? "").split(/\r?\n/).length;
          }
          if (block.type === CONTENT_BLOCK_TYPE.CODE) {
            const codeLines = stripAnsi(block.text ?? "").split(/\r?\n/).length;
            return blockSum + Math.min(codeLines, LIMIT.MAX_BLOCK_LINES);
          }
          return blockSum + 1;
        }, 0);
        return sum + Math.max(1, blockLines);
      }, 0);
      const average = totalLines / limitedMessages.length;
      return Math.max(1, Math.min(Math.round(average), 12));
    }, [limitedMessages]);

    const messageElements = useMemo(
      () => limitedMessages.map((message) => <MessageItem key={message.id} message={message} />),
      [limitedMessages]
    );

    const terminalRows = stdout?.rows ?? UI.TERMINAL_DEFAULT_ROWS;
    const reservedSpace =
      RESERVED_ROWS.statusFooter +
      RESERVED_ROWS.inputArea +
      RESERVED_ROWS.marginBetween +
      RESERVED_ROWS.chatHeader;
    const rawHeight = height ?? Math.max(10, terminalRows - reservedSpace);
    const effectiveHeight = Math.max(8, Math.floor(rawHeight));

    if (isEmpty) {
      return (
        <Box
          width="100%"
          height={effectiveHeight}
          flexDirection="column"
          justifyContent="flex-end"
          alignItems="flex-start"
          paddingX={1}
          paddingY={1}
          borderStyle="single"
          borderColor={COLOR.GRAY}
        >
          <Text color={COLOR.GRAY}>No messages yet</Text>
        </Box>
      );
    }

    // Calculate ScrollArea height: effectiveHeight minus border (2 lines) and padding (2 lines)
    const scrollAreaHeight = Math.max(3, effectiveHeight - 4);

    return (
      <Box
        width="100%"
        height={effectiveHeight}
        borderStyle="single"
        borderColor={COLOR.GRAY}
        paddingX={1}
        paddingY={1}
        flexDirection="column"
      >
        <ScrollArea
          height={scrollAreaHeight}
          showScrollbar={true}
          isFocused={true}
          estimatedLinesPerItem={estimatedLinesPerItem}
        >
          {messageElements}
        </ScrollArea>
      </Box>
    );
  }
);

MessageList.displayName = "MessageList";

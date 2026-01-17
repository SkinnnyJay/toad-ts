import { COLOR } from "@/constants/colors";
import type { Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { Box, Text, useStdout } from "ink";
import { memo, useMemo } from "react";

interface MessageListProps {
  messages: Message[];
  /** Render only the most recent N messages to reduce output load. */
  maxMessages?: number;
  height?: number;
}

export const MessageList = memo(
  ({ messages, maxMessages = 120, height }: MessageListProps): JSX.Element => {
    const { stdout } = useStdout();
    // Memoize the empty state check
    const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

    // For performance, we still limit total messages but let ScrollArea handle the windowing
    const limitedMessages = useMemo(() => {
      if (messages.length <= maxMessages) return messages;
      // Keep the most recent messages
      return messages.slice(-maxMessages);
    }, [maxMessages, messages]);

    // Memoize message IDs to prevent unnecessary re-renders
    const messageElements = useMemo(
      () => limitedMessages.map((message) => <MessageItem key={message.id} message={message} />),
      [limitedMessages]
    );

    // Calculate height: terminal rows minus input area and margin
    // Leave space for: StatusFooter (3), Input area (~7 lines for multiline), Margin between (1), Chat header (~4)
    const terminalRows = stdout?.rows ?? 24;
    const statusFooterHeight = 3;
    const inputAreaHeight = 7; // Estimated input height (multiline with minHeight=5 + padding)
    const marginBetween = 1; // Margin between message container and input
    const chatHeaderHeight = 4; // Estimated header height
    const reservedSpace = statusFooterHeight + inputAreaHeight + marginBetween + chatHeaderHeight;
    const effectiveHeight = height ?? Math.max(10, terminalRows - reservedSpace);

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
    const scrollAreaHeight = effectiveHeight - 4;

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
          estimatedLinesPerItem={3}
        >
          {messageElements}
        </ScrollArea>
      </Box>
    );
  }
);

MessageList.displayName = "MessageList";

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

    // Calculate fixed height: terminal rows minus:
    // - StatusFooter (3 lines)
    // - Chat container padding (paddingY={1} = 2 lines total)
    // - Chat header section (variable, estimate ~3-5 lines)
    // - Input area (estimate ~3-4 lines)
    // - Margin/gaps (1 line)
    const terminalRows = stdout?.rows ?? 24;
    const containerPaddingY = 2; // paddingY={1} means 1 top + 1 bottom = 2 lines
    const statusFooterHeight = 3;
    const chatHeaderHeight = 4; // Estimated header height
    const inputAreaHeight = 4; // Estimated input height
    const gapsAndMargins = 2; // Margins between sections
    const effectiveHeight =
      height ??
      Math.max(
        10,
        terminalRows -
          statusFooterHeight -
          containerPaddingY -
          chatHeaderHeight -
          inputAreaHeight -
          gapsAndMargins
      );

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

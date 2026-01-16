import type { Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { Box, Text } from "ink";
import { memo, useMemo } from "react";

interface MessageListProps {
  messages: Message[];
}

export const MessageList = memo(({ messages }: MessageListProps): JSX.Element => {
  // Memoize the empty state check
  const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

  // Memoize message IDs to prevent unnecessary re-renders
  // Only re-render when messages actually change (not just reference changes)
  const messageElements = useMemo(
    () => messages.map((message) => <MessageItem key={message.id} message={message} />),
    [messages]
  );

  if (isEmpty) {
    return (
      <Box height="100%" justifyContent="center" alignItems="center">
        <Text dimColor>No messages yet</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} height="100%" overflow="hidden">
      {messageElements}
    </Box>
  );
});

MessageList.displayName = "MessageList";

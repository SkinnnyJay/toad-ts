import type { Message } from "@/types/domain";
import { MessageItem } from "@/ui/components/MessageItem";
import { Box, Text } from "ink";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps): JSX.Element {
  if (messages.length === 0) {
    return <Text dimColor>No messages yet</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </Box>
  );
}

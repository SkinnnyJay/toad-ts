import type { ContentBlock, Message } from "@/types/domain";
import { Box, Text } from "ink";

interface MessageItemProps {
  message: Message;
}

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return block.text;
    case "code":
      return block.text;
    case "thinking":
      return block.text;
    case "tool_call":
      return `${block.name ?? "tool"} (${block.status})`;
    case "resource_link":
      return `${block.name} (${block.uri})`;
    case "resource": {
      const resource = block.resource;
      if ("text" in resource) {
        return `Resource ${resource.uri}: ${resource.text}`;
      }
      return `Resource ${resource.uri}: [binary ${resource.mimeType ?? "data"}]`;
    }
    default:
      return "";
  }
}

export function MessageItem({ message }: MessageItemProps): JSX.Element {
  return (
    <Box flexDirection="column" paddingLeft={1} gap={0}>
      <Text color="cyan">[{message.role}]</Text>
      {message.content.map((block, idx) => (
        <Text key={`${message.id}-${idx}`}>{renderBlock(block)}</Text>
      ))}
    </Box>
  );
}

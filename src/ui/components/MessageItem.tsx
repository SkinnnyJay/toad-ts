import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import type { ContentBlock as ChatContentBlock, Message as ChatMessage } from "@/types/domain";
import { roleColor } from "@/ui/theme";
import { Box, Text } from "ink";
import { memo } from "react";

interface MessageItemProps {
  message: ChatMessage;
}

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function renderBlock(block: ChatContentBlock): JSX.Element {
  switch (block.type) {
    case CONTENT_BLOCK_TYPE.TEXT:
      return <Text>{block.text}</Text>;
    case CONTENT_BLOCK_TYPE.THINKING:
      return (
        <Text dimColor italic>
          {block.text}
        </Text>
      );
    case CONTENT_BLOCK_TYPE.CODE: {
      const lang = block.language ?? "";
      const lines = block.text.split(/\r?\n/);
      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COLOR.GRAY}
          padding={1}
          gap={0}
        >
          {lang ? (
            <Text color={COLOR.GRAY} dimColor>
              {lang}
            </Text>
          ) : null}
          {lines.map((line) => (
            <Text key={`${block.language ?? "code"}-${line}`} color={COLOR.GREEN}>
              {line || " "}
            </Text>
          ))}
        </Box>
      );
    }

    case CONTENT_BLOCK_TYPE.TOOL_CALL: {
      const label = block.name ?? "tool";
      return (
        <Text color={COLOR.YELLOW}>
          {label} ({block.status})
        </Text>
      );
    }
    case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
      return (
        <Text>
          {block.name} (<Text dimColor>{block.uri}</Text>)
        </Text>
      );
    case CONTENT_BLOCK_TYPE.RESOURCE: {
      const resource = block.resource;
      if ("text" in resource) {
        return (
          <Text>
            Resource {resource.uri}: {resource.text}
          </Text>
        );
      }
      return (
        <Text>
          Resource {resource.uri}: [binary {resource.mimeType ?? "data"}]
        </Text>
      );
    }
    default:
      return <Text />;
  }
}

const mergeTextBlocks = (blocks: ChatContentBlock[]): ChatContentBlock[] => {
  const merged: ChatContentBlock[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    const isTextLike =
      block.type === CONTENT_BLOCK_TYPE.TEXT || block.type === CONTENT_BLOCK_TYPE.THINKING;
    const lastIsTextLike =
      last && (last.type === CONTENT_BLOCK_TYPE.TEXT || last.type === CONTENT_BLOCK_TYPE.THINKING);
    if (isTextLike && lastIsTextLike && last.type === block.type) {
      const combinedText = `${(last as { text: string }).text}${block.text}`;
      merged[merged.length - 1] = { ...last, text: combinedText } as ChatContentBlock;
    } else {
      merged.push(block);
    }
  }
  return merged;
};

export const MessageItem = memo(({ message }: MessageItemProps): JSX.Element => {
  const mergedBlocks = mergeTextBlocks(message.content);
  return (
    <Box flexDirection="column" paddingLeft={1} gap={0} marginY={1}>
      <Box gap={1} marginBottom={1}>
        <Text bold color={roleColor(message.role)}>
          [{message.role.toUpperCase()}]
        </Text>
        <Text dimColor>{formatTime(message.createdAt)}</Text>
      </Box>
      {mergedBlocks.map((block, idx) => (
        <Box key={`${message.id}-${idx}`} paddingLeft={1}>
          {renderBlock(block)}
        </Box>
      ))}
    </Box>
  );
});

MessageItem.displayName = "MessageItem";

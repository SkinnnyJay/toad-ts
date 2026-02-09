import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { ContentBlock as ChatContentBlock, Message as ChatMessage } from "@/types/domain";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "@/ui/components/TruncationProvider";
import { roleColor } from "@/ui/theme";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo, useCallback, useMemo } from "react";
import stripAnsi from "strip-ansi";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface MessageItemProps {
  message: ChatMessage;
}

const env = new Env(EnvManager.getInstance());
const EXPAND_ALL = env.getBoolean(ENV_KEY.TOADSTOOL_EXPAND_ALL, false);

const countLines = (text: string): number => stripAnsi(text ?? "").split(/\r?\n/).length;

type TextLikeBlock = Extract<
  ChatContentBlock,
  { type: typeof CONTENT_BLOCK_TYPE.TEXT | typeof CONTENT_BLOCK_TYPE.THINKING }
>;

const isTextLikeBlock = (block: ChatContentBlock): block is TextLikeBlock =>
  block.type === CONTENT_BLOCK_TYPE.TEXT || block.type === CONTENT_BLOCK_TYPE.THINKING;

const mergeTextBlocks = (blocks: ChatContentBlock[]): ChatContentBlock[] => {
  const merged: ChatContentBlock[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (isTextLikeBlock(block) && last && isTextLikeBlock(last) && last.type === block.type) {
      const combinedText = `${last.text}${block.text}`;
      merged[merged.length - 1] = { ...last, text: combinedText };
    } else {
      merged.push(block);
    }
  }
  return merged;
};

const countBlockLines = (block: ChatContentBlock): number => {
  if (block.type === CONTENT_BLOCK_TYPE.TEXT || block.type === CONTENT_BLOCK_TYPE.THINKING) {
    return countLines(block.text ?? "");
  }
  if (block.type === CONTENT_BLOCK_TYPE.CODE) {
    return countLines(block.text);
  }
  return 1;
};

export const MessageItem = memo(({ message }: MessageItemProps): ReactNode => {
  const mergedBlocks = useMemo(() => mergeTextBlocks(message.content), [message.content]);

  const toolCallBlocks = useMemo(
    () => mergedBlocks.filter((block) => block.type === CONTENT_BLOCK_TYPE.TOOL_CALL),
    [mergedBlocks]
  );
  const responseBlocks = useMemo(
    () => mergedBlocks.filter((block) => block.type !== CONTENT_BLOCK_TYPE.TOOL_CALL),
    [mergedBlocks]
  );

  const totalResponseLines = useMemo(
    () => responseBlocks.reduce((total, block) => total + countBlockLines(block), 0),
    [responseBlocks]
  );

  const isLongOutput = useMemo(
    () =>
      totalResponseLines > LIMIT.LONG_OUTPUT_LINE_THRESHOLD ||
      responseBlocks.length > LIMIT.LONG_OUTPUT_PREVIEW_BLOCKS * 2,
    [responseBlocks.length, totalResponseLines]
  );

  const { expanded: longOutputExpanded } = useTruncationToggle({
    id: `${message.id}-long-output`,
    label: "Long output",
    isTruncated: isLongOutput,
    defaultExpanded: EXPAND_ALL,
  });

  const {
    previewBlocks: displayedResponseBlocks,
    hiddenLineCount,
    hiddenBlockCount,
  } = useMemo(() => {
    if (!isLongOutput) {
      return { previewBlocks: responseBlocks, hiddenLineCount: 0, hiddenBlockCount: 0 };
    }

    if (longOutputExpanded) {
      return {
        previewBlocks: responseBlocks,
        hiddenLineCount: 0,
        hiddenBlockCount: 0,
      };
    }

    const headCount = Math.min(LIMIT.LONG_OUTPUT_PREVIEW_BLOCKS, responseBlocks.length);
    const tailCount = responseBlocks.length > headCount ? 1 : 0;
    const headBlocks = responseBlocks.slice(0, headCount);
    const tailBlocks = tailCount > 0 ? responseBlocks.slice(-tailCount) : [];
    const previewBlocks = [...headBlocks, ...tailBlocks];

    const previewLineCount = previewBlocks.reduce(
      (total, block) => total + countBlockLines(block),
      0
    );
    return {
      previewBlocks,
      hiddenLineCount: Math.max(0, totalResponseLines - previewLineCount),
      hiddenBlockCount: Math.max(0, responseBlocks.length - previewBlocks.length),
    };
  }, [isLongOutput, longOutputExpanded, responseBlocks, totalResponseLines]);

  const hasIncompleteMarkdown = useMemo(
    () =>
      message.isStreaming &&
      responseBlocks.some((block) => {
        if (block.type === CONTENT_BLOCK_TYPE.TEXT) {
          const text = block.text || "";
          const codeBlockCount = (text.match(/```/g) || []).length;
          return codeBlockCount % 2 !== 0;
        }
        return false;
      }),
    [message.isStreaming, responseBlocks]
  );

  const roleLabel = message.role === MESSAGE_ROLE.ASSISTANT ? "AGENT" : message.role.toUpperCase();
  const roleBar = roleColor(message.role);

  const estimateBlockLines = useCallback((block: ChatContentBlock): number => {
    switch (block.type) {
      case CONTENT_BLOCK_TYPE.TEXT:
      case CONTENT_BLOCK_TYPE.THINKING:
        return countLines(block.text ?? "");
      case CONTENT_BLOCK_TYPE.CODE:
        return Math.min(countLines(block.text ?? ""), LIMIT.MAX_BLOCK_LINES) + 1;
      case CONTENT_BLOCK_TYPE.TOOL_CALL:
        return 2;
      case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
      case CONTENT_BLOCK_TYPE.RESOURCE:
        return 1;
      default:
        return 1;
    }
  }, []);

  const contentLineCount = useMemo(() => {
    const headerLines = 1;
    const toolLines = toolCallBlocks.reduce((sum, block) => sum + estimateBlockLines(block), 0);
    const responseLines = displayedResponseBlocks.reduce(
      (sum, block) => sum + estimateBlockLines(block),
      0
    );
    const extras = (isLongOutput ? 1 : 0) + (hasIncompleteMarkdown ? 1 : 0);
    return headerLines + toolLines + responseLines + extras;
  }, [
    displayedResponseBlocks,
    estimateBlockLines,
    hasIncompleteMarkdown,
    isLongOutput,
    toolCallBlocks,
  ]);

  const bar = useMemo(
    () => Array.from({ length: Math.max(1, contentLineCount) }, () => "│").join("\n"),
    [contentLineCount]
  );

  return (
    <box flexDirection="row" width="100%" gap={1} marginTop={0} marginBottom={0}>
      <box flexShrink={0}>
        <text fg={roleBar}>{bar}</text>
      </box>
      <box flexDirection="column" width="100%" gap={0}>
        <box gap={1} marginBottom={0} justifyContent="space-between" width="100%">
          <box gap={1}>
            <text fg={roleBar} attributes={TextAttributes.BOLD}>
              [{roleLabel}]
            </text>
            {message.isStreaming && (
              <text fg={COLOR.CYAN} attributes={TextAttributes.DIM}>
                ● streaming…
              </text>
            )}
          </box>
          <text fg={COLOR.DIM} attributes={TextAttributes.DIM}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </text>
        </box>

        {toolCallBlocks.length > 0 && (
          <box flexDirection="column" marginBottom={0} gap={0}>
            {toolCallBlocks.map((block, idx) => (
              <box key={`${message.id}-tool-${idx}`} paddingLeft={1}>
                <ContentBlockRenderer
                  block={block}
                  messageId={message.id}
                  index={idx}
                  isStreaming={Boolean(message.isStreaming)}
                />
              </box>
            ))}
          </box>
        )}

        {displayedResponseBlocks.map((block, idx) => (
          <box key={`${message.id}-${block.type}-${idx}`} width="100%">
            <ContentBlockRenderer
              block={block}
              messageId={message.id}
              index={idx}
              isStreaming={Boolean(message.isStreaming)}
            />
          </box>
        ))}

        {isLongOutput ? (
          <box marginTop={0}>
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              {`${longOutputExpanded ? "▶" : "•"} long output ${
                longOutputExpanded ? "(expanded)" : "(collapsed)"
              }${
                hiddenLineCount > 0 || hiddenBlockCount > 0
                  ? ` · ${hiddenLineCount} hidden lines, ${hiddenBlockCount} hidden blocks`
                  : ""
              } · ${TRUNCATION_SHORTCUT_HINT}`}
            </text>
            {!longOutputExpanded && hiddenBlockCount > 0 ? (
              <text
                fg={COLOR.GRAY}
                attributes={TextAttributes.DIM}
              >{`Previewing head/tail (${displayedResponseBlocks.length}/${responseBlocks.length} blocks)`}</text>
            ) : null}
          </box>
        ) : null}

        {hasIncompleteMarkdown && (
          <box
            marginTop={1}
            border={true}
            borderStyle="rounded"
            borderColor={COLOR.YELLOW}
            padding={1}
          >
            <text fg={COLOR.YELLOW}>
              ⚠ Incomplete markdown detected - waiting for complete response…
            </text>
          </box>
        )}
      </box>
    </box>
  );
});

MessageItem.displayName = "MessageItem";

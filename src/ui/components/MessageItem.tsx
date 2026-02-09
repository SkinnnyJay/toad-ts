import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { ContentBlock as ChatContentBlock, Message as ChatMessage } from "@/types/domain";
import { roleColor } from "@/ui/theme";
import { SyntaxStyle, TextAttributes } from "@opentui/core";
import { memo, useCallback, useMemo } from "react";
import stripAnsi from "strip-ansi";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "./TruncationProvider";

interface MessageItemProps {
  message: ChatMessage;
}

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const countLines = (text: string): number => stripAnsi(text ?? "").split(/\r?\n/).length;

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

const countBlockLines = (block: ChatContentBlock): number => {
  if (block.type === CONTENT_BLOCK_TYPE.TEXT || block.type === CONTENT_BLOCK_TYPE.THINKING) {
    return countLines(block.text ?? "");
  }
  if (block.type === CONTENT_BLOCK_TYPE.CODE) {
    return countLines(block.text);
  }
  return 1;
};

type CodeContentBlock = Extract<ChatContentBlock, { type: typeof CONTENT_BLOCK_TYPE.CODE }>;
function CodeBlock({
  block,
  messageId,
  index,
}: {
  block: CodeContentBlock;
  messageId: string;
  index: number;
}): JSX.Element {
  const lang = block.language ?? "";
  const lines = block.text.split(/\r?\n/);
  const truncated = Math.max(0, lines.length - LIMIT.MAX_BLOCK_LINES);
  const { expanded, isActive } = useTruncationToggle({
    id: `${messageId}-code-${index}`,
    label: lang ? `${lang} code` : "Code block",
    isTruncated: truncated > 0,
    defaultExpanded: EXPAND_ALL,
  });

  const visibleContent =
    expanded || truncated === 0 ? block.text : lines.slice(0, LIMIT.MAX_BLOCK_LINES).join("\n");
  const syntaxStyle = useMemo(() => SyntaxStyle.create(), []);

  return (
    <box flexDirection="column" border={true} borderStyle="rounded" borderColor={COLOR.BORDER} padding={1} gap={0}>
      {lang ? (
        <text fg={COLOR.DIM} attributes={TextAttributes.DIM}>
          {lang}
        </text>
      ) : null}
      <code
        content={visibleContent}
        filetype={lang || undefined}
        syntaxStyle={syntaxStyle}
        wrapMode="none"
        conceal={true}
        style={{ width: "100%" }}
      />
      {truncated > 0 ? (
        <text fg={COLOR.DIM} attributes={TextAttributes.DIM}>
          {`${isActive ? "▶" : "•"} … ${truncated} more lines ${
            expanded ? "(expanded)" : "(collapsed)"
          } · ${TRUNCATION_SHORTCUT_HINT}`}
        </text>
      ) : null}
    </box>
  );
}

const ContentBlockRenderer = memo(function ContentBlockRenderer({
  block,
  messageId,
  index,
  isStreaming,
}: {
  block: ChatContentBlock;
  messageId: string;
  index: number;
  isStreaming: boolean;
}): JSX.Element {
  switch (block.type) {
    case CONTENT_BLOCK_TYPE.TEXT:
      return (
        <MarkdownRenderer markdown={block.text ?? ""} streaming={isStreaming} />
      );
    case CONTENT_BLOCK_TYPE.THINKING:
      return (
        <text attributes={TextAttributes.DIM | TextAttributes.ITALIC}>{block.text}</text>
      );
    case CONTENT_BLOCK_TYPE.CODE:
      return <CodeBlock block={block} messageId={messageId} index={index} />;

    case CONTENT_BLOCK_TYPE.TOOL_CALL: {
      const label = block.name ?? "tool";
      const statusColor =
        block.status === TOOL_CALL_STATUS.SUCCEEDED
          ? COLOR.GREEN
          : block.status === TOOL_CALL_STATUS.RUNNING
            ? COLOR.CYAN
            : block.status === TOOL_CALL_STATUS.FAILED
              ? COLOR.RED
              : COLOR.YELLOW;

      const statusText =
        block.status === TOOL_CALL_STATUS.SUCCEEDED
          ? "complete"
          : block.status === TOOL_CALL_STATUS.RUNNING
            ? "in-progress"
            : block.status === TOOL_CALL_STATUS.FAILED
              ? "failed"
              : "pending";

      return (
        <box flexDirection="column" gap={0}>
          <box gap={1}>
            <text fg={statusColor}>[tool-call: {label}]</text>
            <text fg={statusColor} attributes={TextAttributes.DIM}>
              {statusText}
            </text>
          </box>
          {block.arguments && Object.keys(block.arguments).length > 0 && (
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              - {JSON.stringify(block.arguments).substring(0, 50)}…
            </text>
          )}
        </box>
      );
    }
    case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
      return <text>{`${block.name} (${block.uri})`}</text>;
    case CONTENT_BLOCK_TYPE.RESOURCE: {
      const resource = block.resource;
      if ("text" in resource) {
        return <text>{`Resource ${resource.uri}: ${resource.text}`}</text>;
      }
      return <text>{`Resource ${resource.uri}: [binary ${resource.mimeType ?? "data"}]`}</text>;
    }
    default:
      return <text />;
  }
});

export const MessageItem = memo(({ message }: MessageItemProps): JSX.Element => {
  const mergedBlocks = useMemo(() => mergeTextBlocks(message.content), [message.content]);

  // Separate tool calls from other content
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

    const headCount = Math.max(
      1,
      Math.min(LIMIT.LONG_OUTPUT_PREVIEW_BLOCKS, responseBlocks.length)
    );
    const tailCount = Math.min(1, responseBlocks.length - headCount);
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

  // Check if we have incomplete markdown (for streaming messages)
  const hasIncompleteMarkdown = useMemo(
    () =>
      message.isStreaming &&
      responseBlocks.some((block) => {
        if (block.type === CONTENT_BLOCK_TYPE.TEXT) {
          const text = block.text || "";
          // Check for unclosed code blocks or other markdown issues
          const codeBlockCount = (text.match(/```/g) || []).length;
          return codeBlockCount % 2 !== 0;
        }
        return false;
      }),
    [message.isStreaming, responseBlocks]
  );

  const roleLabel = message.role === "assistant" ? "AGENT" : message.role.toUpperCase();
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
    <box flexDirection="row" width="100%" gap={1} marginY={0}>
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
            {formatTime(message.createdAt)}
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
          <box marginTop={1} border={true} borderStyle="rounded" borderColor={COLOR.YELLOW} padding={1}>
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

import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { ContentBlock as ChatContentBlock, Message as ChatMessage } from "@/types/domain";
import { roleColor } from "@/ui/theme";
import { Box, Text } from "ink";
import { memo, useEffect, useMemo, useState } from "react";
import { getHighlighter } from "shiki";
import type { Highlighter } from "shiki";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "./TruncationProvider";

interface MessageItemProps {
  message: ChatMessage;
}

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

import { LIMIT } from "@/config/limits";

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";

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
    return (block.text ?? "").split(/\r?\n/).length;
  }
  if (block.type === CONTENT_BLOCK_TYPE.CODE) {
    return block.text.split(/\r?\n/).length;
  }
  return 1;
};

type CodeContentBlock = Extract<ChatContentBlock, { type: typeof CONTENT_BLOCK_TYPE.CODE }>;
type HighlightToken = { content: string; color?: string };
type HighlightLine = HighlightToken[];

const DEFAULT_CODE_COLOR = COLOR.GREEN;

let highlighterPromise: Promise<Highlighter> | null = null;
const getSharedHighlighter = (): Promise<Highlighter> => {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ["github-dark"],
      langs: ["typescript", "javascript", "tsx", "ts", "js", "json", "bash", "python", "markdown"],
    });
  }
  return highlighterPromise;
};

const hashLineTokens = (line: HighlightLine): string =>
  line.map((token) => `${token.color ?? "plain"}:${token.content}`).join("|");

const useHighlightedCode = (code: string, language?: string): HighlightLine[] | null => {
  const [lines, setLines] = useState<HighlightLine[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSharedHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        try {
          const codeToTokensFn = (highlighter as unknown as { codeToTokens?: unknown })
            .codeToTokens;
          if (typeof codeToTokensFn !== "function") {
            setLines(null);
            return;
          }
          const safeLang = language && language.length > 0 ? language : "text";
          const tokenLines = codeToTokensFn.call(highlighter, code, {
            lang: safeLang as never,
            theme: "github-dark",
          }) as unknown as Array<HighlightLine>;
          setLines(
            tokenLines.map((line) =>
              line.map((token) => ({
                content: token.content,
                color: token.color,
              }))
            )
          );
        } catch {
          setLines(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLines(null);
      });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return lines;
};

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

  const highlighted = useHighlightedCode(block.text, lang);
  const visiblePlainLines =
    expanded || truncated === 0 ? lines : lines.slice(0, LIMIT.MAX_BLOCK_LINES);
  const visibleHighlighted = highlighted
    ? expanded || truncated === 0
      ? highlighted
      : highlighted.slice(0, LIMIT.MAX_BLOCK_LINES)
    : null;
  const linesToRender: HighlightLine[] =
    visibleHighlighted ??
    visiblePlainLines.map((line) => [{ content: line, color: DEFAULT_CODE_COLOR }]);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={COLOR.GRAY} padding={1} gap={0}>
      {lang ? (
        <Text color={COLOR.GRAY} dimColor>
          {lang}
        </Text>
      ) : null}
      {linesToRender.map((lineTokens) => {
        const lineKey = `${messageId}-code-${index}-${hashLineTokens(lineTokens)}`;
        return (
          <Text key={lineKey}>
            {lineTokens.map((token) => {
              const tokenKey = `${lineKey}-${token.color ?? "plain"}-${token.content}`;
              return (
                <Text key={tokenKey} color={token.color ?? DEFAULT_CODE_COLOR}>
                  {token.content === "" ? " " : token.content}
                </Text>
              );
            })}
          </Text>
        );
      })}
      {truncated > 0 ? (
        <Text dimColor color={COLOR.GRAY}>
          {`${isActive ? "▶" : "•"} … ${truncated} more lines ${
            expanded ? "(expanded)" : "(collapsed)"
          } · ${TRUNCATION_SHORTCUT_HINT}`}
        </Text>
      ) : null}
    </Box>
  );
}

const ContentBlockRenderer = memo(function ContentBlockRenderer({
  block,
  messageId,
  index,
}: {
  block: ChatContentBlock;
  messageId: string;
  index: number;
}): JSX.Element {
  switch (block.type) {
    case CONTENT_BLOCK_TYPE.TEXT:
      return (
        <MarkdownRenderer
          markdown={block.text ?? ""}
          collapseAfter={LIMIT.MAX_BLOCK_LINES}
          expandTruncated={EXPAND_ALL}
          blockIdPrefix={`${messageId}-md-${index}`}
          blockLabel="Markdown block"
        />
      );
    case CONTENT_BLOCK_TYPE.THINKING:
      return (
        <Text dimColor italic>
          {block.text}
        </Text>
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
        <Box flexDirection="column" gap={0}>
          <Box gap={1}>
            <Text color={statusColor}>[tool-call: {label}]</Text>
            <Text color={statusColor} dimColor>
              {statusText}
            </Text>
          </Box>
          {block.arguments && Object.keys(block.arguments).length > 0 && (
            <Text dimColor color={COLOR.GRAY}>
              - {JSON.stringify(block.arguments).substring(0, 50)}…
            </Text>
          )}
        </Box>
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

  const displayedResponseBlocks = useMemo(() => {
    if (!isLongOutput || longOutputExpanded) return responseBlocks;
    return responseBlocks.slice(0, LIMIT.LONG_OUTPUT_PREVIEW_BLOCKS);
  }, [isLongOutput, longOutputExpanded, responseBlocks]);

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

  return (
    <Box flexDirection="column" width="100%" gap={0} marginY={1}>
      <Box gap={1} marginBottom={1}>
        <Text bold color={roleColor(message.role)}>
          [{message.role.toUpperCase()}]
        </Text>
        <Text dimColor>{formatTime(message.createdAt)}</Text>
        {message.isStreaming && (
          <Text color={COLOR.CYAN} dimColor>
            {" "}
            (streaming…)
          </Text>
        )}
      </Box>

      {/* Render tool calls first */}
      {toolCallBlocks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {toolCallBlocks.map((block, idx) => (
            <Box key={`${message.id}-tool-${idx}`} paddingLeft={1}>
              <ContentBlockRenderer block={block} messageId={message.id} index={idx} />
            </Box>
          ))}
        </Box>
      )}

      {/* Then render response text and other content */}
      {displayedResponseBlocks.map((block, idx) => (
        <Box key={`${message.id}-${block.type}-${idx}`} width="100%">
          <ContentBlockRenderer block={block} messageId={message.id} index={idx} />
        </Box>
      ))}

      {isLongOutput ? (
        <Box marginTop={1}>
          <Text dimColor color={COLOR.GRAY}>
            {`${longOutputExpanded ? "▶" : "•"} long output ${
              longOutputExpanded ? "(expanded)" : "(collapsed)"
            } · ${TRUNCATION_SHORTCUT_HINT}`}
          </Text>
        </Box>
      ) : null}

      {/* Show error if markdown is incomplete */}
      {hasIncompleteMarkdown && (
        <Box marginTop={1} borderStyle="round" borderColor={COLOR.YELLOW} padding={1}>
          <Text color={COLOR.YELLOW}>
            ⚠ Incomplete markdown detected - waiting for complete response…
          </Text>
        </Box>
      )}
    </Box>
  );
});

MessageItem.displayName = "MessageItem";

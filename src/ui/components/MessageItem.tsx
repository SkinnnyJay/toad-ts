import { COLOR } from "@/constants/colors";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import type { ContentBlock as ChatContentBlock, Message as ChatMessage } from "@/types/domain";
import { roleColor } from "@/ui/theme";
import { Box, Text } from "ink";
import { memo, useEffect, useState } from "react";
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

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";
const MAX_BLOCK_LINES = 200;

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
  const truncated = Math.max(0, lines.length - MAX_BLOCK_LINES);
  const { expanded, isActive } = useTruncationToggle({
    id: `${messageId}-code-${index}`,
    label: lang ? `${lang} code` : "Code block",
    isTruncated: truncated > 0,
    defaultExpanded: EXPAND_ALL,
  });

  const highlighted = useHighlightedCode(block.text, lang);
  const visiblePlainLines = expanded || truncated === 0 ? lines : lines.slice(0, MAX_BLOCK_LINES);
  const visibleHighlighted = highlighted
    ? expanded || truncated === 0
      ? highlighted
      : highlighted.slice(0, MAX_BLOCK_LINES)
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

function ContentBlockRenderer({
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
          collapseAfter={MAX_BLOCK_LINES}
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

export const MessageItem = memo(({ message }: MessageItemProps): JSX.Element => {
  const mergedBlocks = mergeTextBlocks(message.content);
  return (
    <Box flexDirection="column" width="100%" gap={0} marginY={1}>
      <Box gap={1} marginBottom={1}>
        <Text bold color={roleColor(message.role)}>
          [{message.role.toUpperCase()}]
        </Text>
        <Text dimColor>{formatTime(message.createdAt)}</Text>
      </Box>
      {mergedBlocks.map((block, idx) => (
        <Box key={`${message.id}-${block.type}-${idx}`} width="100%">
          <ContentBlockRenderer block={block} messageId={message.id} index={idx} />
        </Box>
      ))}
    </Box>
  );
});

MessageItem.displayName = "MessageItem";

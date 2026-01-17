import { COLOR } from "@/constants/colors";
import { Box, Text } from "ink";
import type { MarkedOptions, Renderer } from "marked";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import { useEffect, useMemo, useRef, useState } from "react";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "./TruncationProvider";

interface MarkdownRendererProps {
  markdown: string;
  /** Collapse after this many lines; show truncated notice. */
  collapseAfter?: number;
  /** When true, start expanded (can still collapse). */
  expandTruncated?: boolean;
  /** Prefix used to build stable IDs for blocks. */
  blockIdPrefix?: string;
  /** Label used in truncation hints. */
  blockLabel?: string;
}

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";
const DEFAULT_COLLAPSE_AFTER = 120;
const STREAM_BUFFER_MS = 10;
const RENDER_CACHE_LIMIT = 200;

interface ParsedBlock {
  id: string;
  lines: string[];
  truncatedCount: number;
}

const splitBlocks = (markdown: string): string[] => {
  const normalized = markdown.replace(/\s+$/, "");
  if (!normalized) return [];
  return normalized.split(/\n{2,}/);
};

const createRenderer = (): Renderer =>
  new TerminalRenderer({ reflowText: true }) as unknown as Renderer;

const renderBlock = (block: string, renderer: Renderer, cache: Map<string, string>): string => {
  const cached = cache.get(block);
  if (cached) return cached;
  try {
    const rendered = marked.parse(block, { renderer } as unknown as MarkedOptions);
    const finalText = typeof rendered === "string" ? rendered : block;
    cache.set(block, finalText);
    if (cache.size > RENDER_CACHE_LIMIT) {
      const firstKey = cache.keys().next().value as string | undefined;
      if (firstKey) cache.delete(firstKey);
    }
    return finalText;
  } catch {
    return block;
  }
};

const useBufferedMarkdown = (markdown: string, bufferMs: number): string => {
  const [buffered, setBuffered] = useState(markdown);
  useEffect(() => {
    const handle = setTimeout(() => setBuffered(markdown), bufferMs);
    return () => clearTimeout(handle);
  }, [markdown, bufferMs]);
  return buffered;
};

function MarkdownBlock({
  block,
  collapseAfter,
  expandTruncated,
  blockLabel,
}: {
  block: ParsedBlock;
  collapseAfter: number;
  expandTruncated: boolean;
  blockLabel: string;
}): JSX.Element {
  const { expanded, isActive } = useTruncationToggle({
    id: block.id,
    label: blockLabel,
    isTruncated: block.truncatedCount > 0,
    defaultExpanded: expandTruncated,
  });
  const visibleLines =
    expanded || block.truncatedCount === 0 ? block.lines : block.lines.slice(0, collapseAfter);

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {visibleLines.map((line, idx) => (
        <Text key={`${block.id}-${idx}`}>{line}</Text>
      ))}
      {block.truncatedCount > 0 ? (
        <Text dimColor color={COLOR.GRAY}>
          {`${isActive ? "▶" : "•"} … ${block.truncatedCount} more lines ${
            expanded ? "(expanded)" : "(collapsed)"
          } · ${TRUNCATION_SHORTCUT_HINT}`}
        </Text>
      ) : null}
    </Box>
  );
}

export function MarkdownRenderer({
  markdown,
  collapseAfter = DEFAULT_COLLAPSE_AFTER,
  expandTruncated = EXPAND_ALL,
  blockIdPrefix = "markdown",
  blockLabel = "Markdown block",
}: MarkdownRendererProps): JSX.Element {
  const renderer = useMemo(() => createRenderer(), []);
  const renderCacheRef = useRef<Map<string, string>>(new Map());
  const bufferedMarkdown = useBufferedMarkdown(markdown ?? "", STREAM_BUFFER_MS);

  const blocks: ParsedBlock[] = useMemo(() => {
    const rawBlocks = splitBlocks(bufferedMarkdown);
    return rawBlocks.map((block, index) => {
      const rendered = renderBlock(block, renderer, renderCacheRef.current);
      const lines = rendered.split("\n");
      const truncated = Math.max(0, lines.length - collapseAfter);
      return {
        id: `${blockIdPrefix}-${index}`,
        lines,
        truncatedCount: truncated,
      };
    });
  }, [blockIdPrefix, bufferedMarkdown, collapseAfter, renderer]);

  return (
    <Box flexDirection="column" gap={0}>
      {blocks.map((block) => (
        <MarkdownBlock
          key={block.id}
          block={block}
          collapseAfter={collapseAfter}
          expandTruncated={expandTruncated}
          blockLabel={blockLabel}
        />
      ))}
    </Box>
  );
}

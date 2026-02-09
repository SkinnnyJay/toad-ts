import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { Box, Text } from "ink";
import type { MarkedOptions, Renderer } from "marked";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Highlighter } from "shiki";
import { getHighlighter } from "shiki";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "./TruncationProvider";

marked.setOptions({ gfm: true, breaks: true });

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
  /** Optional text color for rendered lines. */
  color?: string;
  /** Apply dim styling to rendered lines. */
  dimColor?: boolean;
}

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";
const DEFAULT_COLLAPSE_AFTER = 120;
const STREAM_BUFFER_MS = 10;

interface ParsedBlock {
  id: string;
  lines: string[];
  truncatedCount: number;
  raw: string;
  collapseAfter: number;
}

let highlighter: Highlighter | null = null;
void getHighlighter({
  themes: ["github-dark"],
  langs: ["typescript", "javascript", "tsx", "ts", "js", "json", "bash", "python", "markdown"],
}).then((instance) => {
  highlighter = instance;
});

const highlightCode = (code: string, lang?: string): string => {
  const safeLang = lang && lang.trim().length > 0 ? lang.trim() : "text";
  if (
    highlighter &&
    typeof (highlighter as unknown as { codeToAnsi?: unknown }).codeToAnsi === "function"
  ) {
    return (
      highlighter as unknown as {
        codeToAnsi: (code: string, options: { lang: string; theme: string }) => string;
      }
    ).codeToAnsi(code, {
      lang: safeLang,
      theme: "github-dark",
    });
  }
  return code;
};

const createRenderer = (): Renderer =>
  new TerminalRenderer({
    reflowText: true,
    code: ((code: string, info?: string) => highlightCode(code, info)) as unknown as (
      code: string
    ) => string,
  }) as unknown as Renderer;

const splitBlocks = (markdown: string): string[] => {
  const normalized = markdown.replace(/\s+$/, "");
  if (!normalized) return [];

  const blocks: string[] = [];
  const lines = normalized.split("\n");
  let current: string[] = [];
  let fenceOpen = false;

  const flushCurrent = () => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      fenceOpen = !fenceOpen;
    }

    if (!fenceOpen && trimmed === "" && current.length > 0) {
      flushCurrent();
      continue;
    }

    current.push(line);
  }

  flushCurrent();
  return blocks;
};

const hashBlock = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
};

const renderBlock = (block: string, renderer: Renderer, cache: Map<string, string>): string => {
  const cached = cache.get(block);
  if (cached) return cached;
  try {
    const rendered = marked.parse(block, { renderer } as unknown as MarkedOptions);
    const finalText = typeof rendered === "string" ? rendered : block;
    cache.set(block, finalText);
    if (cache.size > LIMIT.RENDER_CACHE_LIMIT) {
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

const buildParsedBlock = (
  rawBlock: string,
  index: number,
  renderer: Renderer,
  cache: Map<string, string>,
  collapseAfter: number,
  blockIdPrefix: string
): ParsedBlock => {
  const rendered = renderBlock(rawBlock, renderer, cache);
  const lines = rendered.split("\n");
  const truncated = Math.max(0, lines.length - collapseAfter);
  return {
    id: `${blockIdPrefix}-${hashBlock(rawBlock)}-${index}`,
    lines,
    truncatedCount: truncated,
    raw: rawBlock,
    collapseAfter,
  };
};

const useStreamingBlocks = (
  markdown: string,
  renderer: Renderer,
  collapseAfter: number,
  blockIdPrefix: string
): ParsedBlock[] => {
  const renderCacheRef = useRef<Map<string, string>>(new Map());
  const previousBlocksRef = useRef<ParsedBlock[]>([]);

  return useMemo(() => {
    const rawBlocks = splitBlocks(markdown);
    const nextBlocks = rawBlocks.map((raw, index) => {
      const previous = previousBlocksRef.current[index];
      if (previous && previous.raw === raw && previous.collapseAfter === collapseAfter) {
        return previous;
      }
      return buildParsedBlock(
        raw,
        index,
        renderer,
        renderCacheRef.current,
        collapseAfter,
        blockIdPrefix
      );
    });
    previousBlocksRef.current = nextBlocks;
    return nextBlocks;
  }, [blockIdPrefix, collapseAfter, markdown, renderer]);
};

const MarkdownBlock = memo(function MarkdownBlock({
  block,
  collapseAfter,
  expandTruncated,
  blockLabel,
  color,
  dimColor,
}: {
  block: ParsedBlock;
  collapseAfter: number;
  expandTruncated: boolean;
  blockLabel: string;
  color?: string;
  dimColor?: boolean;
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
    <Box flexDirection="column" paddingBottom={0}>
      {visibleLines.map((line, idx) => (
        <Text key={`${block.id}-${idx}`} color={color} dimColor={dimColor}>
          {line}
        </Text>
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
}, areBlocksEqual);

function areBlocksEqual(
  prev: {
    block: ParsedBlock;
    collapseAfter: number;
    expandTruncated: boolean;
    blockLabel: string;
    color?: string;
    dimColor?: boolean;
  },
  next: {
    block: ParsedBlock;
    collapseAfter: number;
    expandTruncated: boolean;
    blockLabel: string;
    color?: string;
    dimColor?: boolean;
  }
): boolean {
  return (
    prev.block === next.block &&
    prev.collapseAfter === next.collapseAfter &&
    prev.expandTruncated === next.expandTruncated &&
    prev.blockLabel === next.blockLabel &&
    prev.color === next.color &&
    prev.dimColor === next.dimColor
  );
}

export function MarkdownRenderer({
  markdown,
  collapseAfter = DEFAULT_COLLAPSE_AFTER,
  expandTruncated = EXPAND_ALL,
  blockIdPrefix = "markdown",
  blockLabel = "Markdown block",
  color,
  dimColor,
}: MarkdownRendererProps): JSX.Element {
  const renderer = useMemo(() => createRenderer(), []);
  const bufferedMarkdown = useBufferedMarkdown(markdown ?? "", STREAM_BUFFER_MS);
  const blocks = useStreamingBlocks(bufferedMarkdown, renderer, collapseAfter, blockIdPrefix);

  return (
    <Box flexDirection="column" gap={0}>
      {blocks.map((block) => (
        <MarkdownBlock
          key={block.id}
          block={block}
          collapseAfter={collapseAfter}
          expandTruncated={expandTruncated}
          blockLabel={blockLabel}
          color={color}
          dimColor={dimColor}
        />
      ))}
    </Box>
  );
}

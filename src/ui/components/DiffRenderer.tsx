import { LIMIT } from "@/config/limits";
import { DIFF_LINE_TYPE, DIFF_VIEW_MODE } from "@/constants/diff-types";
import type { DiffHunk, DiffLine, FileDiff } from "@/types/diff.types";
import { diffColors } from "@/ui/theme";
import {
  computeDiff,
  formatHunkHeader,
  formatLineNumbers,
  getLinePrefix,
} from "@/utils/diff/diffParser";
import { Box, Text } from "ink";
import { memo, useEffect, useMemo, useState } from "react";
import { getHighlighter } from "shiki";
import type { Highlighter } from "shiki";
import { TRUNCATION_SHORTCUT_HINT, useTruncationToggle } from "./TruncationProvider";

const EXPAND_ALL = process.env.TOADSTOOL_EXPAND_ALL === "1";

interface DiffRendererProps {
  /** Content before the change */
  oldContent: string;
  /** Content after the change */
  newContent: string;
  /** Filename for display and language detection */
  filename: string;
  /** Optional language override for syntax highlighting */
  language?: string;
  /** View mode: unified (default) or side-by-side */
  viewMode?: typeof DIFF_VIEW_MODE.UNIFIED | typeof DIFF_VIEW_MODE.SIDE_BY_SIDE;
  /** Number of context lines to show around changes (default: 3) */
  contextLines?: number;
  /** Maximum lines before truncation */
  maxLines?: number;
  /** Unique ID for truncation state */
  id?: string;
}

type HighlightToken = { content: string; color?: string };
type HighlightLine = HighlightToken[];

let highlighterPromise: Promise<Highlighter> | null = null;
const getSharedHighlighter = (): Promise<Highlighter> => {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ["github-dark"],
      langs: [
        "typescript",
        "javascript",
        "tsx",
        "ts",
        "js",
        "json",
        "bash",
        "python",
        "markdown",
        "css",
        "html",
        "yaml",
        "go",
        "rust",
        "java",
        "c",
        "cpp",
      ],
    });
  }
  return highlighterPromise;
};

/**
 * Hook to get syntax-highlighted tokens for a line of code
 */
const useHighlightedLine = (content: string, language?: string): HighlightLine | null => {
  const [tokens, setTokens] = useState<HighlightLine | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSharedHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        try {
          const codeToTokensFn = (highlighter as unknown as { codeToTokens?: unknown })
            .codeToTokens;
          if (typeof codeToTokensFn !== "function") {
            setTokens(null);
            return;
          }
          const safeLang = language && language.length > 0 ? language : "text";
          const result = codeToTokensFn.call(highlighter, content, {
            lang: safeLang as never,
            theme: "github-dark",
          }) as unknown as Array<HighlightLine>;

          // Get first line's tokens (we're highlighting single lines)
          const firstLine = result?.[0];
          if (firstLine && firstLine.length > 0) {
            setTokens(
              firstLine.map((token) => ({
                content: token.content,
                color: token.color,
              }))
            );
          } else {
            setTokens([{ content, color: undefined }]);
          }
        } catch {
          setTokens(null);
        }
      })
      .catch(() => {
        if (!cancelled) setTokens(null);
      });

    return () => {
      cancelled = true;
    };
  }, [content, language]);

  return tokens;
};

/**
 * Renders a single diff line with syntax highlighting
 */
const DiffLineRenderer = memo(function DiffLineRenderer({
  line,
  language,
  maxOldLineNum,
  maxNewLineNum,
  showLineNumbers = true,
}: {
  line: DiffLine;
  language?: string;
  maxOldLineNum: number;
  maxNewLineNum: number;
  showLineNumbers?: boolean;
}): JSX.Element {
  const tokens = useHighlightedLine(line.content, language);
  const [oldLineStr, newLineStr] = formatLineNumbers(line, maxOldLineNum, maxNewLineNum);
  const prefix = getLinePrefix(line.type);

  // Determine colors based on line type
  const lineColor =
    line.type === DIFF_LINE_TYPE.ADDED
      ? diffColors.added
      : line.type === DIFF_LINE_TYPE.REMOVED
        ? diffColors.removed
        : diffColors.context;

  const bgColor =
    line.type === DIFF_LINE_TYPE.ADDED
      ? diffColors.addedBg
      : line.type === DIFF_LINE_TYPE.REMOVED
        ? diffColors.removedBg
        : diffColors.contextBg;

  return (
    <Box>
      {showLineNumbers && (
        <Text color={diffColors.lineNumber} dimColor>
          {oldLineStr} {newLineStr} │
        </Text>
      )}
      <Text color={lineColor} backgroundColor={bgColor}>
        {prefix}
      </Text>
      {tokens ? (
        tokens.map((token, idx) => (
          <Text
            key={`${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}-${idx}`}
            color={token.color}
            backgroundColor={bgColor}
          >
            {token.content}
          </Text>
        ))
      ) : (
        <Text color={lineColor} backgroundColor={bgColor}>
          {line.content}
        </Text>
      )}
    </Box>
  );
});

/**
 * Renders a hunk header (@@ -1,3 +1,4 @@)
 */
const HunkHeader = memo(function HunkHeader({ hunk }: { hunk: DiffHunk }): JSX.Element {
  const header = formatHunkHeader(hunk);
  return (
    <Box>
      <Text color={diffColors.hunkHeader} backgroundColor={diffColors.hunkHeaderBg}>
        {header}
      </Text>
    </Box>
  );
});

/**
 * Renders a unified diff view
 */
const UnifiedDiffView = memo(function UnifiedDiffView({
  diff,
  maxLines,
  id,
}: {
  diff: FileDiff;
  maxLines?: number;
  id: string;
}): JSX.Element {
  // Calculate total lines across all hunks
  const totalLines = diff.hunks.reduce((sum, hunk) => sum + hunk.lines.length + 1, 0);
  const effectiveMaxLines = maxLines ?? LIMIT.DIFF_MAX_LINES;
  const isTruncated = totalLines > effectiveMaxLines;

  const { expanded, isActive } = useTruncationToggle({
    id: `${id}-unified`,
    label: "Diff",
    isTruncated,
    defaultExpanded: EXPAND_ALL,
  });

  // Find max line numbers for formatting
  const maxOldLineNum = Math.max(
    ...diff.hunks.flatMap((h) => h.lines.map((l) => l.oldLineNumber ?? 0)),
    1
  );
  const maxNewLineNum = Math.max(
    ...diff.hunks.flatMap((h) => h.lines.map((l) => l.newLineNumber ?? 0)),
    1
  );

  // Collect lines to render
  let linesToRender: Array<
    { type: "hunk"; hunk: DiffHunk } | { type: "line"; line: DiffLine; hunkIdx: number }
  > = [];
  for (let hunkIdx = 0; hunkIdx < diff.hunks.length; hunkIdx++) {
    const hunk = diff.hunks[hunkIdx];
    if (!hunk) continue;
    linesToRender.push({ type: "hunk", hunk });
    for (const line of hunk.lines) {
      linesToRender.push({ type: "line", line, hunkIdx });
    }
  }

  // Apply truncation if needed
  if (isTruncated && !expanded) {
    linesToRender = linesToRender.slice(0, effectiveMaxLines);
  }

  const hiddenLines = isTruncated && !expanded ? totalLines - effectiveMaxLines : 0;

  return (
    <Box flexDirection="column" gap={0}>
      {linesToRender.map((item) => {
        if (item.type === "hunk") {
          // Use hunk start positions as stable key
          return (
            <HunkHeader key={`hunk-${item.hunk.oldStart}-${item.hunk.newStart}`} hunk={item.hunk} />
          );
        }
        return (
          <DiffLineRenderer
            key={`line-${item.hunkIdx}-${item.line.oldLineNumber ?? "a"}-${item.line.newLineNumber ?? "r"}-${item.line.type}`}
            line={item.line}
            language={diff.language}
            maxOldLineNum={maxOldLineNum}
            maxNewLineNum={maxNewLineNum}
          />
        );
      })}
      {isTruncated && (
        <Text dimColor color={diffColors.context}>
          {`${isActive ? "▶" : "•"} ${hiddenLines > 0 ? `${hiddenLines} more lines ` : ""}(${expanded ? "expanded" : "collapsed"}) · ${TRUNCATION_SHORTCUT_HINT}`}
        </Text>
      )}
    </Box>
  );
});

/**
 * Renders a side-by-side diff view
 */
const SideBySideDiffView = memo(function SideBySideDiffView({
  diff,
  maxLines,
  id,
}: {
  diff: FileDiff;
  maxLines?: number;
  id: string;
}): JSX.Element {
  // Build aligned pairs for side-by-side view
  const pairs: Array<{
    oldLine: DiffLine | null;
    newLine: DiffLine | null;
  }> = [];

  for (const hunk of diff.hunks) {
    const oldLines: DiffLine[] = [];
    const newLines: DiffLine[] = [];

    for (const line of hunk.lines) {
      if (line.type === DIFF_LINE_TYPE.REMOVED) {
        oldLines.push(line);
      } else if (line.type === DIFF_LINE_TYPE.ADDED) {
        newLines.push(line);
      } else {
        // Unchanged - flush any pending changes first
        while (oldLines.length > 0 || newLines.length > 0) {
          pairs.push({
            oldLine: oldLines.shift() ?? null,
            newLine: newLines.shift() ?? null,
          });
        }
        // Add the unchanged line to both sides
        pairs.push({ oldLine: line, newLine: line });
      }
    }

    // Flush remaining changes
    while (oldLines.length > 0 || newLines.length > 0) {
      pairs.push({
        oldLine: oldLines.shift() ?? null,
        newLine: newLines.shift() ?? null,
      });
    }
  }

  const effectiveMaxLines = maxLines ?? LIMIT.DIFF_MAX_LINES;
  const isTruncated = pairs.length > effectiveMaxLines;

  const { expanded, isActive } = useTruncationToggle({
    id: `${id}-sidebyside`,
    label: "Diff",
    isTruncated,
    defaultExpanded: EXPAND_ALL,
  });

  const visiblePairs = isTruncated && !expanded ? pairs.slice(0, effectiveMaxLines) : pairs;
  const hiddenLines = isTruncated && !expanded ? pairs.length - effectiveMaxLines : 0;

  // Find max line numbers
  const maxOldLineNum = Math.max(...pairs.map((p) => p.oldLine?.oldLineNumber ?? 0), 1);
  const maxNewLineNum = Math.max(...pairs.map((p) => p.newLine?.newLineNumber ?? 0), 1);

  return (
    <Box flexDirection="column" gap={0}>
      {/* Header row */}
      <Box>
        <Box width="50%">
          <Text bold color={diffColors.header}>
            OLD
          </Text>
        </Box>
        <Text color={diffColors.border}>│</Text>
        <Box width="50%">
          <Text bold color={diffColors.header}>
            NEW
          </Text>
        </Box>
      </Box>

      {/* Content rows */}
      {visiblePairs.map((pair) => {
        // Create stable key from line numbers and types
        const oldKey = pair.oldLine
          ? `${pair.oldLine.oldLineNumber ?? "x"}-${pair.oldLine.type}`
          : "empty";
        const newKey = pair.newLine
          ? `${pair.newLine.newLineNumber ?? "x"}-${pair.newLine.type}`
          : "empty";
        return (
          <Box key={`pair-${oldKey}-${newKey}`}>
            <Box width="50%">
              {pair.oldLine ? (
                <DiffLineRenderer
                  line={pair.oldLine}
                  language={diff.language}
                  maxOldLineNum={maxOldLineNum}
                  maxNewLineNum={maxNewLineNum}
                  showLineNumbers={false}
                />
              ) : (
                <Text color={diffColors.context}> </Text>
              )}
            </Box>
            <Text color={diffColors.border}>│</Text>
            <Box width="50%">
              {pair.newLine ? (
                <DiffLineRenderer
                  line={pair.newLine}
                  language={diff.language}
                  maxOldLineNum={maxOldLineNum}
                  maxNewLineNum={maxNewLineNum}
                  showLineNumbers={false}
                />
              ) : (
                <Text color={diffColors.context}> </Text>
              )}
            </Box>
          </Box>
        );
      })}

      {isTruncated && (
        <Text dimColor color={diffColors.context}>
          {`${isActive ? "▶" : "•"} ${hiddenLines > 0 ? `${hiddenLines} more lines ` : ""}(${expanded ? "expanded" : "collapsed"}) · ${TRUNCATION_SHORTCUT_HINT}`}
        </Text>
      )}
    </Box>
  );
});

/**
 * Main DiffRenderer component
 * Displays file changes with syntax highlighting and git-diff-style formatting
 */
export const DiffRenderer = memo(function DiffRenderer({
  oldContent,
  newContent,
  filename,
  language,
  viewMode = DIFF_VIEW_MODE.UNIFIED,
  contextLines = LIMIT.DIFF_CONTEXT_LINES,
  maxLines,
  id,
}: DiffRendererProps): JSX.Element {
  // Compute the diff
  const diff = useMemo(
    () => computeDiff(oldContent, newContent, filename, contextLines),
    [oldContent, newContent, filename, contextLines]
  );

  // Override language if provided
  const effectiveDiff = useMemo(() => (language ? { ...diff, language } : diff), [diff, language]);

  // Generate unique ID for truncation
  const truncationId = id ?? `diff-${filename}`;

  // Check if there are no changes
  if (diff.hunks.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={diffColors.border} paddingX={1}>
        <Text color={diffColors.header}>{filename}</Text>
        <Text color={diffColors.context} dimColor>
          No changes
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={diffColors.border} paddingX={1}>
      {/* File header */}
      <Box gap={1}>
        <Text bold color={diffColors.header}>
          {filename}
        </Text>
        <Text color={diff.additions > 0 ? diffColors.added : diffColors.context}>
          +{diff.additions}
        </Text>
        <Text color={diff.deletions > 0 ? diffColors.removed : diffColors.context}>
          -{diff.deletions}
        </Text>
        {diff.isNewFile && (
          <Text color={diffColors.added} dimColor>
            (new file)
          </Text>
        )}
        {diff.isDeleted && (
          <Text color={diffColors.removed} dimColor>
            (deleted)
          </Text>
        )}
      </Box>

      {/* Diff content */}
      {viewMode === DIFF_VIEW_MODE.SIDE_BY_SIDE ? (
        <SideBySideDiffView diff={effectiveDiff} maxLines={maxLines} id={truncationId} />
      ) : (
        <UnifiedDiffView diff={effectiveDiff} maxLines={maxLines} id={truncationId} />
      )}
    </Box>
  );
});

DiffRenderer.displayName = "DiffRenderer";

export default DiffRenderer;

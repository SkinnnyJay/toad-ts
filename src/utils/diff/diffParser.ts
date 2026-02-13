import { LIMIT } from "@/config/limits";
import { DIFF_LINE_TYPE } from "@/constants/diff-types";
import type { DiffHunk, DiffLine, DiffStats, FileDiff } from "@/types/diff.types";
import { type Change, diffLines } from "diff";

/**
 * Default number of context lines to show around changes
 */
const DEFAULT_CONTEXT_LINES = LIMIT.DIFF_CONTEXT_LINES;

/**
 * Detects the programming language from a filename extension
 */
export function detectLanguage(filename: string): string | undefined {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;

  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    md: "markdown",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    css: "css",
    scss: "scss",
    html: "html",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
  };

  return languageMap[ext];
}

/**
 * Converts diff changes to structured DiffLine array
 */
export function parseDiffLines(changes: Change[]): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const change of changes) {
    const changeLines = change.value.split("\n");
    // Remove trailing empty string from split if the value ends with newline
    if (changeLines[changeLines.length - 1] === "") {
      changeLines.pop();
    }

    for (const content of changeLines) {
      if (change.added) {
        lines.push({
          type: DIFF_LINE_TYPE.ADDED,
          content,
          newLineNumber: newLineNum++,
        });
      } else if (change.removed) {
        lines.push({
          type: DIFF_LINE_TYPE.REMOVED,
          content,
          oldLineNumber: oldLineNum++,
        });
      } else {
        lines.push({
          type: DIFF_LINE_TYPE.UNCHANGED,
          content,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
      }
    }
  }

  return lines;
}

/**
 * Groups diff lines into hunks with context
 */
export function groupIntoHunks(
  lines: DiffLine[],
  contextLines: number = DEFAULT_CONTEXT_LINES
): DiffHunk[] {
  if (lines.length === 0) return [];

  const hunks: DiffHunk[] = [];
  let currentHunk: DiffLine[] = [];
  let hunkOldStart = 1;
  let hunkNewStart = 1;
  let unchangedAfterChange = 0;

  // Find indices of all changed lines
  const changeIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.type !== DIFF_LINE_TYPE.UNCHANGED) {
      changeIndices.push(i);
    }
  }

  if (changeIndices.length === 0) {
    // No changes, return empty
    return [];
  }

  // Process lines and group into hunks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const isChange = line.type !== DIFF_LINE_TYPE.UNCHANGED;

    // Check if this line is within context of any change
    const nearChange = changeIndices.some((changeIdx) => Math.abs(i - changeIdx) <= contextLines);

    if (nearChange) {
      if (currentHunk.length === 0) {
        // Starting a new hunk
        hunkOldStart = line.oldLineNumber ?? hunkOldStart;
        hunkNewStart = line.newLineNumber ?? hunkNewStart;
      }
      currentHunk.push(line);

      if (isChange) {
        unchangedAfterChange = 0;
      } else {
        unchangedAfterChange++;
      }
    } else if (currentHunk.length > 0) {
      // We've moved past the context of the current hunk
      // Check if we should close this hunk
      const nextChangeIdx = changeIndices.find((idx) => idx > i);
      const distanceToNextChange =
        nextChangeIdx !== undefined ? nextChangeIdx - i : Number.POSITIVE_INFINITY;

      if (distanceToNextChange > contextLines * LIMIT.RETRY_EXPONENTIAL_BASE) {
        // Close current hunk
        const hunk = createHunk(currentHunk, hunkOldStart, hunkNewStart);
        hunks.push(hunk);
        currentHunk = [];
        unchangedAfterChange = 0;
      } else {
        // Continue building the hunk (gap is small enough)
        currentHunk.push(line);
      }
    }
  }

  // Don't forget the last hunk
  if (currentHunk.length > 0) {
    const hunk = createHunk(currentHunk, hunkOldStart, hunkNewStart);
    hunks.push(hunk);
  }

  return hunks;
}

/**
 * Creates a DiffHunk from lines
 */
function createHunk(lines: DiffLine[], oldStart: number, newStart: number): DiffHunk {
  let oldCount = 0;
  let newCount = 0;

  for (const line of lines) {
    if (line.type === DIFF_LINE_TYPE.REMOVED) {
      oldCount++;
    } else if (line.type === DIFF_LINE_TYPE.ADDED) {
      newCount++;
    } else {
      oldCount++;
      newCount++;
    }
  }

  return {
    oldStart,
    oldCount,
    newStart,
    newCount,
    lines,
  };
}

/**
 * Computes diff statistics
 */
export function computeStats(lines: DiffLine[]): DiffStats {
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.type === DIFF_LINE_TYPE.ADDED) {
      additions++;
    } else if (line.type === DIFF_LINE_TYPE.REMOVED) {
      deletions++;
    }
  }

  return {
    additions,
    deletions,
    totalChanges: additions + deletions,
  };
}

/**
 * Main function to compute a diff between two strings
 */
export function computeDiff(
  oldContent: string,
  newContent: string,
  filename: string,
  contextLines: number = DEFAULT_CONTEXT_LINES
): FileDiff {
  // Handle edge cases
  const isNewFile = oldContent === "";
  const isDeleted = newContent === "";

  // Compute the diff
  const changes = diffLines(oldContent, newContent);
  const lines = parseDiffLines(changes);
  const stats = computeStats(lines);
  const hunks = groupIntoHunks(lines, contextLines);

  return {
    filename,
    language: detectLanguage(filename),
    additions: stats.additions,
    deletions: stats.deletions,
    hunks,
    isBinary: false,
    isNewFile,
    isDeleted,
  };
}

/**
 * Formats a hunk header in git diff style
 */
export function formatHunkHeader(hunk: DiffHunk): string {
  return `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
}

/**
 * Gets the line prefix for a diff line type
 */
export function getLinePrefix(type: DiffLine["type"]): string {
  switch (type) {
    case DIFF_LINE_TYPE.ADDED:
      return "+";
    case DIFF_LINE_TYPE.REMOVED:
      return "-";
    case DIFF_LINE_TYPE.UNCHANGED:
      return " ";
    case DIFF_LINE_TYPE.HEADER:
      return "";
    default:
      return " ";
  }
}

/**
 * Formats line numbers for display
 * Returns [oldLineStr, newLineStr] with proper padding
 */
export function formatLineNumbers(
  line: DiffLine,
  maxOldLineNum: number,
  maxNewLineNum: number
): [string, string] {
  const oldWidth = String(maxOldLineNum).length;
  const newWidth = String(maxNewLineNum).length;

  const oldStr =
    line.oldLineNumber !== undefined
      ? String(line.oldLineNumber).padStart(oldWidth)
      : " ".repeat(oldWidth);

  const newStr =
    line.newLineNumber !== undefined
      ? String(line.newLineNumber).padStart(newWidth)
      : " ".repeat(newWidth);

  return [oldStr, newStr];
}

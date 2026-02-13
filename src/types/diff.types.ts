import { LIMIT } from "@/config/limits";
import { DIFF_LINE_TYPE, DIFF_VIEW_MODE } from "@/constants/diff-types";
import { z } from "zod";

/**
 * Schema for a single diff line
 */
export const DiffLineSchema = z.object({
  /** The type of change for this line */
  type: z.enum([
    DIFF_LINE_TYPE.ADDED,
    DIFF_LINE_TYPE.REMOVED,
    DIFF_LINE_TYPE.UNCHANGED,
    DIFF_LINE_TYPE.HEADER,
  ]),
  /** The content of the line */
  content: z.string(),
  /** Line number in the old file (undefined for added lines) */
  oldLineNumber: z.number().optional(),
  /** Line number in the new file (undefined for removed lines) */
  newLineNumber: z.number().optional(),
});

export type DiffLine = z.infer<typeof DiffLineSchema>;

/**
 * Schema for a diff hunk (group of changes with context)
 */
export const DiffHunkSchema = z.object({
  /** Starting line number in old file */
  oldStart: z.number(),
  /** Number of lines from old file in this hunk */
  oldCount: z.number(),
  /** Starting line number in new file */
  newStart: z.number(),
  /** Number of lines from new file in this hunk */
  newCount: z.number(),
  /** Lines in this hunk */
  lines: z.array(DiffLineSchema),
});

export type DiffHunk = z.infer<typeof DiffHunkSchema>;

/**
 * Schema for a complete file diff
 */
export const FileDiffSchema = z.object({
  /** The filename being diffed */
  filename: z.string(),
  /** Optional language for syntax highlighting */
  language: z.string().optional(),
  /** Number of lines added */
  additions: z.number(),
  /** Number of lines removed */
  deletions: z.number(),
  /** The diff hunks */
  hunks: z.array(DiffHunkSchema),
  /** Whether the file is binary */
  isBinary: z.boolean().default(false),
  /** Whether this is a new file */
  isNewFile: z.boolean().default(false),
  /** Whether this file was deleted */
  isDeleted: z.boolean().default(false),
});

export type FileDiff = z.infer<typeof FileDiffSchema>;

/**
 * Schema for diff renderer props
 */
export const DiffRendererPropsSchema = z.object({
  /** Content before the change */
  oldContent: z.string(),
  /** Content after the change */
  newContent: z.string(),
  /** Filename for display and language detection */
  filename: z.string(),
  /** Optional language override for syntax highlighting */
  language: z.string().optional(),
  /** View mode: unified (default) or side-by-side */
  viewMode: z
    .enum([DIFF_VIEW_MODE.UNIFIED, DIFF_VIEW_MODE.SIDE_BY_SIDE])
    .default(DIFF_VIEW_MODE.UNIFIED),
  /** Number of context lines to show around changes */
  contextLines: z.number().default(LIMIT.DIFF_CONTEXT_LINES),
  /** Maximum lines before truncation */
  maxLines: z.number().optional(),
});

export type DiffRendererProps = z.infer<typeof DiffRendererPropsSchema>;

/**
 * Diff statistics
 */
export interface DiffStats {
  additions: number;
  deletions: number;
  totalChanges: number;
}

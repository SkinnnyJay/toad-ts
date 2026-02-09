/**
 * Diff view mode constants
 */
export const DIFF_VIEW_MODE = {
  UNIFIED: "unified",
  SIDE_BY_SIDE: "side_by_side",
} as const;

export type DiffViewMode = (typeof DIFF_VIEW_MODE)[keyof typeof DIFF_VIEW_MODE];

/**
 * Diff line type constants
 */
export const DIFF_LINE_TYPE = {
  ADDED: "added",
  REMOVED: "removed",
  UNCHANGED: "unchanged",
  HEADER: "header",
} as const;

export type DiffLineType = (typeof DIFF_LINE_TYPE)[keyof typeof DIFF_LINE_TYPE];

// Re-export for convenience
export const { UNIFIED, SIDE_BY_SIDE } = DIFF_VIEW_MODE;
export const { ADDED, REMOVED, UNCHANGED, HEADER } = DIFF_LINE_TYPE;

import { LIMIT } from "@/config/limits";
import { DIFF_VIEW_MODE } from "@/constants/diff-types";
import { diffColors } from "@/ui/theme";
import { createTwoFilesPatch } from "diff";
import { memo, useMemo } from "react";

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
}

export const DiffRenderer = memo(function DiffRenderer({
  oldContent,
  newContent,
  filename,
  language,
  viewMode = DIFF_VIEW_MODE.UNIFIED,
  contextLines = LIMIT.DIFF_CONTEXT_LINES,
}: DiffRendererProps): JSX.Element {
  const diff = useMemo(
    () =>
      createTwoFilesPatch(filename, filename, oldContent, newContent, "", "", {
        context: contextLines,
      }),
    [contextLines, filename, newContent, oldContent]
  );

  const view = viewMode === DIFF_VIEW_MODE.SIDE_BY_SIDE ? "split" : "unified";

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="rounded"
      borderColor={diffColors.border}
      paddingX={1}
      paddingY={1}
      gap={1}
    >
      <text fg={diffColors.header} bg={diffColors.headerBg}>
        {filename}
      </text>
      <diff
        diff={diff}
        filetype={language}
        view={view}
        showLineNumbers={true}
        addedBg={diffColors.addedBg}
        removedBg={diffColors.removedBg}
        contextBg={diffColors.contextBg}
        style={{ width: "100%" }}
      />
    </box>
  );
});

DiffRenderer.displayName = "DiffRenderer";

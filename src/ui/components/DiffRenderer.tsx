import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { DIFF_VIEW_MODE } from "@/constants/diff-types";
import { diffColors } from "@/ui/theme";
import { computeDiffInWorker } from "@/utils/diff/diff-worker-client";
import { TextAttributes } from "@opentui/core";
import { createTwoFilesPatch } from "diff";
import { type ReactNode, memo, useEffect, useMemo, useState } from "react";

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

const truncateByLines = (
  content: string,
  maxLines: number
): { content: string; truncated: boolean } => {
  const lines = content.split(/\r?\n/);
  if (lines.length <= maxLines) {
    return { content, truncated: false };
  }
  return { content: lines.slice(0, maxLines).join("\n"), truncated: true };
};

const truncateDiffLines = (diff: string, maxLines: number): string => {
  const lines = diff.split(/\r?\n/);
  if (lines.length <= maxLines) {
    return diff;
  }
  return lines.slice(0, maxLines).join("\n");
};

export const DiffRenderer = memo(function DiffRenderer({
  oldContent,
  newContent,
  filename,
  language,
  viewMode = DIFF_VIEW_MODE.UNIFIED,
  contextLines = LIMIT.DIFF_CONTEXT_LINES,
}: DiffRendererProps): ReactNode {
  const preview = useMemo(() => {
    const truncatedOld = truncateByLines(oldContent, LIMIT.DIFF_PREVIEW_LINES);
    const truncatedNew = truncateByLines(newContent, LIMIT.DIFF_PREVIEW_LINES);
    const previewDiff = createTwoFilesPatch(
      filename,
      filename,
      truncatedOld.content,
      truncatedNew.content,
      "",
      "",
      { context: contextLines }
    );
    return {
      diff: truncateDiffLines(previewDiff, LIMIT.DIFF_MAX_LINES),
      truncated: truncatedOld.truncated || truncatedNew.truncated,
    };
  }, [contextLines, filename, newContent, oldContent]);

  const [diff, setDiff] = useState(preview.diff);
  const [isLoading, setIsLoading] = useState(preview.truncated);

  useEffect(() => {
    let active = true;
    setDiff(preview.diff);

    if (!preview.truncated) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    void (async () => {
      const workerDiff = await computeDiffInWorker({
        filename,
        oldContent,
        newContent,
        contextLines,
      });

      const fullDiff =
        workerDiff ??
        createTwoFilesPatch(filename, filename, oldContent, newContent, "", "", {
          context: contextLines,
        });

      if (!active) return;
      setDiff(truncateDiffLines(fullDiff, LIMIT.DIFF_MAX_LINES));
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [contextLines, filename, newContent, oldContent, preview.diff, preview.truncated]);

  const view = viewMode === DIFF_VIEW_MODE.SIDE_BY_SIDE ? "split" : "unified";

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="rounded"
      borderColor={diffColors.border}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      <text fg={diffColors.header} bg={diffColors.headerBg}>
        {filename}
      </text>
      {isLoading ? (
        <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
          Loading full diff…
        </text>
      ) : null}
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

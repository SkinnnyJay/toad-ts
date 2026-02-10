import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

export interface ContextProgressProps {
  tokens: number;
  limit: number;
  label?: string;
  width?: number;
}

const buildProgressBar = (ratio: number, width: number): string => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  const empty = Math.max(0, width - filled);
  return `${"=".repeat(filled)}${"-".repeat(empty)}`;
};

export function ContextProgress({
  tokens,
  limit,
  label = "Ctx",
  width = LIMIT.CONTEXT_BAR_WIDTH,
}: ContextProgressProps): ReactNode {
  const safeLimit = Math.max(1, limit);
  const ratio = tokens / safeLimit;
  const bar = buildProgressBar(ratio, width);
  const isWarning = ratio >= LIMIT.CONTEXT_WARNING_RATIO;
  const barColor = isWarning ? COLOR.RED : COLOR.GREEN;
  return (
    <text>
      <span fg={COLOR.YELLOW} attributes={TextAttributes.BOLD}>
        {label}:
      </span>{" "}
      {tokens}/{limit}{" "}
      <span fg={barColor} attributes={TextAttributes.DIM}>
        [{bar}]
      </span>
    </text>
  );
}

import { COLOR } from "@/constants/colors";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

export interface ContextProgressProps {
  tokens: number;
  limit: number;
  label?: string;
}

export function ContextProgress({ tokens, limit, label = "Ctx" }: ContextProgressProps): ReactNode {
  return (
    <text attributes={TextAttributes.DIM}>
      <span fg={COLOR.YELLOW} attributes={TextAttributes.BOLD}>
        {label}:
      </span>{" "}
      {tokens}/{limit}
    </text>
  );
}

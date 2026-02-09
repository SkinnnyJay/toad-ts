import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo } from "react";

export const ThinkingBlock = memo(function ThinkingBlock({
  text,
}: {
  text: string;
}): ReactNode {
  return <text attributes={TextAttributes.DIM | TextAttributes.ITALIC}>{text}</text>;
});

ThinkingBlock.displayName = "ThinkingBlock";

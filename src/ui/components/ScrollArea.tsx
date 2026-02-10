import type { ReactNode } from "react";
import { memo } from "react";

interface ScrollAreaProps {
  children: ReactNode;
  height?: number;
  width?: number | `${number}%`;
  stickyScroll?: boolean;
  stickyStart?: "bottom" | "top" | "left" | "right";
  viewportCulling?: boolean;
  focused?: boolean;
  scrollX?: boolean;
  scrollY?: boolean;
}

export const ScrollArea = memo(function ScrollArea({
  children,
  height,
  width = "100%",
  stickyScroll = false,
  stickyStart,
  viewportCulling = true,
  focused = true,
  scrollX = false,
  scrollY = true,
}: ScrollAreaProps): ReactNode {
  return (
    <scrollbox
      height={height}
      width={width}
      stickyScroll={stickyScroll}
      stickyStart={stickyStart}
      viewportCulling={viewportCulling}
      focused={focused}
      scrollX={scrollX}
      scrollY={scrollY}
      style={{ width: "100%" }}
    >
      {children}
    </scrollbox>
  );
});

ScrollArea.displayName = "ScrollArea";

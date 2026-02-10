import type { ReactNode } from "react";

export interface AppIconProps {
  size?: "small" | "medium" | "large";
}

export function AppIcon({ size: _size = "small" }: AppIconProps): ReactNode {
  return <text>🍄</text>;
}

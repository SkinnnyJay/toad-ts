export interface AppIconProps {
  size?: "small" | "medium" | "large";
}

export function AppIcon({ size: _size = "small" }: AppIconProps): JSX.Element {
  return <text>🍄</text>;
}

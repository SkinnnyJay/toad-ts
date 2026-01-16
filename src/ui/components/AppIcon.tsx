import { join } from "node:path";
import { Box } from "ink";
import Picture from "ink-picture";

// Resolve path relative to project root (where CLI is executed from)
const getIconPath = (): string => {
  return join(process.cwd(), "public", "icon.png");
};

// Fallback emoji for terminals that don't support images
const FALLBACK_EMOJI = "🍄";

// Size mapping for different icon sizes (in terminal cells)
const SIZE_MAP = {
  small: 8,
  medium: 16,
  large: 24,
} as const;

export interface AppIconProps {
  size?: "small" | "medium" | "large";
}

export function AppIcon({ size = "small" }: AppIconProps): JSX.Element {
  const iconPath = getIconPath();
  const width = SIZE_MAP[size];

  return (
    <Box>
      <Picture src={iconPath} alt={FALLBACK_EMOJI} width={width} />
    </Box>
  );
}

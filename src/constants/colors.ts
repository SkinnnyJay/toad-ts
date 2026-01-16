export const COLOR = {
  GREEN: "green",
  RED: "red",
  YELLOW: "yellow",
  BLUE: "blue",
  CYAN: "cyan",
  MAGENTA: "magenta",
  GRAY: "gray",
  WHITE: "white",
  BLACK: "black",
} as const;

export type Color = (typeof COLOR)[keyof typeof COLOR];

// Re-export for convenience
export const { GREEN, RED, YELLOW, BLUE, CYAN, MAGENTA, GRAY, WHITE, BLACK } = COLOR;

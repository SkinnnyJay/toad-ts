export const COLOR = {
  GREEN: "#4CAF50", // success
  RED: "#FF6B6B", // error
  YELLOW: "#FFD700", // system/gold
  BLUE: "#00BFFF", // user cyan
  CYAN: "#00BFFF",
  MAGENTA: "#FF00FF",
  GRAY: "#404040",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  ASSISTANT: "#90EE90",
  CODE_BG: "#2F4F4F",
  WARNING: "#FFA726",
  DIM: "#808080",
  BORDER: "#404040",
} as const;

export type Color = (typeof COLOR)[keyof typeof COLOR];

// Re-export for convenience
export const { GREEN, RED, YELLOW, BLUE, CYAN, MAGENTA, GRAY, WHITE, BLACK } = COLOR;

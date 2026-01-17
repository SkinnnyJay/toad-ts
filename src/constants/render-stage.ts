export const RENDER_STAGE = {
  LOADING: "loading",
  CONNECTING: "connecting",
  READY: "ready",
  ERROR: "error",
} as const;

export type RenderStage = (typeof RENDER_STAGE)[keyof typeof RENDER_STAGE];

// Re-export for convenience
export const { LOADING, CONNECTING, READY, ERROR } = RENDER_STAGE;

/**
 * Cursor Cloud Agent status constants.
 *
 * @see PLAN2.md — "Cloud Agents API (Channel 3)"
 */

export const CURSOR_CLOUD_AGENT_STATUS = {
  CREATING: "CREATING",
  RUNNING: "RUNNING",
  FINISHED: "FINISHED",
  STOPPED: "STOPPED",
  ERROR: "ERROR",
} as const;

export type CursorCloudAgentStatus =
  (typeof CURSOR_CLOUD_AGENT_STATUS)[keyof typeof CURSOR_CLOUD_AGENT_STATUS];

export const CURSOR_CLOUD_API = {
  BASE_URL: "https://api.cursor.com",
  VERSION: "v0",
  AGENTS_PATH: "/v0/agents",
  ME_PATH: "/v0/me",
  MODELS_PATH: "/v0/models",
  REPOSITORIES_PATH: "/v0/repositories",
} as const;

// Re-export for convenience
export const {
  CREATING: CLOUD_CREATING,
  RUNNING: CLOUD_RUNNING,
  FINISHED: CLOUD_FINISHED,
  STOPPED: CLOUD_STOPPED,
  ERROR: CLOUD_ERROR,
} = CURSOR_CLOUD_AGENT_STATUS;

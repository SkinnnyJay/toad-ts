export const CURSOR_CLOUD_API = {
  BASE_URL: "https://api.cursor.com",
  VERSION_PREFIX: "/v0",
  AGENTS_PATH: "/agents",
  ME_PATH: "/me",
  MODELS_PATH: "/models",
  REPOSITORIES_PATH: "/repositories",
  FOLLOWUP_PATH: "followup",
  STOP_PATH: "stop",
  CONVERSATION_PATH: "conversation",
  DEFAULT_PAGE_LIMIT: 25,
  RETRY_ATTEMPTS: 3,
  RETRY_BASE_MS: 250,
  RETRY_CAP_MS: 2000,
} as const;

export const CURSOR_CLOUD_AGENT_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  STOPPED: "stopped",
  CANCELED: "canceled",
} as const;

export type CursorCloudAgentStatus =
  (typeof CURSOR_CLOUD_AGENT_STATUS)[keyof typeof CURSOR_CLOUD_AGENT_STATUS];

export const CURSOR_CLOUD_QUERY_KEY = {
  LIMIT: "limit",
  CURSOR: "cursor",
} as const;

export const { BASE_URL, VERSION_PREFIX, AGENTS_PATH, ME_PATH, MODELS_PATH, REPOSITORIES_PATH } =
  CURSOR_CLOUD_API;

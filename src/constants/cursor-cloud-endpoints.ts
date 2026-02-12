export const CURSOR_CLOUD_ENDPOINT = {
  AGENTS: "/agents",
  MODELS: "/models",
  REPOS: "/repos",
  KEY_INFO: "/key-info",
  FOLLOWUP_SUFFIX: "/followup",
  STOP_SUFFIX: "/stop",
  CONVERSATION_SUFFIX: "/conversation",
} as const;

export type CursorCloudEndpoint =
  (typeof CURSOR_CLOUD_ENDPOINT)[keyof typeof CURSOR_CLOUD_ENDPOINT];

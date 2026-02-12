export const AGENT_MANAGEMENT_COMMAND = {
  LOGIN: "login",
  LOGOUT: "logout",
  STATUS: "status",
  ABOUT: "about",
  MODELS: "models",
  MCP: "mcp",
  AGENT: "agent",
} as const;

export const HARNESS_ID = {
  CURSOR_CLI: "cursor-cli",
} as const;

export type AgentManagementCommand =
  (typeof AGENT_MANAGEMENT_COMMAND)[keyof typeof AGENT_MANAGEMENT_COMMAND];

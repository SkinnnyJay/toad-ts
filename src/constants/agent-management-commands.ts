export const AGENT_MANAGEMENT_COMMAND = {
  LOGIN: "login",
  LOGOUT: "logout",
  STATUS: "status",
  MODELS: "models",
  MODEL: "model",
  MCP: "mcp",
  AGENT: "agent",
  LIST: "ls",
} as const;

export type AgentManagementCommand =
  (typeof AGENT_MANAGEMENT_COMMAND)[keyof typeof AGENT_MANAGEMENT_COMMAND];

export const MCP_MANAGEMENT_SUBCOMMAND = {
  LIST: "list",
  ENABLE: "enable",
  DISABLE: "disable",
  LIST_TOOLS: "list-tools",
} as const;

export type McpManagementSubcommand =
  (typeof MCP_MANAGEMENT_SUBCOMMAND)[keyof typeof MCP_MANAGEMENT_SUBCOMMAND];

export const { LIST, ENABLE, DISABLE, LIST_TOOLS } = MCP_MANAGEMENT_SUBCOMMAND;

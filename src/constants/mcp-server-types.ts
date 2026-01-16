export const MCP_SERVER_TYPE = {
  HTTP: "http",
  SSE: "sse",
  STDIO: "stdio",
} as const;

export type McpServerType = (typeof MCP_SERVER_TYPE)[keyof typeof MCP_SERVER_TYPE];

// Re-export for convenience
export const { HTTP, SSE, STDIO } = MCP_SERVER_TYPE;

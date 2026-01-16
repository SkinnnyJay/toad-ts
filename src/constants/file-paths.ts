export const FILE_PATH = {
  TOADSTOOL_DIR: ".toadstool",
  SESSIONS_JSON: "sessions.json",
  TOADSTOOL_DB: "toadstool.db",
  MCP_JSON: "mcp.json",
  SETTINGS_JSON: "settings.json",
} as const;

export type FilePath = (typeof FILE_PATH)[keyof typeof FILE_PATH];

// Re-export for convenience
export const { TOADSTOOL_DIR, SESSIONS_JSON, TOADSTOOL_DB, MCP_JSON, SETTINGS_JSON } = FILE_PATH;

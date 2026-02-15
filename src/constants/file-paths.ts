export const FILE_PATH = {
  TOADSTOOL_DIR: ".toadstool",
  SESSIONS_JSON: "sessions.json",
  TOADSTOOL_DB: "toadstool.db",
  MCP_JSON: "mcp.json",
  SETTINGS_JSON: "settings.json",
  HARNESSES_JSON: "harnesses.json",
  TODOS_JSON: "todos.json",
  TODOS_DIR: "todos",
  UPDATE_CACHE_JSON: "update-cache.json",
  TERMINAL_SETUP_SCRIPT: "terminal-setup.sh",
  EXPORTS_DIR: "exports",
  SHARED_SESSIONS_DIR: "shared-sessions",
  CHECKPOINTS_DIR: "checkpoints",
} as const;

export type FilePath = (typeof FILE_PATH)[keyof typeof FILE_PATH];

// Re-export for convenience
export const {
  TOADSTOOL_DIR,
  SESSIONS_JSON,
  TOADSTOOL_DB,
  MCP_JSON,
  SETTINGS_JSON,
  HARNESSES_JSON,
  TODOS_JSON,
  TODOS_DIR,
  UPDATE_CACHE_JSON,
  TERMINAL_SETUP_SCRIPT,
  EXPORTS_DIR,
  SHARED_SESSIONS_DIR,
  CHECKPOINTS_DIR,
} = FILE_PATH;

export const CLOUD_AGENT_SUBCOMMAND = {
  ROOT: "cloud",
  LIST: "list",
  LAUNCH: "launch",
  STOP: "stop",
  FOLLOWUP: "followup",
  CONVERSATION: "conversation",
} as const;

export const MCP_SUBCOMMAND = {
  LIST: "list",
  LIST_TOOLS: "list-tools",
  ENABLE: "enable",
  DISABLE: "disable",
  LOGIN: "login",
} as const;

export const AGENT_SUBCOMMAND = {
  CLOUD: "cloud",
  MCP: "mcp",
  ABOUT: "about",
  LOGIN: "login",
  LOGOUT: "logout",
  STATUS: "status",
  MODELS: "models",
} as const;

export const CLOUD_DEFAULT_LIST_LIMIT = 10;
export const COMMAND_RESULT_EMPTY = "No output available.";

export const CLOUD_AGENT_MESSAGE = {
  CURSOR_ONLY: "Cloud commands require the active Cursor CLI harness.",
  USAGE:
    "Usage: /agent cloud list [limit] [cursor] | /agent cloud launch <prompt> | /agent cloud stop <agentId> | /agent cloud followup <agentId> <prompt> | /agent cloud conversation <agentId>",
  MISSING_PROMPT: "Provide a prompt for cloud launch.",
  MISSING_AGENT_ID: "Provide an agent id to stop.",
  MISSING_FOLLOWUP: "Usage: /agent cloud followup <agentId> <prompt>",
  MISSING_CONVERSATION: "Usage: /agent cloud conversation <agentId>",
  PENDING_STATUS: "Status check pending.",
} as const;

export const MCP_MESSAGE = {
  USAGE: "Usage: /mcp [list|list-tools <id>|enable <id>|disable <id>|login <id>]",
  MISSING_SERVER_ID: "Provide an MCP server id.",
  UNSUPPORTED_SUBCOMMAND: "MCP subcommand is not supported for the active harness.",
} as const;

export const HARNESS_MESSAGE = {
  NO_ACTIVE_HARNESS: "No active harness selected.",
  NOT_SUPPORTED: "is not supported for the active harness.",
  GEMINI_LOGIN: "Gemini CLI uses environment-based auth. Set GOOGLE_API_KEY or GEMINI_API_KEY.",
  LOGIN_OPENS_BROWSER: "Login will open a browser for authentication.",
  MODELS_USE_FLAG: "Model listing is unavailable. Use /model <id> or a --model flag.",
} as const;

export const AGENT_MESSAGE = {
  UNSUPPORTED_SUBCOMMAND:
    "Unsupported /agent subcommand. Use /agent status|about|login|logout|models|mcp|cloud.",
} as const;

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const parseCloudListArgs = (
  args: string[]
): {
  limit: number;
  cursor: string | undefined;
} => {
  const [firstArg, secondArg] = args;
  const parsedLimit = Number.parseInt(firstArg ?? "", 10);
  const hasNumericPrefix = firstArg !== undefined && /^\d+$/.test(firstArg.trim());
  if (hasNumericPrefix) {
    return {
      limit: parsedLimit > 0 ? parsedLimit : CLOUD_DEFAULT_LIST_LIMIT,
      cursor: secondArg?.trim() || undefined,
    };
  }
  return {
    limit: CLOUD_DEFAULT_LIST_LIMIT,
    cursor: firstArg?.trim() || undefined,
  };
};

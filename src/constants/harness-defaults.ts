export const HARNESS_DEFAULT = {
  CLAUDE_CLI_ID: "claude-cli",
  CLAUDE_CLI_NAME: "Claude CLI",
  CLAUDE_COMMAND: "claude-code-acp",
  CLAUDE_ARGS: [] as string[],
  GEMINI_CLI_ID: "gemini-cli",
  GEMINI_CLI_NAME: "Gemini CLI",
  GEMINI_COMMAND: "gemini",
  GEMINI_ARGS: ["--experimental-acp"],
  CODEX_CLI_ID: "codex-cli",
  CODEX_CLI_NAME: "Codex CLI",
  CODEX_COMMAND: "codex",
  CODEX_ARGS: ["--experimental-acp"],
  CURSOR_CLI_ID: "cursor-cli",
  CURSOR_CLI_NAME: "Cursor CLI",
  CURSOR_COMMAND: "cursor-agent",
  CURSOR_ARGS: [] as string[],
  MOCK_ID: "mock",
  MOCK_NAME: "Mock Agent",
} as const;

export type HarnessDefault = (typeof HARNESS_DEFAULT)[keyof typeof HARNESS_DEFAULT];

// Re-export for convenience
export const {
  CLAUDE_CLI_ID,
  CLAUDE_CLI_NAME,
  CLAUDE_COMMAND,
  CLAUDE_ARGS,
  GEMINI_CLI_ID,
  GEMINI_CLI_NAME,
  GEMINI_COMMAND,
  GEMINI_ARGS,
  CODEX_CLI_ID,
  CODEX_CLI_NAME,
  CODEX_COMMAND,
  CODEX_ARGS,
  CURSOR_CLI_ID,
  CURSOR_CLI_NAME,
  CURSOR_COMMAND,
  CURSOR_ARGS,
  MOCK_ID,
  MOCK_NAME,
} = HARNESS_DEFAULT;

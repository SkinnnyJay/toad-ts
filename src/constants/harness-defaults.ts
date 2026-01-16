export const HARNESS_DEFAULT = {
  CLAUDE_CLI_ID: "claude-cli",
  CLAUDE_CLI_NAME: "Claude CLI",
  CLAUDE_COMMAND: "claude-code-acp",
  MOCK_ID: "mock",
  MOCK_NAME: "Mock Agent",
} as const;

export type HarnessDefault = (typeof HARNESS_DEFAULT)[keyof typeof HARNESS_DEFAULT];

// Re-export for convenience
export const { CLAUDE_CLI_ID, CLAUDE_CLI_NAME, CLAUDE_COMMAND, MOCK_ID, MOCK_NAME } =
  HARNESS_DEFAULT;

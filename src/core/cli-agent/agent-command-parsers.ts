const COMMAND_REGEX = {
  MCP_LIST_LINE: /^([^:]+):\s*(.+?)(?:\s+\((.+)\))?$/,
  CODEX_AUTH_EMAIL: /(logged in|authenticated) as\s+([^\s]+)/i,
  CODEX_NOT_AUTHED: /(not logged in|unauthenticated|login required)/i,
} as const;

const toLines = (value: string): string[] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export interface ParsedMcpServerStatus {
  name: string;
  status: string;
  reason?: string;
}

export interface ParsedCodexLoginStatus {
  authenticated: boolean;
  email?: string;
  message: string;
}

export const parseCliVersionOutput = (output: string): string | undefined => {
  const [firstLine] = toLines(output);
  return firstLine;
};

export const parseClaudeVersionOutput = (output: string): string | undefined => {
  return parseCliVersionOutput(output);
};

export const parseGeminiVersionOutput = (output: string): string | undefined => {
  return parseCliVersionOutput(output);
};

export const parseMcpListOutput = (output: string): ParsedMcpServerStatus[] => {
  return toLines(output)
    .map((line) => {
      const match = line.match(COMMAND_REGEX.MCP_LIST_LINE);
      if (!match) {
        return null;
      }
      const name = match[1]?.trim();
      const status = match[2]?.trim();
      const reason = match[3]?.trim();
      if (!name || !status) {
        return null;
      }
      return {
        name,
        status,
        ...(reason ? { reason } : {}),
      };
    })
    .filter((entry): entry is ParsedMcpServerStatus => entry !== null);
};

export const parseClaudeMcpListOutput = (output: string): ParsedMcpServerStatus[] => {
  return parseMcpListOutput(output);
};

export const parseCodexLoginStatusOutput = (
  stdout: string,
  stderr: string
): ParsedCodexLoginStatus => {
  const combined = `${stdout}\n${stderr}`;
  const emailMatch = combined.match(COMMAND_REGEX.CODEX_AUTH_EMAIL);
  if (emailMatch) {
    return {
      authenticated: true,
      email: emailMatch[2],
      message: emailMatch[0],
    };
  }
  if (COMMAND_REGEX.CODEX_NOT_AUTHED.test(combined)) {
    return {
      authenticated: false,
      message: "Not authenticated",
    };
  }
  return {
    authenticated: false,
    message: parseCliVersionOutput(combined) ?? "Unknown auth status",
  };
};

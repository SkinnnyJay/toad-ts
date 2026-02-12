const COMMAND_REGEX = {
  MCP_LIST_LINE: /^([^:]+):\s*(.+?)(?:\s+\((.+)\))?$/,
  CODEX_AUTH_EMAIL: /(logged in|authenticated) as\s+([^\s]+)/i,
  CODEX_NOT_AUTHED: /(not logged in|unauthenticated|login required)/i,
  GEMINI_LIST_MARKER: /^\s*(?:[-*]|\d+\.)\s*/,
} as const;

const toLines = (value: string): string[] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
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

export interface ParsedGeminiSessions {
  sessionIds: string[];
  count: number;
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

export const parseCodexVersionOutput = (output: string): string | undefined => {
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

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return value;
};

const getStringField = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const parseGeminiSessionsFromJson = (output: string): string[] | undefined => {
  try {
    const parsed: unknown = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => {
          if (typeof entry === "string") {
            return entry.trim();
          }
          const record = toRecord(entry);
          if (!record) {
            return undefined;
          }
          return getStringField(record, "id") ?? getStringField(record, "sessionId");
        })
        .filter((entry): entry is string => Boolean(entry));
    }
    const parsedRecord = toRecord(parsed);
    if (!parsedRecord) {
      return undefined;
    }
    const sessionsField = parsedRecord.sessions;
    if (!Array.isArray(sessionsField)) {
      return undefined;
    }
    return sessionsField
      .map((entry) => {
        const record = toRecord(entry);
        if (!record) {
          return undefined;
        }
        return getStringField(record, "id") ?? getStringField(record, "sessionId");
      })
      .filter((entry): entry is string => Boolean(entry));
  } catch {
    return undefined;
  }
};

const parseGeminiSessionLine = (line: string): string | undefined => {
  const normalized = line.replace(COMMAND_REGEX.GEMINI_LIST_MARKER, "").trim();
  if (!normalized) {
    return undefined;
  }
  const [firstToken] = normalized.split(/\s+/);
  const token = firstToken?.replace(/:$/, "").trim();
  if (!token) {
    return undefined;
  }
  const lower = token.toLowerCase();
  if (lower === "sessions" || lower === "session" || lower === "id" || lower === "name") {
    return undefined;
  }
  return token;
};

export const parseGeminiListSessionsOutput = (output: string): ParsedGeminiSessions => {
  const jsonSessionIds = parseGeminiSessionsFromJson(output.trim());
  if (jsonSessionIds && jsonSessionIds.length > 0) {
    const deduped = [...new Set(jsonSessionIds)];
    return {
      sessionIds: deduped,
      count: deduped.length,
    };
  }
  const lineSessionIds = toLines(output)
    .map((line) => parseGeminiSessionLine(line))
    .filter((entry): entry is string => Boolean(entry));
  const deduped = [...new Set(lineSessionIds)];
  return {
    sessionIds: deduped,
    count: deduped.length,
  };
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

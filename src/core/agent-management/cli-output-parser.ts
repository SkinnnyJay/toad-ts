import {
  type CliAgentAuthStatus,
  CliAgentAuthStatusSchema,
  type CliAgentModelsResponse,
  CliAgentModelsResponseSchema,
  type CliAgentSession,
  CliAgentSessionSchema,
} from "@/types/cli-agent.types";

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const SESSION_ID_PATTERN = /\b[a-z0-9][a-z0-9._:-]*[-_][a-z0-9._:-]+\b/i;
const MODEL_LINE_PATTERN = /^(\S+)\s+-\s+(.+)$/;
const LOGGED_IN_PATTERN = /logged in as\s+([^\s]+@[^\s]+)/i;
const REQUIRES_TTY_PATTERN = /requires tty/i;

const getNonEmptyLines = (input: string): string[] =>
  input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const parseAuthStatusOutput = (stdout: string): CliAgentAuthStatus => {
  const loggedIn = LOGGED_IN_PATTERN.exec(stdout);
  return CliAgentAuthStatusSchema.parse({
    authenticated: loggedIn !== null,
    method: loggedIn ? "browser_login" : "none",
    email: loggedIn?.[1],
  });
};

export const parseModelsOutput = (stdout: string): CliAgentModelsResponse => {
  const models = getNonEmptyLines(stdout)
    .map((line) => {
      const match = MODEL_LINE_PATTERN.exec(line);
      if (!match) {
        return null;
      }
      const id = match[1];
      const name = match[2]
        ?.replace(/\s+\((current|default)[^)]+\)/gi, "")
        .replace(/\s+\(current,\s*default\)/gi, "")
        .trim();
      if (!id || !name) {
        return null;
      }
      return {
        id,
        name,
        isDefault: /\(current|default\)/i.test(line),
        supportsThinking: /\bthinking\b/i.test(line),
      };
    })
    .filter(
      (
        entry
      ): entry is { id: string; name: string; isDefault: boolean; supportsThinking: boolean } =>
        entry !== null
    );

  const defaultModel = models.find((model) => model.isDefault)?.id;
  return CliAgentModelsResponseSchema.parse({
    models,
    defaultModel,
  });
};

export const parseUuidLines = (stdout: string): string[] =>
  getNonEmptyLines(stdout)
    .map((line) => UUID_PATTERN.exec(line)?.[0] ?? null)
    .filter((entry): entry is string => entry !== null);

const extractSessionIdFromLine = (line: string): string | null => {
  return UUID_PATTERN.exec(line)?.[0] ?? SESSION_ID_PATTERN.exec(line)?.[0] ?? null;
};

const extractSessionTitleFromLine = (line: string, sessionId: string): string | undefined => {
  const sessionIdIndex = line.indexOf(sessionId);
  if (sessionIdIndex < 0) {
    return undefined;
  }
  const trailing = line.slice(sessionIdIndex + sessionId.length).trim();
  return trailing.length > 0 ? trailing : undefined;
};

export const parseSessionSummariesOutput = (stdout: string): CliAgentSession[] => {
  const lines = getNonEmptyLines(stdout);
  if (lines.some((line) => REQUIRES_TTY_PATTERN.test(line))) {
    return [];
  }

  const sessionById = new Map<string, CliAgentSession>();
  for (const line of lines) {
    const sessionId = extractSessionIdFromLine(line);
    if (!sessionId) {
      continue;
    }
    const parsedSession = CliAgentSessionSchema.parse({
      id: sessionId,
      title: extractSessionTitleFromLine(line, sessionId),
    });
    const existing = sessionById.get(sessionId);
    if (!existing || (!existing.title && parsedSession.title)) {
      sessionById.set(sessionId, parsedSession);
    }
  }
  return Array.from(sessionById.values());
};

export const parseSessionListOutput = (stdout: string): string[] =>
  parseSessionSummariesOutput(stdout).map((session) => session.id);

export const extractFirstUuid = (stdout: string): string | null => {
  const match = UUID_PATTERN.exec(stdout);
  return match?.[0] ?? null;
};

export const parseKeyValueLines = (stdout: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const line of getNonEmptyLines(stdout)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key.length > 0) {
      result[key] = value;
    }
  }
  return result;
};

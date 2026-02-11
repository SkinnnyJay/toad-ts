import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { parseSessionListCommandResult } from "@/core/agent-management/session-list-command-result";
import {
  toAgentManagementSessions,
  toNormalizedAgentManagementSessions,
} from "@/core/agent-management/session-summary-mapper";
import type {
  AgentManagementCommandResult,
  AgentManagementSession,
} from "@/types/agent-management.types";
import { type SessionId, SessionIdSchema } from "@/types/domain";
import { useCallback, useEffect, useState } from "react";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to load native Cursor sessions.";
};

const toNormalizedSessionId = (sessionId: string): SessionId | undefined => {
  const parsed = SessionIdSchema.safeParse(sessionId.trim());
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
};

const toValidatedSession = (
  session: AgentManagementSession
): AgentManagementSession | undefined => {
  const sessionId = toNormalizedSessionId(session.id);
  if (!sessionId) {
    return undefined;
  }
  return {
    id: sessionId,
    title: session.title,
    createdAt: session.createdAt,
    model: session.model,
    messageCount: session.messageCount,
  };
};

const toSortedUniqueValidatedSessions = (
  sessions: AgentManagementSession[]
): AgentManagementSession[] => {
  return toNormalizedAgentManagementSessions(
    sessions
      .map((session) => toValidatedSession(session))
      .filter((session): session is AgentManagementSession => session !== undefined)
  );
};

const toUniqueSessionIdsFromList = (sessionIds: string[]): SessionId[] => {
  const parsedIds = sessionIds
    .map((sessionId) => toNormalizedSessionId(sessionId))
    .filter((sessionId): sessionId is SessionId => sessionId !== undefined);
  return Array.from(new Set(parsedIds));
};

const toUniqueSessionsFromCommandResult = (
  result: AgentManagementCommandResult
): AgentManagementSession[] =>
  toSortedUniqueValidatedSessions(toAgentManagementSessions(parseSessionListCommandResult(result)));

export interface UseCursorNativeSessionIdsOptions {
  enabled?: boolean;
  client?: CursorNativeSessionClient | null;
}

export interface UseCursorNativeSessionIdsResult {
  sessions: AgentManagementSession[];
  sessionIds: SessionId[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface CursorNativeSessionClient {
  listAgentSessions?: () => Promise<AgentManagementSession[]>;
  runAgentCommand?: (args: string[]) => Promise<AgentManagementCommandResult>;
}

export function useCursorNativeSessionIds(
  options: UseCursorNativeSessionIdsOptions = {}
): UseCursorNativeSessionIdsResult {
  const { enabled = false, client } = options;
  const [sessions, setSessions] = useState<AgentManagementSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetState = useCallback(() => {
    setSessions((current) => (current.length === 0 ? current : []));
    setLoading((current) => (current ? false : current));
    setError((current) => (current === null ? current : null));
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !client) {
      resetState();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (client.listAgentSessions) {
        const listedSessions = await client.listAgentSessions();
        setSessions(toSortedUniqueValidatedSessions(listedSessions));
        return;
      }
      if (!client.runAgentCommand) {
        resetState();
        return;
      }
      const result = await client.runAgentCommand([AGENT_MANAGEMENT_COMMAND.LIST]);
      const parsed = toUniqueSessionsFromCommandResult(result);
      setSessions(parsed);
    } catch (error) {
      setSessions([]);
      setError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [client, enabled, resetState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    sessions,
    sessionIds: toUniqueSessionIdsFromList(sessions.map((session) => session.id)),
    loading,
    error,
    refresh,
  };
}

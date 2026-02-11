import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { parseSessionListCommandResult } from "@/core/agent-management/session-list-command-result";
import { toUniqueAgentManagementSessions } from "@/core/agent-management/session-summary-mapper";
import type { AgentManagementSession } from "@/types/agent-management.types";
import { type SessionId, SessionIdSchema } from "@/types/domain";
import { useCallback, useEffect, useState } from "react";

const CURSOR_NATIVE_SESSION_COMMAND = {
  LIST: AGENT_MANAGEMENT_COMMAND.LIST,
} as const;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to load native Cursor sessions.";
};

const toUniqueSessionIdsFromList = (sessionIds: string[]): SessionId[] => {
  const parsedIds = sessionIds
    .map((sessionId) => SessionIdSchema.safeParse(sessionId))
    .filter((parsed): parsed is { success: true; data: SessionId } => parsed.success)
    .map((parsed) => parsed.data);
  return Array.from(new Set(parsedIds));
};

const toUniqueSessionsFromCommandResult = (result: {
  stdout: string;
  stderr: string;
  exitCode: number;
}): AgentManagementSession[] =>
  toUniqueAgentManagementSessions(
    parseSessionListCommandResult(result).filter(
      (session): session is AgentManagementSession => SessionIdSchema.safeParse(session.id).success
    )
  );

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
  runAgentCommand?: (
    args: string[]
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
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
        const deduped = toUniqueAgentManagementSessions(
          listedSessions.filter((session) => SessionIdSchema.safeParse(session.id).success)
        );
        setSessions(deduped);
        return;
      }
      if (!client.runAgentCommand) {
        resetState();
        return;
      }
      const result = await client.runAgentCommand([CURSOR_NATIVE_SESSION_COMMAND.LIST]);
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

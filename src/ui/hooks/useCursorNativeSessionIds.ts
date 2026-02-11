import { parseUuidLines } from "@/core/agent-management/cli-output-parser";
import { AGENT_MANAGEMENT_COMMAND } from "@/types/agent-management.types";
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

const toUniqueSessionIds = (value: string): SessionId[] => {
  const parsedIds = parseUuidLines(value)
    .map((sessionId) => SessionIdSchema.safeParse(sessionId))
    .filter((parsed): parsed is { success: true; data: SessionId } => parsed.success)
    .map((parsed) => parsed.data);
  return Array.from(new Set(parsedIds));
};

const toUniqueSessionIdsFromList = (sessionIds: string[]): SessionId[] => {
  const parsedIds = sessionIds
    .map((sessionId) => SessionIdSchema.safeParse(sessionId))
    .filter((parsed): parsed is { success: true; data: SessionId } => parsed.success)
    .map((parsed) => parsed.data);
  return Array.from(new Set(parsedIds));
};

export interface UseCursorNativeSessionIdsOptions {
  enabled?: boolean;
  client?: CursorNativeSessionClient | null;
}

export interface UseCursorNativeSessionIdsResult {
  sessionIds: SessionId[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface CursorNativeSessionClient {
  listAgentSessions?: () => Promise<Array<{ id: string }>>;
  runAgentCommand?: (
    args: string[]
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export function useCursorNativeSessionIds(
  options: UseCursorNativeSessionIdsOptions = {}
): UseCursorNativeSessionIdsResult {
  const { enabled = false, client } = options;
  const [sessionIds, setSessionIds] = useState<SessionId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetState = useCallback(() => {
    setSessionIds((current) => (current.length === 0 ? current : []));
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
        const sessions = await client.listAgentSessions();
        const parsed = toUniqueSessionIdsFromList(sessions.map((session) => session.id));
        setSessionIds(parsed);
        return;
      }
      if (!client.runAgentCommand) {
        resetState();
        return;
      }
      const result = await client.runAgentCommand([CURSOR_NATIVE_SESSION_COMMAND.LIST]);
      if (result.exitCode !== 0) {
        const output = `${result.stderr}\n${result.stdout}`.trim();
        throw new Error(output.length > 0 ? output : "Cursor session listing command failed.");
      }
      const parsed = toUniqueSessionIds(`${result.stdout}\n${result.stderr}`);
      setSessionIds(parsed);
    } catch (error) {
      setSessionIds([]);
      setError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [client, enabled, resetState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    sessionIds,
    loading,
    error,
    refresh,
  };
}

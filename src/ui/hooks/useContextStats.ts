import { LIMIT } from "@/config/limits";
import { computeContextStats } from "@/core/context-manager";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { useMemo } from "react";

export interface ContextStats {
  tokens: number;
  chars: number;
  bytes: number;
  limit: number;
}

export const useContextStats = (sessionId?: SessionId): ContextStats | null => {
  const messages = useAppStore((state) =>
    sessionId ? state.getMessagesForSession(sessionId) : []
  );

  return useMemo(() => {
    if (!sessionId) {
      return null;
    }
    if (messages.length === 0) {
      return {
        tokens: 0,
        chars: 0,
        bytes: 0,
        limit: LIMIT.CONTEXT_TOKEN_BUDGET,
      };
    }
    const stats = computeContextStats(messages);
    return {
      tokens: stats.tokens,
      chars: stats.chars,
      bytes: stats.bytes,
      limit: LIMIT.CONTEXT_TOKEN_BUDGET,
    };
  }, [sessionId, messages]);
};

import { generateSessionTitle } from "@/core/auto-title";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { useCallback } from "react";

/**
 * Hook that auto-generates a session title from the first user message
 * if the session doesn't already have a title.
 */
export const useAutoTitle = (): ((sessionId: SessionId) => void) => {
  const getSession = useAppStore((state) => state.getSession);
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const upsertSession = useAppStore((state) => state.upsertSession);

  return useCallback(
    (sessionId: SessionId) => {
      const session = getSession(sessionId);
      if (!session || session.title) return;
      const messages = getMessagesForSession(sessionId);
      const title = generateSessionTitle(messages);
      if (title) {
        upsertSession({ session: { ...session, title, updatedAt: Date.now() } });
      }
    },
    [getSession, getMessagesForSession, upsertSession]
  );
};

import { useAppStore } from "@/store/app-store";
import type { Session, SessionId } from "@/types/domain";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface UseSessionNavigationOptions {
  currentSessionId?: SessionId;
  onSelectSession?: (sessionId: SessionId) => void;
}

export interface UseSessionNavigationResult {
  sessions: Session[];
  sessionIndex: number;
  setSessionIndex: (index: number | ((prev: number) => number)) => void;
  handleSessionSelect: () => void;
  navigateUp: () => void;
  navigateDown: () => void;
}

/**
 * Hook to manage session list navigation in the sidebar.
 * Handles keyboard navigation and session selection.
 */
export function useSessionNavigation({
  currentSessionId,
  onSelectSession,
}: UseSessionNavigationOptions = {}): UseSessionNavigationResult {
  const sessionsById = useAppStore((state) => state.sessions);
  const storeCurrentSessionId = useAppStore((state) => state.currentSessionId);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);

  const activeSessionId = currentSessionId ?? storeCurrentSessionId;

  const sessions = useMemo<Session[]>(() => {
    const values = Object.values(sessionsById) as Session[];
    return values.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessionsById]);

  const [sessionIndex, setSessionIndex] = useState(0);

  // Sync session index with active session
  useEffect(() => {
    if (!activeSessionId) {
      setSessionIndex(0);
      return;
    }
    const foundIndex = sessions.findIndex((session) => session.id === activeSessionId);
    if (foundIndex >= 0) {
      setSessionIndex(foundIndex);
    }
  }, [activeSessionId, sessions]);

  const navigateUp = useCallback(() => {
    setSessionIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const navigateDown = useCallback(() => {
    setSessionIndex((prev) => Math.min(sessions.length - 1, prev + 1));
  }, [sessions.length]);

  const handleSessionSelect = useCallback(() => {
    const chosen = sessions[sessionIndex];
    if (chosen) {
      if (onSelectSession) {
        onSelectSession(chosen.id);
      } else {
        setCurrentSession(chosen.id);
      }
    }
  }, [sessions, sessionIndex, onSelectSession, setCurrentSession]);

  return {
    sessions,
    sessionIndex,
    setSessionIndex,
    handleSessionSelect,
    navigateUp,
    navigateDown,
  };
}

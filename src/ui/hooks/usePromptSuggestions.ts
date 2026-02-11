import { generateSuggestions } from "@/core/prompt-suggestions";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { useMemo } from "react";

/**
 * Hook that provides AI-generated next-step suggestions based on conversation context.
 * Suggestions appear as grayed-out text in the input after each assistant response.
 */
export const usePromptSuggestions = (sessionId?: SessionId): string[] => {
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);

  return useMemo(() => {
    if (!sessionId) return [];
    const messages = getMessagesForSession(sessionId);
    return generateSuggestions(messages);
  }, [getMessagesForSession, sessionId]);
};

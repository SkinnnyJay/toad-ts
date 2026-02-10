import { LIMIT } from "@/config/limits";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { extractBlockText } from "@/ui/components/chat/slash-command-helpers";
import { createDefaultTokenizerAdapter } from "@/utils/token-optimizer/tokenizer";
import { useMemo } from "react";

export interface ContextStats {
  tokens: number;
  chars: number;
  bytes: number;
  limit: number;
}

export const useContextStats = (sessionId?: SessionId): ContextStats | null => {
  const getMessagesForSession = useAppStore((state) => state.getMessagesForSession);
  const tokenizer = useMemo(() => createDefaultTokenizerAdapter(), []);

  return useMemo(() => {
    if (!sessionId) {
      return null;
    }
    const messages = getMessagesForSession(sessionId);
    if (messages.length === 0) {
      return {
        tokens: 0,
        chars: 0,
        bytes: 0,
        limit: LIMIT.CONTEXT_TOKEN_BUDGET,
      };
    }
    const combined = messages
      .map((message) => message.content.map(extractBlockText).join("\n"))
      .join("\n");
    const estimate = tokenizer.estimate(combined);
    return {
      tokens: estimate.tokenCount,
      chars: estimate.charCount,
      bytes: estimate.byteSize,
      limit: LIMIT.CONTEXT_TOKEN_BUDGET,
    };
  }, [getMessagesForSession, sessionId, tokenizer]);
};

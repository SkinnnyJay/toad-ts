import type { Message, Session } from "@/types/domain";
import type { ChatQuery, PersistenceProvider } from "./persistence-provider";

export interface SearchEngine {
  search(query: ChatQuery): Promise<Message[]>;
  getSessionHistory(sessionId: string): Promise<Session & { messages: Message[] }>;
}

export const createSearchEngine = (provider: PersistenceProvider): SearchEngine => {
  return {
    async search(query) {
      return provider.search(query);
    },
    async getSessionHistory(sessionId) {
      return provider.getSessionHistory(sessionId);
    },
  };
};

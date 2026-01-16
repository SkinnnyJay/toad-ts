import { PERSISTENCE_PROVIDER } from "@/constants/persistence-providers";
import type { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import type { SessionSnapshot } from "@/store/session-persistence";
import type { Message, MessageRole, Session } from "@/types/domain";

import { createJsonPersistenceProvider } from "./json-provider";
import { createSqlitePersistenceProvider } from "./sqlite-provider";

export interface PersistenceConfig {
  provider: typeof PERSISTENCE_PROVIDER.JSON | typeof PERSISTENCE_PROVIDER.SQLITE;
  json?: {
    filePath: string;
  };
  sqlite?: {
    filePath: string;
    writeMode:
      | typeof PERSISTENCE_WRITE_MODE.PER_TOKEN
      | typeof PERSISTENCE_WRITE_MODE.PER_MESSAGE
      | typeof PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE;
    batchDelay: number;
  };
}

export interface ChatQuery {
  // Full-text search
  text?: string;

  // Filters
  sessionId?: string;
  agentId?: string;
  role?: MessageRole;
  dateRange?: { from: Date; to: Date };

  // Pagination
  limit?: number;
  offset?: number;
}

export interface PersistenceProvider {
  // Core persistence operations
  load(): Promise<SessionSnapshot>;
  save(snapshot: SessionSnapshot): Promise<void>;
  close(): Promise<void>;

  // Advanced querying (provider-specific capabilities)
  search(query: ChatQuery): Promise<Message[]>;
  getSessionHistory(sessionId: string): Promise<Session & { messages: Message[] }>;
}

export const createPersistenceProvider = (config: PersistenceConfig): PersistenceProvider => {
  switch (config.provider) {
    case PERSISTENCE_PROVIDER.JSON:
      if (!config.json) {
        throw new Error("JSON provider requires json configuration");
      }
      return createJsonPersistenceProvider(config.json);
    case PERSISTENCE_PROVIDER.SQLITE:
      if (!config.sqlite) {
        throw new Error("SQLite provider requires sqlite configuration");
      }
      return createSqlitePersistenceProvider(config.sqlite);
    default:
      throw new Error(
        `Unknown persistence provider: ${String((config as { provider: unknown }).provider)}`
      );
  }
};

// Provider implementations
export { createJsonPersistenceProvider } from "./json-provider";
export { createSqlitePersistenceProvider } from "./sqlite-provider";

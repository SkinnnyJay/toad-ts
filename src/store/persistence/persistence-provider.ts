import type { SessionSnapshot } from "@/store/session-persistence";
import type { Message, MessageRole, Session } from "@/types/domain";

import { createJsonPersistenceProvider } from "./json-provider";

export interface PersistenceConfig {
  provider: "json" | "sqlite";
  json?: {
    filePath: string;
  };
  sqlite?: {
    filePath: string;
    writeMode: "per_token" | "per_message" | "on_session_change";
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
    case "json":
      if (!config.json) {
        throw new Error("JSON provider requires json configuration");
      }
      return createJsonPersistenceProvider(config.json);
    case "sqlite":
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

// Forward declarations - will be implemented in separate files
export const createSqlitePersistenceProvider = (
  _config: PersistenceConfig["sqlite"]
): PersistenceProvider => {
  throw new Error("SQLite provider not yet implemented");
};

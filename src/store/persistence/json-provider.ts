import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LIMIT } from "@/config/limits";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import { INDENT_SPACES } from "@/constants/json-format";

import { SessionSnapshotSchema } from "@/store/session-persistence";
import type { SessionSnapshot } from "@/store/session-persistence";
import type { ContentBlock, Message, Session } from "@/types/domain";
import type { ChatQuery, PersistenceConfig, PersistenceProvider } from "./persistence-provider";

export const createJsonPersistenceProvider = (
  config: NonNullable<PersistenceConfig["json"]>
): PersistenceProvider => {
  const { filePath } = config;

  const readSnapshotFile = async (): Promise<SessionSnapshot> => {
    try {
      const content = await readFile(filePath, ENCODING.UTF8);
      if (!content.trim()) {
        return SessionSnapshotSchema.parse({
          currentSessionId: undefined,
          sessions: {},
          messages: {},
        });
      }
      const parsed: unknown = JSON.parse(content);
      return SessionSnapshotSchema.parse(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === ERROR_CODE.ENOENT) {
        return SessionSnapshotSchema.parse({
          currentSessionId: undefined,
          sessions: {},
          messages: {},
        });
      }
      if (error instanceof SyntaxError) {
        return SessionSnapshotSchema.parse({
          currentSessionId: undefined,
          sessions: {},
          messages: {},
        });
      }
      throw error;
    }
  };

  return {
    async load(): Promise<SessionSnapshot> {
      return readSnapshotFile();
    },

    async save(snapshot: SessionSnapshot): Promise<void> {
      const normalized = SessionSnapshotSchema.parse(snapshot);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(normalized, null, INDENT_SPACES), ENCODING.UTF8);
    },

    async close(): Promise<void> {
      // JSON provider has no connections to close
    },

    async search(query: ChatQuery): Promise<Message[]> {
      // Basic in-memory search for JSON provider
      const snapshot = await readSnapshotFile();
      let messages = Object.values(snapshot.messages) as Message[];

      // Apply filters
      if (query.sessionId) {
        messages = messages.filter((m) => m.sessionId === query.sessionId);
      }

      if (query.role) {
        messages = messages.filter((m) => m.role === query.role);
      }

      if (query.dateRange) {
        const { from, to } = query.dateRange;
        messages = messages.filter((m) => {
          const msgDate = new Date(m.createdAt);
          return msgDate >= from && msgDate <= to;
        });
      }

      if (query.text) {
        const searchTerm = query.text.toLowerCase();
        messages = messages.filter((m) =>
          m.content.some(
            (block: ContentBlock) =>
              block.type === "text" && block.text.toLowerCase().includes(searchTerm)
          )
        );
      }

      // Sort by creation date, newest first
      messages.sort((a, b) => b.createdAt - a.createdAt);

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || LIMIT.DEFAULT_PAGINATION_LIMIT;
      return messages.slice(offset, offset + limit);
    },

    async getSessionHistory(sessionId: string): Promise<Session & { messages: Message[] }> {
      const snapshot = await readSnapshotFile();
      const sessions = snapshot.sessions as Record<string, Session>;
      const messages = snapshot.messages as Record<string, Message>;

      const session = sessions[sessionId];

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionMessages = session.messageIds
        .map((id) => messages[id])
        .filter(Boolean) as Message[];

      return { ...session, messages: sessionMessages };
    },
  };
};

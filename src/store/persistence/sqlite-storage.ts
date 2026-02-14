import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { Prisma, PrismaClient } from "@prisma/client";
import type { Message as PrismaMessage, Session as PrismaSession } from "@prisma/client";

import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_MODE } from "@/constants/session-modes";
import { SessionSnapshotSchema } from "@/store/session-persistence";
import { ContentBlockSchema, MessageSchema, SessionSchema } from "@/types/domain";
import type { Message, Session } from "@/types/domain";
import type { ChatQuery } from "./persistence-provider";

const SQLITE_URL_PREFIX = "file:";
const SQLITE_ERROR_MESSAGE = {
  OPERATION_TIMED_OUT: "SQLite operation timed out",
} as const;

export class SqliteStore {
  private constructor(private readonly prisma: PrismaClient) {}

  static async create(filePath: string): Promise<SqliteStore> {
    const rawPath = filePath.startsWith(SQLITE_URL_PREFIX)
      ? filePath.slice(SQLITE_URL_PREFIX.length)
      : filePath;
    await mkdir(dirname(rawPath), { recursive: true });

    const databaseUrl = filePath.startsWith(SQLITE_URL_PREFIX)
      ? filePath
      : `${SQLITE_URL_PREFIX}${filePath}`;
    const adapter = new PrismaLibSql({ url: databaseUrl });
    const prisma = new PrismaClient({ adapter });

    await prisma.$connect();
    const store = new SqliteStore(prisma);
    await store.ensureSchema();
    return store;
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async loadSnapshot(): Promise<unknown> {
    const sessions: PrismaSession[] = await this.withStatementTimeout(
      "load sessions",
      async () => await this.prisma.session.findMany()
    );
    const messages: PrismaMessage[] = await this.withStatementTimeout(
      "load messages",
      async () => await this.prisma.message.findMany()
    );

    const messageRecords: Message[] = messages.map((record) =>
      MessageSchema.parse({
        id: record.id,
        sessionId: record.sessionId,
        role: record.role,
        content: JSON.parse(record.content),
        createdAt: Number(record.createdAt),
        isStreaming: record.isStreaming,
      })
    );

    const messagesBySession = new Map<string, Message[]>();
    for (const message of messageRecords) {
      const list = messagesBySession.get(message.sessionId) ?? [];
      list.push(message);
      messagesBySession.set(message.sessionId, list);
    }

    const sessionRecords: Session[] = sessions.map((record) => {
      const metadata = record.metadata ? JSON.parse(record.metadata) : undefined;
      const sessionMessages = messagesBySession.get(record.id) ?? [];
      const messageIds = sessionMessages
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((message) => message.id);

      return SessionSchema.parse({
        id: record.id,
        title: record.title ?? undefined,
        agentId: record.agentId ?? undefined,
        messageIds,
        createdAt: Number(record.createdAt),
        updatedAt: Number(record.updatedAt),
        metadata,
        mode: record.mode ?? undefined,
      });
    });

    const sessionsMap = Object.fromEntries(sessionRecords.map((session) => [session.id, session]));
    const messagesMap = Object.fromEntries(messageRecords.map((message) => [message.id, message]));

    return SessionSnapshotSchema.parse({
      currentSessionId: undefined,
      sessions: sessionsMap,
      messages: messagesMap,
    });
  }

  async saveSnapshot(snapshot: unknown): Promise<void> {
    const parsed = SessionSnapshotSchema.parse(snapshot);
    const sessionEntries = Object.values(parsed.sessions).filter(
      (session): session is Session => session !== undefined
    );
    const messageEntries = Object.values(parsed.messages).filter(
      (message): message is Message => message !== undefined
    );

    const sessions = sessionEntries.map((session) => ({
      id: session.id,
      title: session.title ?? null,
      agentId: session.agentId ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata ? JSON.stringify(session.metadata) : null,
      mode: session.mode ?? SESSION_MODE.AUTO,
    }));

    const messages = messageEntries.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: JSON.stringify(message.content),
      createdAt: message.createdAt,
      isStreaming: message.isStreaming ?? false,
    }));

    await this.withTransactionTimeout(
      "save snapshot",
      async () =>
        await this.prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe("DELETE FROM messages_fts");
            await tx.message.deleteMany();
            await tx.session.deleteMany();

            if (sessions.length > 0) {
              await tx.session.createMany({ data: sessions });
            }
            if (messages.length > 0) {
              await tx.message.createMany({ data: messages });
            }

            for (const message of messageEntries) {
              const contentText = this.extractSearchText(message.content);
              await tx.$executeRaw(
                Prisma.sql`INSERT INTO messages_fts (message_id, session_id, content) VALUES (${message.id}, ${message.sessionId}, ${contentText})`
              );
            }
          },
          {
            maxWait: TIMEOUT.SQLITE_BUSY_MS,
            timeout: TIMEOUT.SQLITE_TRANSACTION_TIMEOUT_MS,
          }
        )
    );
  }

  async searchMessages(query: ChatQuery): Promise<unknown> {
    type FtsRow = { message_id: string };
    let messageIds: string[] | undefined;
    if (query.text) {
      const rows = await this.withStatementTimeout(
        "search fts rows",
        async () =>
          await this.prisma.$queryRaw<FtsRow[]>(
            Prisma.sql`SELECT message_id FROM messages_fts WHERE messages_fts MATCH ${query.text}`
          )
      );
      messageIds = rows.map((row) => row.message_id);
      if (messageIds.length === 0) {
        return [];
      }
    }

    const where: Prisma.MessageWhereInput = {};
    if (messageIds) {
      where.id = { in: messageIds };
    }
    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.dateRange) {
      where.createdAt = {
        gte: query.dateRange.from.getTime(),
        lte: query.dateRange.to.getTime(),
      };
    }

    const results: PrismaMessage[] = await this.withStatementTimeout(
      "search messages",
      async () =>
        await this.prisma.message.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: query.limit ?? LIMIT.DEFAULT_PAGINATION_LIMIT,
          skip: query.offset ?? 0,
        })
    );

    return results.map((record) =>
      MessageSchema.parse({
        id: record.id,
        sessionId: record.sessionId,
        role: record.role,
        content: JSON.parse(record.content),
        createdAt: Number(record.createdAt),
        isStreaming: record.isStreaming,
      })
    );
  }

  async getSessionHistory(sessionId: string): Promise<unknown> {
    const session: PrismaSession | null = await this.withStatementTimeout(
      "load session history session",
      async () =>
        await this.prisma.session.findUnique({
          where: { id: sessionId },
        })
    );
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messages: PrismaMessage[] = await this.withStatementTimeout(
      "load session history messages",
      async () =>
        await this.prisma.message.findMany({
          where: { sessionId },
          orderBy: { createdAt: "asc" },
        })
    );

    const messageRecords: Message[] = messages.map((record) =>
      MessageSchema.parse({
        id: record.id,
        sessionId: record.sessionId,
        role: record.role,
        content: JSON.parse(record.content),
        createdAt: Number(record.createdAt),
        isStreaming: record.isStreaming,
      })
    );

    const metadata = session.metadata ? JSON.parse(session.metadata) : undefined;

    const parsed = SessionSchema.parse({
      id: sessionId,
      title: session.title ?? undefined,
      agentId: session.agentId ?? undefined,
      messageIds: messageRecords.map((message) => message.id),
      createdAt: Number(session.createdAt),
      updatedAt: Number(session.updatedAt),
      metadata,
      mode: session.mode ?? undefined,
    });

    return { ...parsed, messages: messageRecords };
  }

  private extractSearchText(rawContent: unknown): string {
    const parsed = ContentBlockSchema.array().safeParse(rawContent);
    if (!parsed.success) {
      return "";
    }
    return parsed.data
      .map((block) => {
        switch (block.type) {
          case CONTENT_BLOCK_TYPE.TEXT:
          case CONTENT_BLOCK_TYPE.THINKING:
          case CONTENT_BLOCK_TYPE.CODE:
            return block.text;
          case CONTENT_BLOCK_TYPE.TOOL_CALL:
            return block.name ?? "";
          case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
            return `${block.name} ${block.uri}`;
          case CONTENT_BLOCK_TYPE.RESOURCE:
            return "text" in block.resource ? block.resource.text : "";
          default:
            return "";
        }
      })
      .filter((value) => value.length > 0)
      .join(" ");
  }

  private async ensureSchema(): Promise<void> {
    // DDL statements cannot use parameterized values, so we use $executeRawUnsafe
    await this.prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL");
    await this.prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL");
    await this.prisma.$executeRawUnsafe(`PRAGMA busy_timeout = ${TIMEOUT.SQLITE_BUSY_MS}`);
    await this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        agentId TEXT,
        createdAt INTEGER,
        updatedAt INTEGER,
        metadata TEXT,
        mode TEXT DEFAULT '${SESSION_MODE.AUTO}'
      )`
    );
    await this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        isStreaming INTEGER DEFAULT 0
      )`
    );
    await this.prisma.$executeRawUnsafe(
      "CREATE INDEX IF NOT EXISTS messages_sessionId_idx ON messages(sessionId)"
    );
    await this.prisma.$executeRawUnsafe(
      "CREATE INDEX IF NOT EXISTS messages_createdAt_idx ON messages(createdAt)"
    );
    await this.prisma.$executeRawUnsafe(
      "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(message_id, session_id, content)"
    );
  }

  private async withStatementTimeout<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return await this.withTimeout(operationName, TIMEOUT.SQLITE_STATEMENT_TIMEOUT_MS, operation);
  }

  private async withTransactionTimeout<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return await this.withTimeout(operationName, TIMEOUT.SQLITE_TRANSACTION_TIMEOUT_MS, operation);
  }

  private async withTimeout<T>(
    operationName: string,
    timeoutMs: number,
    operation: () => Promise<T>
  ): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(
          new Error(
            `${SQLITE_ERROR_MESSAGE.OPERATION_TIMED_OUT}: ${operationName} (${timeoutMs}ms)`
          )
        );
      }, timeoutMs);

      timeout.unref();
      void operation()
        .then((result) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}

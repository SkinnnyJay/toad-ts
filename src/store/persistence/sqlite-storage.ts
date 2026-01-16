import {
  DataTypes,
  type Model,
  type ModelStatic,
  Op,
  QueryTypes,
  Sequelize,
  type Transaction,
} from "sequelize";

import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { PERSISTENCE_PROVIDER } from "@/constants/persistence-providers";
import { SESSION_MODE } from "@/constants/session-modes";
import { SessionSnapshotSchema } from "@/store/session-persistence";
import { ContentBlockSchema, MessageSchema, SessionSchema } from "@/types/domain";
import type { Message, Session } from "@/types/domain";
import type { ChatQuery } from "./persistence-provider";

interface SessionRow {
  id: string;
  title: string | null;
  agentId: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: string | null;
  mode: string | null;
}

interface MessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: number;
  isStreaming: boolean | number;
}

export class SqliteStore {
  private constructor(
    private readonly sequelize: Sequelize,
    private readonly SessionModel: ModelStatic<Model>,
    private readonly MessageModel: ModelStatic<Model>
  ) {}

  static async create(filePath: string): Promise<SqliteStore> {
    const sequelize = new Sequelize({
      dialect: PERSISTENCE_PROVIDER.SQLITE,
      storage: filePath,
      logging: false,
    });

    const SessionModel = sequelize.define(
      "Session",
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        title: DataTypes.STRING,
        agentId: DataTypes.STRING,
        createdAt: DataTypes.INTEGER,
        updatedAt: DataTypes.INTEGER,
        metadata: DataTypes.TEXT,
        mode: {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: "auto",
        },
      },
      {
        tableName: "sessions",
        timestamps: false,
      }
    );

    const MessageModel = sequelize.define(
      "Message",
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        sessionId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        isStreaming: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
      },
      {
        tableName: "messages",
        timestamps: false,
      }
    );

    await sequelize.authenticate();
    await sequelize.sync();
    await sequelize.query("PRAGMA journal_mode = WAL");
    await sequelize.query("PRAGMA synchronous = NORMAL");
    await sequelize.query(`PRAGMA busy_timeout = ${TIMEOUT.SQLITE_BUSY_MS}`);

    await sequelize.query(
      "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(message_id, session_id, content)"
    );

    return new SqliteStore(sequelize, SessionModel, MessageModel);
  }

  async close(): Promise<void> {
    await this.sequelize.close();
  }

  async loadSnapshot(): Promise<unknown> {
    const sessions = (await this.SessionModel.findAll()) as Model[];
    const messages = (await this.MessageModel.findAll()) as Model[];

    const messageRecords: Message[] = messages.map((message) => {
      const record = message.toJSON() as MessageRow;
      const content = JSON.parse(record.content);
      return MessageSchema.parse({
        id: record.id,
        sessionId: record.sessionId,
        role: record.role,
        content,
        createdAt: Number(record.createdAt),
        isStreaming: Boolean(record.isStreaming),
      });
    });

    const messagesBySession = new Map<string, Message[]>();
    for (const message of messageRecords) {
      const list = messagesBySession.get(message.sessionId) ?? [];
      list.push(message);
      messagesBySession.set(message.sessionId, list);
    }

    const sessionRecords: Session[] = sessions.map((session) => {
      const record = session.toJSON() as SessionRow;
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
    const sessionEntries = Object.values(parsed.sessions) as Session[];
    const messageEntries = Object.values(parsed.messages) as Message[];

    await this.sequelize.transaction(async (transaction: Transaction) => {
      await this.sequelize.query("DELETE FROM messages_fts", { transaction });
      await this.MessageModel.destroy({ where: {}, truncate: true, transaction });
      await this.SessionModel.destroy({ where: {}, truncate: true, transaction });

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

      if (sessions.length > 0) {
        await this.SessionModel.bulkCreate(sessions, { transaction });
      }
      if (messages.length > 0) {
        await this.MessageModel.bulkCreate(messages, { transaction });
      }

      for (const message of messageEntries) {
        const contentText = this.extractSearchText(message.content);
        await this.sequelize.query(
          "INSERT INTO messages_fts (message_id, session_id, content) VALUES (?, ?, ?)",
          {
            replacements: [message.id, message.sessionId, contentText],
            transaction,
          }
        );
      }
    });
  }

  async searchMessages(query: ChatQuery): Promise<unknown> {
    let messageIds: string[] | null = null;
    if (query.text) {
      const rows = await this.sequelize.query<{ message_id: string }>(
        "SELECT message_id FROM messages_fts WHERE messages_fts MATCH ?",
        {
          replacements: [query.text],
          type: QueryTypes.SELECT,
        }
      );
      messageIds = rows.map((row) => row.message_id);
      if (!messageIds || messageIds.length === 0) {
        return [];
      }
    }

    const where: Record<string, unknown> = {};
    if (messageIds) {
      where.id = { [Op.in]: messageIds };
    }
    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.dateRange) {
      where.createdAt = {
        [Op.between]: [query.dateRange.from.getTime(), query.dateRange.to.getTime()],
      };
    }

    const results = (await this.MessageModel.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: query.limit ?? LIMIT.DEFAULT_PAGINATION_LIMIT,
      offset: query.offset ?? 0,
    })) as Model[];

    return results.map((message) => {
      const record = message.toJSON() as MessageRow;
      return MessageSchema.parse({
        id: record.id,
        sessionId: record.sessionId,
        role: record.role,
        content: JSON.parse(record.content),
        createdAt: Number(record.createdAt),
        isStreaming: Boolean(record.isStreaming),
      });
    });
  }

  async getSessionHistory(sessionId: string): Promise<unknown> {
    const session = (await this.SessionModel.findByPk(sessionId)) as Model | null;
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messages = (await this.MessageModel.findAll({
      where: { sessionId },
      order: [["createdAt", "ASC"]],
    })) as Model[];

    const messageRecords: Message[] = messages.map((message) => {
      const record = message.toJSON() as MessageRow;
      return MessageSchema.parse({
        id: record.id,
        sessionId: record.sessionId,
        role: record.role,
        content: JSON.parse(record.content),
        createdAt: Number(record.createdAt),
        isStreaming: Boolean(record.isStreaming),
      });
    });

    const sessionRecord = session.toJSON() as SessionRow;
    const metadata = sessionRecord.metadata ? JSON.parse(sessionRecord.metadata) : undefined;

    const parsed = SessionSchema.parse({
      id: sessionId,
      title: sessionRecord.title ?? undefined,
      agentId: sessionRecord.agentId ?? undefined,
      messageIds: messageRecords.map((message) => message.id),
      createdAt: Number(sessionRecord.createdAt),
      updatedAt: Number(sessionRecord.updatedAt),
      metadata,
      mode: sessionRecord.mode ?? undefined,
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
}

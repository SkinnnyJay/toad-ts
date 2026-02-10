import { LIMIT } from "@/config/limits";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { AppStore } from "@/store/app-store";
import type { Message, MessageId, Session, SessionId } from "@/types/domain";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";

const logger = createClassLogger("SessionForking");

export interface ForkOptions {
  /** Session to fork from */
  sourceSessionId: SessionId;
  /** Fork from this message (inclusive). If not provided, forks the entire session. */
  atMessageId?: MessageId;
  /** Title for the forked session */
  title?: string;
}

export interface ForkResult {
  forkedSessionId: SessionId;
  messageCount: number;
}

export const forkSession = (store: StoreApi<AppStore>, options: ForkOptions): ForkResult => {
  const state = store.getState();
  const sourceSession = state.getSession(options.sourceSessionId);
  if (!sourceSession) {
    throw new Error(`Source session not found: ${options.sourceSessionId}`);
  }

  const messages = state.getMessagesForSession(options.sourceSessionId);
  let forkedMessages: Message[];

  if (options.atMessageId) {
    const cutIndex = messages.findIndex((message) => message.id === options.atMessageId);
    if (cutIndex < 0) {
      throw new Error(`Message not found: ${options.atMessageId}`);
    }
    // Include the target message and all before it
    forkedMessages = messages.slice(0, cutIndex + 1);
  } else {
    forkedMessages = [...messages];
  }

  const forkedSessionId = SessionIdSchema.parse(`fork-${nanoid(LIMIT.NANOID_LENGTH)}`);
  const now = Date.now();

  // Create new message IDs for the forked session
  const newMessages: Message[] = forkedMessages.map((message) => ({
    ...message,
    id: MessageIdSchema.parse(`msg-${nanoid(LIMIT.NANOID_LENGTH)}`),
    sessionId: forkedSessionId,
  }));

  const forkedSession: Session = {
    id: forkedSessionId,
    title: options.title ?? `Fork of ${sourceSession.title ?? sourceSession.id}`,
    agentId: sourceSession.agentId,
    messageIds: newMessages.map((message) => message.id),
    createdAt: now,
    updatedAt: now,
    mode: sourceSession.mode,
    metadata: {
      ...(sourceSession.metadata ?? {}),
      parentSessionId: options.sourceSessionId,
    },
  };

  state.upsertSession({ session: forkedSession });
  for (const message of newMessages) {
    state.appendMessage(message);
  }

  logger.info("Forked session", {
    source: options.sourceSessionId,
    forked: forkedSessionId,
    messages: newMessages.length,
  });

  return { forkedSessionId, messageCount: newMessages.length };
};

export interface SessionDiffEntry {
  messageId: MessageId;
  filePath: string;
  changeType: "created" | "modified" | "deleted";
}

export const getSessionDiff = (
  store: StoreApi<AppStore>,
  sessionId: SessionId
): SessionDiffEntry[] => {
  const state = store.getState();
  const messages = state.getMessagesForSession(sessionId);
  const diffs: SessionDiffEntry[] = [];

  for (const message of messages) {
    if (message.role !== MESSAGE_ROLE.ASSISTANT) continue;
    for (const block of message.content) {
      if (block.type !== CONTENT_BLOCK_TYPE.TOOL_CALL) continue;
      const name = block.name?.toLowerCase() ?? "";
      if (name === "write" || name === "edit" || name === "patch") {
        const args = block.arguments;
        const filePath =
          typeof args === "object" && args !== null
            ? (((args as Record<string, unknown>).path as string) ??
              ((args as Record<string, unknown>).file_path as string) ??
              "unknown")
            : "unknown";
        const changeType = name === "write" ? "created" : "modified";
        diffs.push({ messageId: message.id, filePath, changeType });
      }
    }
  }

  return diffs;
};

export const findSessionByNameOrId = (
  store: StoreApi<AppStore>,
  query: string
): Session | undefined => {
  const state = store.getState();
  const sessions = Object.values(state.sessions).filter(
    (session): session is Session => session !== undefined
  );

  // Exact ID match
  const byId = sessions.find((session) => session.id === query);
  if (byId) return byId;

  // Partial ID match
  const byPartialId = sessions.find((session) => session.id.startsWith(query));
  if (byPartialId) return byPartialId;

  // Title match (case-insensitive)
  const lowerQuery = query.toLowerCase();
  return sessions.find((session) => session.title?.toLowerCase().includes(lowerQuery));
};

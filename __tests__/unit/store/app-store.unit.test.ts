import { LIMIT } from "@/config/limits";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { describe, expect, it } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

describe("app-store", () => {
  it("adds session and appends messages", () => {
    const sessionId = SessionIdSchema.parse("s-1");
    const messageId = MessageIdSchema.parse("m-1");
    const store = useAppStore.getState();

    store.reset();

    store.upsertSession({
      session: {
        id: sessionId,
        title: "Test",
        agentId: AgentIdSchema.parse("agent-1"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    store.appendMessage({
      id: messageId,
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hi" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    const messages = store.getMessagesForSession(sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe(messageId);
  });

  it("clears messages for a session", () => {
    const sessionId = SessionIdSchema.parse("s-2");
    const messageId = MessageIdSchema.parse("m-2");
    const store = useAppStore.getState();

    store.reset();
    store.upsertSession({
      session: {
        id: sessionId,
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });
    store.appendMessage({
      id: messageId,
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hi" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    expect(store.getMessagesForSession(sessionId)).toHaveLength(1);
    store.clearMessagesForSession(sessionId);
    expect(store.getMessagesForSession(sessionId)).toHaveLength(0);
  });

  it("caps in-memory messages per session and evicts oldest entries", () => {
    const sessionId = SessionIdSchema.parse("s-cap");
    const store = useAppStore.getState();
    store.reset();
    store.upsertSession({
      session: {
        id: sessionId,
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    const totalMessages = LIMIT.SESSION_MESSAGES_MAX_IN_MEMORY + 1;
    for (let index = 0; index < totalMessages; index += 1) {
      store.appendMessage({
        id: MessageIdSchema.parse(`m-cap-${index}`),
        sessionId,
        role: "user",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: `msg-${index}` }],
        createdAt: index,
        isStreaming: false,
      });
    }

    const session = store.getSession(sessionId);
    const messages = store.getMessagesForSession(sessionId);
    expect(session?.messageIds).toHaveLength(LIMIT.SESSION_MESSAGES_MAX_IN_MEMORY);
    expect(messages).toHaveLength(LIMIT.SESSION_MESSAGES_MAX_IN_MEMORY);
    expect(messages[0]?.id).toBe(MessageIdSchema.parse("m-cap-1"));
    expect(messages.at(-1)?.id).toBe(MessageIdSchema.parse(`m-cap-${totalMessages - 1}`));
    expect(store.getMessage(MessageIdSchema.parse("m-cap-0"))).toBeUndefined();
  });

  it("does not evict messages from other sessions when capping a session", () => {
    const cappedSessionId = SessionIdSchema.parse("s-cap-2");
    const otherSessionId = SessionIdSchema.parse("s-other");
    const otherMessageId = MessageIdSchema.parse("m-other");
    const store = useAppStore.getState();
    store.reset();
    store.upsertSession({
      session: {
        id: cappedSessionId,
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });
    store.upsertSession({
      session: {
        id: otherSessionId,
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    store.appendMessage({
      id: otherMessageId,
      sessionId: otherSessionId,
      role: "assistant",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "other-session" }],
      createdAt: 0,
      isStreaming: false,
    });

    const totalMessages = LIMIT.SESSION_MESSAGES_MAX_IN_MEMORY + 1;
    for (let index = 0; index < totalMessages; index += 1) {
      store.appendMessage({
        id: MessageIdSchema.parse(`m-cap-other-${index}`),
        sessionId: cappedSessionId,
        role: "user",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: `msg-${index}` }],
        createdAt: index,
        isStreaming: false,
      });
    }

    expect(store.getMessage(otherMessageId)?.sessionId).toBe(otherSessionId);
    expect(store.getMessagesForSession(otherSessionId)).toHaveLength(1);
  });
});

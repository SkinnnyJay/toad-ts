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
});

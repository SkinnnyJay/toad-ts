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
      content: [{ type: "text", text: "hi" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    const messages = store.getMessagesForSession(sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe(messageId);
  });
});

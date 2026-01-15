import { describe, expect, it } from "vitest";
import { MessageHandler } from "../../../src/core/message-handler";
import { useAppStore } from "../../../src/store/app-store";
import {
  AgentIdSchema,
  MessageIdSchema,
  SessionIdSchema,
  ToolCallIdSchema,
} from "../../../src/types/domain";

describe("ACP to store integration", () => {
  it("applies handler output into store", () => {
    const sessionId = SessionIdSchema.parse("s-int");
    const messageId = MessageIdSchema.parse("m-int");
    const store = useAppStore.getState();
    store.reset();
    store.upsertSession({
      session: {
        id: sessionId,
        agentId: AgentIdSchema.parse("agent-int"),
        messageIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    });

    const handler = new MessageHandler();
    handler.on("block", ({ sessionId: sId, messageId: mId, block }) => {
      useAppStore.getState().appendMessage({
        id: mId,
        sessionId: sId,
        role: "assistant",
        content: [block],
        createdAt: Date.now(),
        isStreaming: false,
      });
    });

    handler.handle({
      sessionId,
      messageId,
      role: "assistant",
      content: {
        type: "tool_call",
        toolCallId: ToolCallIdSchema.parse("t-int"),
        name: "run",
        status: "running",
      },
    });

    const messages = useAppStore.getState().getMessagesForSession(sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content[0]).toMatchObject({ type: "tool_call", name: "run" });
  });
});

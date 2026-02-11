import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { findSessionByNameOrId, forkSession, getSessionDiff } from "@/core/session-forking";
import { useAppStore } from "@/store/app-store";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import type { Message, Session } from "@/types/domain";
import { beforeEach, describe, expect, it } from "vitest";

const createSession = (id: string, title?: string): Session => ({
  id: SessionIdSchema.parse(id),
  title,
  agentId: "agent-1",
  messageIds: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  mode: "auto",
});

const createMessage = (id: string, sessionId: string, text: string): Message => ({
  id: MessageIdSchema.parse(id),
  sessionId: SessionIdSchema.parse(sessionId),
  role: MESSAGE_ROLE.USER,
  content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
  createdAt: Date.now(),
  isStreaming: false,
});

describe("SessionForking", () => {
  beforeEach(() => {
    useAppStore.setState({
      sessions: {},
      messages: {},
      plans: {},
      currentSessionId: undefined,
      connectionStatus: "disconnected",
    });
  });

  describe("forkSession", () => {
    it("should fork a session with all messages", () => {
      const session = createSession("src-session", "Original");
      const msg1 = createMessage("msg-1", "src-session", "Hello");
      const msg2 = createMessage("msg-2", "src-session", "World");
      session.messageIds = [msg1.id, msg2.id];

      useAppStore.setState({
        sessions: { [session.id]: session },
        messages: { [msg1.id]: msg1, [msg2.id]: msg2 },
      });

      const result = forkSession(useAppStore, {
        sourceSessionId: SessionIdSchema.parse("src-session"),
        title: "Forked",
      });

      expect(result.forkedSessionId).toBeDefined();
      expect(result.messageCount).toBe(2);

      const forkedSession = useAppStore.getState().getSession(result.forkedSessionId);
      expect(forkedSession?.title).toBe("Forked");
    });
  });

  describe("findSessionByNameOrId", () => {
    it("should find session by exact ID", () => {
      const session = createSession("test-abc", "Test Session");
      useAppStore.setState({ sessions: { [session.id]: session } });

      const found = findSessionByNameOrId(useAppStore, "test-abc");
      expect(found?.id).toBe("test-abc");
    });

    it("should find session by title", () => {
      const session = createSession("test-xyz", "My Project");
      useAppStore.setState({ sessions: { [session.id]: session } });

      const found = findSessionByNameOrId(useAppStore, "project");
      expect(found?.id).toBe("test-xyz");
    });
  });
});

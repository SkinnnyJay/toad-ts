import { DAY_MS, STALE_SESSION_TTL_DAYS } from "@/config/limits";
import { checkIntegrity } from "@/store/persistence/integrity-check";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import type { Message, Session } from "@/types/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createSession = (id: string, updatedAt: number, messageIds: string[]): Session => ({
  id: SessionIdSchema.parse(id),
  agentId: "agent-1",
  messageIds: messageIds.map((messageId) => MessageIdSchema.parse(messageId)),
  createdAt: updatedAt,
  updatedAt,
  mode: "auto",
});

const createMessage = (id: string, sessionId: string, createdAt: number): Message => ({
  id: MessageIdSchema.parse(id),
  sessionId: SessionIdSchema.parse(sessionId),
  role: "assistant",
  content: [{ type: "text", text: "message" }],
  createdAt,
  isStreaming: false,
});

describe("checkIntegrity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-13T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports missing messages, orphan messages, and stale sessions", () => {
    const now = Date.now();
    const sessions: Record<string, Session | undefined> = {
      "session-missing": createSession("session-missing", now, ["missing-message"]),
      "session-stale": createSession(
        "session-stale",
        now - (STALE_SESSION_TTL_DAYS * DAY_MS + 1),
        []
      ),
    };
    const messages: Record<string, Message | undefined> = {
      "orphan-message": createMessage("orphan-message", "missing-session", now),
    };

    const report = checkIntegrity(sessions, messages);

    expect(report.healthy).toBe(false);
    expect(report.sessionsChecked).toBe(2);
    expect(report.messagesChecked).toBe(1);
    expect(report.issues.map((issue) => issue.type)).toEqual(
      expect.arrayContaining(["missing_message", "stale_session", "orphan_message"])
    );
  });

  it("returns healthy report when session/message references are consistent", () => {
    const now = Date.now();
    const sessions: Record<string, Session | undefined> = {
      "session-1": createSession("session-1", now, ["message-1"]),
    };
    const messages: Record<string, Message | undefined> = {
      "message-1": createMessage("message-1", "session-1", now),
    };

    const report = checkIntegrity(sessions, messages);

    expect(report.healthy).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.sessionsChecked).toBe(1);
    expect(report.messagesChecked).toBe(1);
  });
});

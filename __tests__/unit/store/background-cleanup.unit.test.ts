import { BACKGROUND_CLEANUP_INTERVAL_MS } from "@/config/limits";
import {
  type SessionProvider,
  runCleanup,
  startBackgroundCleanup,
} from "@/store/persistence/background-cleanup";
import { SessionIdSchema } from "@/types/domain";
import type { Session, SessionId } from "@/types/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createSession = (id: string, updatedAt: number): Session => ({
  id: SessionIdSchema.parse(id),
  agentId: "agent-1",
  messageIds: [],
  createdAt: updatedAt,
  updatedAt,
  mode: "auto",
});

const createProvider = (
  sessions: Session[],
  onDelete?: (sessionId: SessionId) => void
): SessionProvider => ({
  listSessions: () => sessions,
  deleteSession: (sessionId) => {
    onDelete?.(sessionId);
  },
});

describe("background-cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-13T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runCleanup removes sessions selected by retention policy", () => {
    const now = Date.now();
    const sessions = [createSession("session-new", now), createSession("session-old", now - 1000)];
    const deleteSession = vi.fn<(sessionId: SessionId) => void>();
    const provider = createProvider(sessions, deleteSession);

    const result = runCleanup(provider, {
      maxSessions: 1,
      maxBytes: 0,
      ttlDays: 0,
    });

    expect(result.removedCount).toBe(1);
    expect(result.removedSessionIds).toEqual([SessionIdSchema.parse("session-old")]);
    expect(deleteSession).toHaveBeenCalledTimes(1);
    expect(deleteSession).toHaveBeenCalledWith(SessionIdSchema.parse("session-old"));
  });

  it("startBackgroundCleanup runs immediately and on interval until cancelled", () => {
    const now = Date.now();
    const sessions = [createSession("session-new", now), createSession("session-old", now - 1000)];
    const deleteSession = vi.fn<(sessionId: SessionId) => void>();
    const provider = createProvider(sessions, deleteSession);

    const stop = startBackgroundCleanup(
      provider,
      {
        maxSessions: 1,
        maxBytes: 0,
        ttlDays: 0,
      },
      BACKGROUND_CLEANUP_INTERVAL_MS
    );

    expect(deleteSession).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(BACKGROUND_CLEANUP_INTERVAL_MS);
    expect(deleteSession).toHaveBeenCalledTimes(2);

    stop();
    vi.advanceTimersByTime(BACKGROUND_CLEANUP_INTERVAL_MS);
    expect(deleteSession).toHaveBeenCalledTimes(2);
  });
});

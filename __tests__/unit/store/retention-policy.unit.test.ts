import { LIMIT } from "@/config/limits";
import { applyRetentionPolicy } from "@/store/persistence/retention-policy";
import { SessionIdSchema } from "@/types/domain";
import type { Session } from "@/types/domain";
import { describe, expect, it } from "vitest";

const createSession = (id: string, updatedAt: number): Session => ({
  id: SessionIdSchema.parse(id),
  agentId: "agent-1",
  messageIds: [],
  createdAt: updatedAt,
  updatedAt,
  mode: "auto",
});

describe("RetentionPolicy", () => {
  it("should not remove sessions within TTL", () => {
    const now = Date.now();
    const sessions = [createSession("s-1", now - 1000)];
    const result = applyRetentionPolicy(
      sessions,
      { maxSessions: 100, maxBytes: 0, ttlDays: 90 },
      now
    );
    expect(result.removedCount).toBe(0);
  });

  it("should remove sessions past TTL", () => {
    const now = Date.now();
    const oldTime = now - 91 * LIMIT.DAY_MS;
    const sessions = [createSession("s-old", oldTime), createSession("s-new", now - 1000)];
    const result = applyRetentionPolicy(
      sessions,
      { maxSessions: 100, maxBytes: 0, ttlDays: 90 },
      now
    );
    expect(result.removedCount).toBe(1);
    expect(result.removedSessionIds).toContain("s-old");
  });

  it("should enforce max sessions limit", () => {
    const now = Date.now();
    const sessions = Array.from({ length: 5 }, (_, i) => createSession(`s-${i}`, now - i * 1000));
    const result = applyRetentionPolicy(sessions, { maxSessions: 3, maxBytes: 0, ttlDays: 0 }, now);
    expect(result.removedCount).toBe(2);
  });

  it("should keep newest sessions when enforcing max", () => {
    const now = Date.now();
    const sessions = [
      createSession("newest", now),
      createSession("middle", now - 10000),
      createSession("oldest", now - 20000),
    ];
    const result = applyRetentionPolicy(sessions, { maxSessions: 2, maxBytes: 0, ttlDays: 0 }, now);
    expect(result.removedSessionIds).toContain("oldest");
    expect(result.removedSessionIds).not.toContain("newest");
  });
});

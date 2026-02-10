import { LIMIT } from "@/config/limits";
import type { Session, SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("RetentionPolicy");

export interface RetentionConfig {
  /** Maximum number of sessions to keep */
  maxSessions: number;
  /** Maximum storage size in bytes (0 = unlimited) */
  maxBytes: number;
  /** Maximum age of sessions in days (0 = unlimited) */
  ttlDays: number;
}

export const DEFAULT_RETENTION: RetentionConfig = {
  maxSessions: 500,
  maxBytes: 0,
  ttlDays: 90,
};

export interface RetentionResult {
  removedSessionIds: SessionId[];
  removedCount: number;
}

/**
 * Determine which sessions should be removed based on retention policy.
 * Does NOT perform actual removal — returns a list of session IDs to remove.
 */
export const applyRetentionPolicy = (
  sessions: Session[],
  config: RetentionConfig = DEFAULT_RETENTION,
  now: number = Date.now()
): RetentionResult => {
  const removedSessionIds: SessionId[] = [];

  // Sort by updatedAt descending (newest first)
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  // TTL enforcement
  if (config.ttlDays > 0) {
    const ttlMs = config.ttlDays * LIMIT.DAY_MS;
    for (const session of sorted) {
      if (now - session.updatedAt > ttlMs) {
        removedSessionIds.push(session.id);
      }
    }
  }

  // Max sessions enforcement
  if (config.maxSessions > 0) {
    const remaining = sorted.filter((session) => !removedSessionIds.includes(session.id));
    if (remaining.length > config.maxSessions) {
      const excess = remaining.slice(config.maxSessions);
      for (const session of excess) {
        if (!removedSessionIds.includes(session.id)) {
          removedSessionIds.push(session.id);
        }
      }
    }
  }

  if (removedSessionIds.length > 0) {
    logger.info("Retention policy applied", {
      removed: removedSessionIds.length,
      remaining: sessions.length - removedSessionIds.length,
    });
  }

  return { removedSessionIds, removedCount: removedSessionIds.length };
};

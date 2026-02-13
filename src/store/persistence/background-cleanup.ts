import { BACKGROUND_CLEANUP_INTERVAL_MS } from "@/config/limits";
import type { Session, SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { DEFAULT_RETENTION, type RetentionConfig, applyRetentionPolicy } from "./retention-policy";

const logger = createClassLogger("BackgroundCleanup");

export interface CleanupResult {
  removedCount: number;
  removedSessionIds: SessionId[];
}

export type SessionProvider = {
  listSessions: () => Session[];
  deleteSession: (sessionId: SessionId) => void;
};

/**
 * Run a one-time cleanup pass against sessions using the retention policy.
 */
export const runCleanup = (
  provider: SessionProvider,
  config: RetentionConfig = DEFAULT_RETENTION
): CleanupResult => {
  const sessions = provider.listSessions();
  const { removedSessionIds } = applyRetentionPolicy(sessions, config);

  for (const sessionId of removedSessionIds) {
    try {
      provider.deleteSession(sessionId);
    } catch (error) {
      logger.warn("Failed to delete session during cleanup", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (removedSessionIds.length > 0) {
    logger.info("Background cleanup completed", { removed: removedSessionIds.length });
  }

  return { removedCount: removedSessionIds.length, removedSessionIds };
};

/**
 * Start a background cleanup job that runs on an interval.
 * Returns a cancel function to stop the job.
 */
export const startBackgroundCleanup = (
  provider: SessionProvider,
  config: RetentionConfig = DEFAULT_RETENTION,
  intervalMs: number = BACKGROUND_CLEANUP_INTERVAL_MS
): (() => void) => {
  // Run immediately on start
  runCleanup(provider, config);

  const timer = setInterval(() => {
    runCleanup(provider, config);
  }, intervalMs);

  // Don't prevent process exit
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  return () => clearInterval(timer);
};

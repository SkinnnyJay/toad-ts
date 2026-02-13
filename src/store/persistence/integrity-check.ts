import { DAY_MS, STALE_SESSION_TTL_DAYS } from "@/config/limits";
import type { Message, Session, SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("IntegrityCheck");

export interface IntegrityIssue {
  type: "orphan_message" | "missing_message" | "stale_session" | "invalid_data";
  sessionId?: SessionId;
  messageId?: string;
  description: string;
}

export interface IntegrityReport {
  issues: IntegrityIssue[];
  sessionsChecked: number;
  messagesChecked: number;
  healthy: boolean;
}

/**
 * Run integrity checks on session and message data.
 * Identifies orphan messages, missing references, and stale sessions.
 */
export const checkIntegrity = (
  sessions: Record<string, Session | undefined>,
  messages: Record<string, Message | undefined>
): IntegrityReport => {
  const issues: IntegrityIssue[] = [];
  let sessionsChecked = 0;
  let messagesChecked = 0;

  const sessionIds = new Set<string>();
  for (const [id, session] of Object.entries(sessions)) {
    if (!session) continue;
    sessionsChecked++;
    sessionIds.add(id);

    // Check for messages referenced by session but not in store
    for (const messageId of session.messageIds) {
      if (!messages[messageId]) {
        issues.push({
          type: "missing_message",
          sessionId: session.id,
          messageId,
          description: `Session ${session.id} references message ${messageId} which doesn't exist`,
        });
      }
    }

    // Check for stale sessions (no messages, very old)
    if (
      session.messageIds.length === 0 &&
      Date.now() - session.updatedAt > STALE_SESSION_TTL_DAYS * DAY_MS
    ) {
      issues.push({
        type: "stale_session",
        sessionId: session.id,
        description: `Session ${session.id} has no messages and hasn't been updated in ${
          STALE_SESSION_TTL_DAYS
        }+ days`,
      });
    }
  }

  // Check for orphan messages (messages not belonging to any session)
  for (const [id, message] of Object.entries(messages)) {
    if (!message) continue;
    messagesChecked++;
    if (!sessionIds.has(message.sessionId)) {
      issues.push({
        type: "orphan_message",
        messageId: id,
        sessionId: message.sessionId,
        description: `Message ${id} belongs to session ${message.sessionId} which doesn't exist`,
      });
    }
  }

  if (issues.length > 0) {
    logger.warn("Integrity issues found", { count: issues.length });
  } else {
    logger.info("Integrity check passed", { sessions: sessionsChecked, messages: messagesChecked });
  }

  return {
    issues,
    sessionsChecked,
    messagesChecked,
    healthy: issues.length === 0,
  };
};

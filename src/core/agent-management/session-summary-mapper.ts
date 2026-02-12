import {
  pickPreferredCreatedAt,
  pickPreferredMessageCount,
  pickPreferredTitle,
} from "@/core/agent-management/session-merge-utils";
import type { AgentManagementSession } from "@/types/agent-management.types";
import type { CliAgentSession } from "@/types/cli-agent.types";

const toNormalizedOptionalString = (value: string | undefined): string | undefined => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return undefined;
  }
  return trimmedValue;
};

export const toAgentManagementSession = (session: CliAgentSession): AgentManagementSession => {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    model: toNormalizedOptionalString(session.model),
    messageCount: session.messageCount,
  };
};

export const toAgentManagementSessions = (
  sessions: CliAgentSession[]
): AgentManagementSession[] => {
  return sessions.map((session) => toAgentManagementSession(session));
};

const mergeAgentManagementSessions = (
  existing: AgentManagementSession,
  incoming: AgentManagementSession
): AgentManagementSession => {
  const existingModel = toNormalizedOptionalString(existing.model);
  const incomingModel = toNormalizedOptionalString(incoming.model);
  return {
    id: existing.id,
    title: pickPreferredTitle(existing.title, incoming.title),
    createdAt: pickPreferredCreatedAt(existing.createdAt, incoming.createdAt),
    model: existingModel ?? incomingModel,
    messageCount: pickPreferredMessageCount(existing.messageCount, incoming.messageCount),
  };
};

export const toUniqueAgentManagementSessions = (
  sessions: AgentManagementSession[]
): AgentManagementSession[] => {
  const sessionsById = new Map<AgentManagementSession["id"], AgentManagementSession>();
  for (const session of sessions) {
    const sessionId = session.id.trim();
    if (sessionId.length === 0) {
      continue;
    }
    const normalizedSession: AgentManagementSession = {
      id: sessionId,
      title: session.title,
      createdAt: session.createdAt,
      model: toNormalizedOptionalString(session.model),
      messageCount: session.messageCount,
    };
    const existing = sessionsById.get(sessionId);
    if (!existing) {
      sessionsById.set(sessionId, normalizedSession);
      continue;
    }
    sessionsById.set(sessionId, mergeAgentManagementSessions(existing, normalizedSession));
  }
  return Array.from(sessionsById.values());
};

export const sortAgentManagementSessionsByRecency = (
  sessions: AgentManagementSession[]
): AgentManagementSession[] => {
  return sessions
    .map((session, index) => ({
      session,
      index,
      createdTimestamp: session.createdAt
        ? Date.parse(session.createdAt)
        : Number.NEGATIVE_INFINITY,
    }))
    .sort((left, right) => {
      const normalizedLeft = Number.isNaN(left.createdTimestamp)
        ? Number.NEGATIVE_INFINITY
        : left.createdTimestamp;
      const normalizedRight = Number.isNaN(right.createdTimestamp)
        ? Number.NEGATIVE_INFINITY
        : right.createdTimestamp;
      if (normalizedRight !== normalizedLeft) {
        return normalizedRight - normalizedLeft;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.session);
};

export const toNormalizedAgentManagementSessions = (
  sessions: AgentManagementSession[]
): AgentManagementSession[] => {
  return sortAgentManagementSessionsByRecency(toUniqueAgentManagementSessions(sessions));
};

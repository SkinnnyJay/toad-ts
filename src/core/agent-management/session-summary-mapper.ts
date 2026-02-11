import type { AgentManagementSession } from "@/types/agent-management.types";
import type { CliAgentSession } from "@/types/cli-agent.types";

export const toAgentManagementSession = (session: CliAgentSession): AgentManagementSession => {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    model: session.model,
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
  const resolveTitle = (): string | undefined => {
    if (!existing.title) {
      return incoming.title;
    }
    if (!incoming.title) {
      return existing.title;
    }
    return incoming.title.length > existing.title.length ? incoming.title : existing.title;
  };
  const resolveCreatedAt = (): string | undefined => {
    if (!existing.createdAt) {
      return incoming.createdAt;
    }
    if (!incoming.createdAt) {
      return existing.createdAt;
    }
    const existingTimestamp = Date.parse(existing.createdAt);
    const incomingTimestamp = Date.parse(incoming.createdAt);
    if (Number.isNaN(existingTimestamp)) {
      return incoming.createdAt;
    }
    if (Number.isNaN(incomingTimestamp)) {
      return existing.createdAt;
    }
    return incomingTimestamp > existingTimestamp ? incoming.createdAt : existing.createdAt;
  };
  const resolveMessageCount = (): number | undefined => {
    if (existing.messageCount === undefined) {
      return incoming.messageCount;
    }
    if (incoming.messageCount === undefined) {
      return existing.messageCount;
    }
    return Math.max(existing.messageCount, incoming.messageCount);
  };
  return {
    id: existing.id,
    title: resolveTitle(),
    createdAt: resolveCreatedAt(),
    model: existing.model ?? incoming.model,
    messageCount: resolveMessageCount(),
  };
};

export const toUniqueAgentManagementSessions = (
  sessions: AgentManagementSession[]
): AgentManagementSession[] => {
  const sessionsById = new Map<AgentManagementSession["id"], AgentManagementSession>();
  for (const session of sessions) {
    if (session.id.length === 0) {
      continue;
    }
    const existing = sessionsById.get(session.id);
    if (!existing) {
      sessionsById.set(session.id, session);
      continue;
    }
    sessionsById.set(session.id, mergeAgentManagementSessions(existing, session));
  }
  return Array.from(sessionsById.values());
};

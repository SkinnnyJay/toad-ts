import {
  pickPreferredCreatedAt,
  pickPreferredMessageCount,
  pickPreferredTitle,
} from "@/core/agent-management/session-merge-utils";
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
  return {
    id: existing.id,
    title: pickPreferredTitle(existing.title, incoming.title),
    createdAt: pickPreferredCreatedAt(existing.createdAt, incoming.createdAt),
    model: existing.model ?? incoming.model,
    messageCount: pickPreferredMessageCount(existing.messageCount, incoming.messageCount),
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

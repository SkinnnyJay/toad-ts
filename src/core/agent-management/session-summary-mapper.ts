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

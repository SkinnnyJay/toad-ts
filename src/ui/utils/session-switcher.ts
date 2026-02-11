import type { AgentInfo } from "@/agents/agent-manager";
import { LIMIT } from "@/config/limits";
import { SESSION_MODE } from "@/constants/session-modes";
import type { Session, SessionId, SessionMode, UpsertSessionParams } from "@/types/domain";

export interface SessionSwitcherOptions {
  targetSessionId: SessionId;
  getSession: (sessionId: SessionId) => Session | undefined;
  upsertSession: (params: UpsertSessionParams) => void;
  setCurrentSession: (sessionId: SessionId) => void;
  setSessionId?: (sessionId: SessionId) => void;
  agent?: AgentInfo;
  now?: () => number;
}

const resolveSessionMode = (mode: AgentInfo["sessionMode"]): SessionMode => {
  return mode ?? SESSION_MODE.AUTO;
};

const buildSessionTitle = (agentName: string | undefined, sessionId: SessionId): string => {
  const label = agentName ?? "Session";
  const shortId = sessionId.slice(0, LIMIT.ID_TRUNCATE_LENGTH);
  return `${label} (${shortId})`;
};

export const switchToSessionWithFallback = ({
  targetSessionId,
  getSession,
  upsertSession,
  setCurrentSession,
  setSessionId,
  agent,
  now,
}: SessionSwitcherOptions): boolean => {
  const existingSession = getSession(targetSessionId);
  if (!existingSession) {
    const timestamp = now?.() ?? Date.now();
    upsertSession({
      session: {
        id: targetSessionId,
        title: buildSessionTitle(agent?.name, targetSessionId),
        agentId: agent?.id,
        messageIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        mode: resolveSessionMode(agent?.sessionMode),
        metadata: {
          mcpServers: [],
          ...(agent?.model ? { model: agent.model } : {}),
        },
      },
    });
  }

  setCurrentSession(targetSessionId);
  setSessionId?.(targetSessionId);
  return true;
};

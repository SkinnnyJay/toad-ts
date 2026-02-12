import type { AgentInfo } from "@/agents/agent-manager";
import { LIMIT } from "@/config/limits";
import { SESSION_MODE } from "@/constants/session-modes";
import type { Session, SessionId, SessionMode, UpsertSessionParams } from "@/types/domain";

export interface SessionSwitchSeed {
  title?: string;
  createdAt?: string;
  model?: string;
}

export interface SessionSwitcherOptions {
  targetSessionId: SessionId;
  getSession: (sessionId: SessionId) => Session | undefined;
  upsertSession: (params: UpsertSessionParams) => void;
  setCurrentSession: (sessionId: SessionId) => void;
  setSessionId?: (sessionId: SessionId) => void;
  agent?: AgentInfo;
  seedSession?: SessionSwitchSeed;
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

const toTimestamp = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const toSeedTitle = (
  seedTitle: string | undefined,
  agentName: string | undefined,
  sessionId: SessionId
): string => {
  const trimmedSeedTitle = seedTitle?.trim();
  if (trimmedSeedTitle) {
    return trimmedSeedTitle;
  }
  return buildSessionTitle(agentName, sessionId);
};

export const switchToSessionWithFallback = ({
  targetSessionId,
  getSession,
  upsertSession,
  setCurrentSession,
  setSessionId,
  agent,
  seedSession,
  now,
}: SessionSwitcherOptions): boolean => {
  const existingSession = getSession(targetSessionId);
  if (!existingSession) {
    const timestamp = now?.() ?? Date.now();
    const createdAt = toTimestamp(seedSession?.createdAt, timestamp);
    const updatedAt = Math.max(timestamp, createdAt);
    upsertSession({
      session: {
        id: targetSessionId,
        title: toSeedTitle(seedSession?.title, agent?.name, targetSessionId),
        agentId: agent?.id,
        messageIds: [],
        createdAt,
        updatedAt,
        mode: resolveSessionMode(agent?.sessionMode),
        metadata: {
          mcpServers: [],
          ...((seedSession?.model ?? agent?.model)
            ? { model: seedSession?.model ?? agent?.model }
            : {}),
        },
      },
    });
  }

  setCurrentSession(targetSessionId);
  setSessionId?.(targetSessionId);
  return true;
};

import type { AgentInfo } from "@/agents/agent-manager";
import { LIMIT } from "@/config/limits";
import { SESSION_MODE } from "@/constants/session-modes";
import type { Session, SessionId, SessionMode, UpsertSessionParams } from "@/types/domain";

export interface SessionSwitchSeed {
  title?: string;
  createdAt?: string;
  model?: string;
}

export const toSessionSwitchSeed = (session: {
  title?: string;
  createdAt?: string;
  model?: string;
}): SessionSwitchSeed => {
  return {
    title: session.title,
    createdAt: session.createdAt,
    model: session.model,
  };
};

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

const toSeedTimestamp = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
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

const toMergedSessionWithSeed = (
  session: Session,
  seedSession: SessionSwitchSeed | undefined
): Session | undefined => {
  if (!seedSession) {
    return undefined;
  }
  const seededTitle = seedSession.title?.trim();
  const seededModel = seedSession.model?.trim();
  const seededCreatedAt = toSeedTimestamp(seedSession.createdAt);

  let changed = false;
  const title = session.title?.trim() ? session.title : seededTitle;
  if (title !== session.title) {
    changed = true;
  }

  const createdAt =
    seededCreatedAt !== undefined
      ? Math.min(session.createdAt, seededCreatedAt)
      : session.createdAt;
  if (createdAt !== session.createdAt) {
    changed = true;
  }
  const updatedAt = Math.max(session.updatedAt, createdAt);
  if (updatedAt !== session.updatedAt) {
    changed = true;
  }

  const existingModel = session.metadata?.model;
  const model = existingModel ?? (seededModel && seededModel.length > 0 ? seededModel : undefined);
  if (model !== existingModel) {
    changed = true;
  }
  if (!changed) {
    return undefined;
  }

  const metadataBase = {
    ...(session.metadata ?? { mcpServers: [] }),
    mcpServers: session.metadata?.mcpServers ?? [],
  };
  const metadata = model ? { ...metadataBase, model } : metadataBase;

  return {
    ...session,
    title,
    createdAt,
    updatedAt,
    metadata,
  };
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
  } else {
    const mergedSession = toMergedSessionWithSeed(existingSession, seedSession);
    if (mergedSession) {
      upsertSession({ session: mergedSession });
    }
  }

  setCurrentSession(targetSessionId);
  setSessionId?.(targetSessionId);
  return true;
};

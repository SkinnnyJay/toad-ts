import { ENV_KEY } from "@/constants/env-keys";
import { SESSION_MODE } from "@/constants/session-modes";
import { type EnvSource, type McpConfigInput, parseMcpConfig } from "@/core/mcp-config";
import type { AgentId, Session, SessionMode } from "@/types/domain";
import { SessionSchema } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import type { NewSessionRequest, NewSessionResponse } from "@agentclientprotocol/sdk";

export interface SessionClient {
  newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
}

export interface SessionStore {
  upsertSession(params: { session: Session }): void;
}

export interface CreateSessionParams {
  cwd: string;
  mcpConfig?: McpConfigInput | null;
  agentId?: AgentId;
  title?: string;
  now?: number;
  env?: EnvSource;
  mode?: SessionMode;
}

const parseSessionMode = (value: string | undefined): SessionMode => {
  if (!value) return SESSION_MODE.AUTO;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === SESSION_MODE.READ_ONLY ||
    normalized === SESSION_MODE.AUTO ||
    normalized === SESSION_MODE.FULL_ACCESS
  ) {
    return normalized;
  }
  return SESSION_MODE.AUTO;
};

export class SessionManager {
  constructor(
    private readonly client: SessionClient,
    private readonly store: SessionStore
  ) {}

  async createSession(params: CreateSessionParams): Promise<Session> {
    const { cwd, agentId, title } = params;
    const now = params.now ?? Date.now();
    const env = params.env ?? EnvManager.getInstance().getSnapshot();
    const mode = params.mode ?? parseSessionMode(env[ENV_KEY.TOADSTOOL_SESSION_MODE]);
    const mcpServers = parseMcpConfig(params.mcpConfig, env);
    const response = await this.client.newSession({ cwd, mcpServers });
    const session = SessionSchema.parse({
      id: response.sessionId,
      title,
      agentId,
      messageIds: [],
      createdAt: now,
      updatedAt: now,
      metadata: { mcpServers },
      mode,
    });
    this.store.upsertSession({ session });
    return session;
  }
}

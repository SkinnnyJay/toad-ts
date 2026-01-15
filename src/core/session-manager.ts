import { type EnvSource, type McpConfigInput, parseMcpConfig } from "@/core/mcp-config";
import type { AgentId, Session } from "@/types/domain";
import { SessionSchema } from "@/types/domain";
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
}

export class SessionManager {
  constructor(
    private readonly client: SessionClient,
    private readonly store: SessionStore
  ) {}

  async createSession(params: CreateSessionParams): Promise<Session> {
    const { cwd, agentId, title } = params;
    const now = params.now ?? Date.now();
    const env = params.env ?? process.env;
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
    });
    this.store.upsertSession({ session });
    return session;
  }
}

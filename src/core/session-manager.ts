import { ENV_KEY } from "@/constants/env-keys";
import { HOOK_EVENT } from "@/constants/hook-events";
import { SESSION_MODE } from "@/constants/session-modes";
import { type EnvSource, type McpConfigInput, parseMcpConfig } from "@/core/mcp-config";
import { getHookManager } from "@/hooks/hook-service";
import type { AgentId, Session, SessionMode } from "@/types/domain";
import { SessionSchema } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import type { NewSessionRequest, NewSessionResponse } from "@agentclientprotocol/sdk";
import type {
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";

export interface SessionClient {
  newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
  setSessionMode?: (params: SetSessionModeRequest) => Promise<SetSessionModeResponse>;
  setSessionModel?: (params: SetSessionModelRequest) => Promise<SetSessionModelResponse>;
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
  model?: string;
  temperature?: number;
  parentSessionId?: Session["id"];
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
  private readonly logger = createClassLogger("SessionManager");

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
    const model = params.model;
    const temperature = params.temperature;
    const parentSessionId = params.parentSessionId;
    const response = await this.client.newSession({ cwd, mcpServers });
    const availableModels = response.models?.availableModels;
    const responseModel = response.models?.currentModelId;
    const resolvedModel = model ?? responseModel;
    const metadata = {
      mcpServers,
      ...(resolvedModel ? { model: resolvedModel } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(parentSessionId ? { parentSessionId } : {}),
      ...(availableModels ? { availableModels } : {}),
    };
    const session = SessionSchema.parse({
      id: response.sessionId,
      title,
      agentId,
      messageIds: [],
      createdAt: now,
      updatedAt: now,
      metadata,
      mode,
    });
    this.store.upsertSession({ session });
    const hookManager = getHookManager();
    if (hookManager) {
      void hookManager.runHooks(HOOK_EVENT.SESSION_START, {
        matcherTarget: session.id,
        sessionId: session.id,
        payload: { session },
      });
    }
    await this.applySessionMode(session.id, mode);
    await this.applySessionModel(session.id, model);
    return session;
  }

  private async applySessionMode(sessionId: Session["id"], mode: SessionMode): Promise<void> {
    if (!this.client.setSessionMode) {
      return;
    }
    try {
      await this.client.setSessionMode({ sessionId, modeId: mode });
    } catch (error) {
      this.logger.warn("Failed to set session mode", {
        sessionId,
        mode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async applySessionModel(sessionId: Session["id"], model?: string): Promise<void> {
    if (!model || !this.client.setSessionModel) {
      return;
    }
    try {
      await this.client.setSessionModel({ sessionId, modelId: model });
    } catch (error) {
      this.logger.warn("Failed to set session model", {
        sessionId,
        model,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

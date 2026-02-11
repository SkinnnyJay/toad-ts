import { CONNECTION_STATUS } from "@/constants/connection-status";
import type { HarnessRuntime, HarnessRuntimeEvents } from "@/harness/harnessAdapter";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { ConnectionStatus } from "@/types/domain";
import type {
  AuthenticateRequest,
  AuthenticateResponse,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SessionNotification,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

const DEFAULT_AUTH_CACHE_MAX_AGE_MS = 60_000;

interface CachedAuthStatus {
  authenticated: boolean;
  checkedAt: number;
}

export abstract class CliAgentBase
  extends EventEmitter<HarnessRuntimeEvents>
  implements HarnessRuntime
{
  private status: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private promptInFlight = false;
  private cachedAuthStatus: CachedAuthStatus | null = null;
  private readonly sessionModeById = new Map<string, string>();
  private readonly sessionModelById = new Map<string, string>();

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  protected setConnectionStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit("state", status);
  }

  protected async runPromptGuarded<T>(task: () => Promise<T>): Promise<T> {
    if (this.promptInFlight) {
      throw new Error("A prompt is already in progress for this CLI harness.");
    }

    this.promptInFlight = true;
    try {
      return await task();
    } finally {
      this.promptInFlight = false;
    }
  }

  protected setSessionModeValue(params: SetSessionModeRequest): void {
    this.sessionModeById.set(params.sessionId, params.modeId);
  }

  protected setSessionModelValue(params: SetSessionModelRequest): void {
    this.sessionModelById.set(params.sessionId, params.modelId);
  }

  protected getSessionModelValue(sessionId: string): string | undefined {
    return this.sessionModelById.get(sessionId);
  }

  protected getSessionPromptMode(sessionId: string): "agent" | "plan" | "ask" | undefined {
    const mode = this.sessionModeById.get(sessionId);
    if (mode === "agent" || mode === "plan" || mode === "ask") {
      return mode;
    }
    return undefined;
  }

  protected cacheAuthStatus(authenticated: boolean): void {
    this.cachedAuthStatus = {
      authenticated,
      checkedAt: Date.now(),
    };
  }

  protected getCachedAuthStatus(maxAgeMs = DEFAULT_AUTH_CACHE_MAX_AGE_MS): boolean | null {
    if (!this.cachedAuthStatus) {
      return null;
    }
    if (Date.now() - this.cachedAuthStatus.checkedAt > maxAgeMs) {
      this.cachedAuthStatus = null;
      return null;
    }
    return this.cachedAuthStatus.authenticated;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract initialize(params?: Partial<InitializeRequest>): Promise<InitializeResponse>;
  abstract newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
  abstract prompt(params: PromptRequest): Promise<PromptResponse>;
  abstract authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse>;
  abstract sessionUpdate(params: SessionNotification): Promise<void>;
  abstract setSessionMode?(params: SetSessionModeRequest): Promise<SetSessionModeResponse>;
  abstract setSessionModel?(params: SetSessionModelRequest): Promise<SetSessionModelResponse>;
  abstract runAgentCommand?(args: string[]): Promise<AgentManagementCommandResult>;
  abstract login?(): Promise<AgentManagementCommandResult>;
  abstract logout?(): Promise<AgentManagementCommandResult>;
  abstract getStatus?(): Promise<AgentManagementCommandResult>;
}

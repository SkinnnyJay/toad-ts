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
  RequestPermissionRequest,
  SessionNotification,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";
import type { EventEmitter } from "eventemitter3";

export interface AgentPortEvents {
  state: (status: ConnectionStatus) => void;
  sessionUpdate: (update: SessionNotification) => void;
  permissionRequest: (request: RequestPermissionRequest) => void;
  error: (error: Error) => void;
}

export type AgentPort = EventEmitter<AgentPortEvents> & {
  readonly connectionStatus: ConnectionStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  initialize(params?: Partial<InitializeRequest>): Promise<InitializeResponse>;
  newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
  setSessionMode?(params: SetSessionModeRequest): Promise<SetSessionModeResponse>;
  setSessionModel?(params: SetSessionModelRequest): Promise<SetSessionModelResponse>;
  prompt(params: PromptRequest): Promise<PromptResponse>;
  authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse>;
  sessionUpdate(params: SessionNotification): Promise<void>;
};

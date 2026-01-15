import type { EventEmitter } from "eventemitter3";
import type { z } from "zod";

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
} from "@agentclientprotocol/sdk";
import type { HarnessConfig } from "@/harness/harnessConfig";

export interface HarnessRuntimeEvents {
  state: (status: ConnectionStatus) => void;
  sessionUpdate: (update: SessionNotification) => void;
  permissionRequest: (request: RequestPermissionRequest) => void;
  error: (error: Error) => void;
}

export type HarnessRuntime = EventEmitter<HarnessRuntimeEvents> & {
  readonly connectionStatus: ConnectionStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  initialize(params?: Partial<InitializeRequest>): Promise<InitializeResponse>;
  newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
  prompt(params: PromptRequest): Promise<PromptResponse>;
  authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse>;
  sessionUpdate(params: SessionNotification): Promise<void>;
};

export interface HarnessAdapter<TConfig extends HarnessConfig = HarnessConfig> {
  readonly id: string;
  readonly name: string;
  readonly configSchema: z.ZodType<TConfig, z.ZodTypeDef, unknown>;
  createHarness(config: TConfig): HarnessRuntime;
}

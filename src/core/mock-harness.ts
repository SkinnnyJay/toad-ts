import { LIMIT } from "@/config/limits";
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
} from "@agentclientprotocol/sdk";
import { PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { nanoid } from "nanoid";

import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "../harness/harnessAdapter";
import { harnessConfigSchema } from "../harness/harnessConfig";
import type { ConnectionStatus } from "../types/domain";
import { SessionIdSchema } from "../types/domain";

export type MockHarnessAdapterEvents = HarnessRuntimeEvents;

export class MockHarnessRuntime
  extends EventEmitter<MockHarnessAdapterEvents>
  implements HarnessRuntime
{
  private status: ConnectionStatus = "disconnected";

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  async connect(): Promise<void> {
    this.setStatus("connecting");
    this.setStatus("connected");
  }

  async disconnect(): Promise<void> {
    this.setStatus("disconnected");
  }

  async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return { protocolVersion: PROTOCOL_VERSION };
  }

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    const sessionId = SessionIdSchema.parse(`mock-${nanoid(LIMIT.NANOID_LENGTH)}`);
    return { sessionId };
  }

  async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return {};
  }

  async prompt(_params: PromptRequest): Promise<PromptResponse> {
    return { stopReason: "end_turn" };
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {
    // no-op for mock runtime
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit("state", status);
  }
}

export const mockHarnessAdapter: HarnessAdapter = {
  id: "mock",
  name: "Mock Agent",
  configSchema: harnessConfigSchema,
  createHarness: () => new MockHarnessRuntime(),
};

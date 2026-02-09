import type { ACPConnection } from "@/core/acp-connection";
import type { ConnectionStatus } from "@/types/domain";
import {
  type AuthenticateRequest,
  type AuthenticateResponse,
  type Client,
  type ClientCapabilities,
  ClientSideConnection,
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  PROTOCOL_VERSION,
  type PromptRequest,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

export interface ACPClientEvents {
  state: (status: ConnectionStatus) => void;
  sessionUpdate: (update: SessionNotification) => void;
  permissionRequest: (request: RequestPermissionRequest) => void;
  error: (error: Error) => void;
}

export interface ACPClientOptions {
  clientCapabilities?: ClientCapabilities;
  permissionHandler?: (request: RequestPermissionRequest) => Promise<RequestPermissionResponse>;
}

export interface ACPConnectionLike {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStream(): ReturnType<ACPConnection["getStream"]>;
  connectionStatus: ConnectionStatus;
  on(event: "state", handler: (status: ConnectionStatus) => void): void;
  on(event: "error", handler: (error: Error) => void): void;
  on(
    event: "exit",
    handler: (info: { code: number | null; signal: NodeJS.Signals | null }) => void
  ): void;
}

export class ACPClient extends EventEmitter<ACPClientEvents> implements Client {
  private clientConnection?: ClientSideConnection;

  constructor(
    private readonly connection: ACPConnectionLike,
    private readonly options: ACPClientOptions = {}
  ) {
    super();
    this.connection.on("state", (status) => this.emit("state", status));
    this.connection.on("error", (error) => this.emit("error", error));
  }

  async connect(): Promise<void> {
    await this.connection.connect();
    const stream = this.connection.getStream();
    if (!stream) {
      throw new Error("ACP stream unavailable after connect");
    }
    this.clientConnection = new ClientSideConnection(() => this, stream);
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
    this.clientConnection = undefined;
  }

  async initialize(params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    const connection = this.requireConnection();
    return connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: this.options.clientCapabilities ?? {},
      ...params,
    });
  }

  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    return this.requireConnection().newSession(params);
  }

  async authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return this.requireConnection().authenticate(params);
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.requireConnection().prompt(params);
  }

  async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    this.emit("permissionRequest", params);
    if (this.options.permissionHandler) {
      return this.options.permissionHandler(params);
    }
    const firstOption = params.options[0];
    if (!firstOption) {
      return { outcome: { outcome: "cancelled" } };
    }
    return { outcome: { outcome: "selected", optionId: firstOption.optionId } };
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    this.emit("sessionUpdate", params);
  }

  get connectionStatus(): ConnectionStatus {
    return this.connection.connectionStatus;
  }

  private requireConnection(): ClientSideConnection {
    if (!this.clientConnection) {
      throw new Error("ACP client not connected");
    }
    return this.clientConnection;
  }
}

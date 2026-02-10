import { HOOK_EVENT } from "@/constants/hook-events";
import type { ACPConnection } from "@/core/acp-connection";
import { getHookManager } from "@/hooks/hook-service";
import type { ToolHost } from "@/tools/tool-host";
import { type ConnectionStatus, SessionIdSchema } from "@/types/domain";
import {
  type AuthenticateRequest,
  type AuthenticateResponse,
  type Client,
  type ClientCapabilities,
  ClientSideConnection,
  type CreateTerminalRequest,
  type CreateTerminalResponse,
  type InitializeRequest,
  type InitializeResponse,
  type KillTerminalCommandRequest,
  type KillTerminalCommandResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  PROTOCOL_VERSION,
  type PromptRequest,
  type PromptResponse,
  type ReadTextFileRequest,
  type ReadTextFileResponse,
  type ReleaseTerminalRequest,
  type ReleaseTerminalResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
  type SetSessionModeRequest,
  type SetSessionModeResponse,
  type SetSessionModelRequest,
  type SetSessionModelResponse,
  type TerminalOutputRequest,
  type TerminalOutputResponse,
  type WaitForTerminalExitRequest,
  type WaitForTerminalExitResponse,
  type WriteTextFileRequest,
  type WriteTextFileResponse,
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
  toolHost?: ToolHost;
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
  private readonly toolHost?: ToolHost;
  private readonly clientCapabilities: ClientCapabilities;

  constructor(
    private readonly connection: ACPConnectionLike,
    private readonly options: ACPClientOptions = {}
  ) {
    super();
    this.toolHost = options.toolHost;
    this.clientCapabilities = options.clientCapabilities ?? this.toolHost?.capabilities ?? {};
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
      clientCapabilities: this.clientCapabilities,
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

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    return this.requireConnection().setSessionMode(params);
  }

  async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    return this.requireConnection().unstable_setSessionModel(params);
  }

  async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    this.emit("permissionRequest", params);
    const hookManager = getHookManager();
    if (hookManager) {
      const matcherTarget =
        params.toolCall?.title ?? params.toolCall?.kind ?? params.toolCall?.toolCallId ?? undefined;
      const sessionId = params.sessionId ? SessionIdSchema.parse(params.sessionId) : undefined;
      const decision = await hookManager.runHooks(
        HOOK_EVENT.PERMISSION_REQUEST,
        {
          matcherTarget,
          sessionId,
          payload: {
            request: params,
          },
        },
        { canBlock: true }
      );
      if (!decision.allow) {
        return { outcome: { outcome: "cancelled" } };
      }
    }
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

  async readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse> {
    if (!this.toolHost) {
      throw new Error("File system tools not configured");
    }
    return this.toolHost.readTextFile(params);
  }

  async writeTextFile(params: WriteTextFileRequest): Promise<WriteTextFileResponse> {
    if (!this.toolHost) {
      throw new Error("File system tools not configured");
    }
    return this.toolHost.writeTextFile(params);
  }

  async createTerminal(params: CreateTerminalRequest): Promise<CreateTerminalResponse> {
    if (!this.toolHost) {
      throw new Error("Terminal tools not configured");
    }
    return this.toolHost.createTerminal(params);
  }

  async terminalOutput(params: TerminalOutputRequest): Promise<TerminalOutputResponse> {
    if (!this.toolHost) {
      throw new Error("Terminal tools not configured");
    }
    return this.toolHost.terminalOutput(params);
  }

  async waitForTerminalExit(
    params: WaitForTerminalExitRequest
  ): Promise<WaitForTerminalExitResponse> {
    if (!this.toolHost) {
      throw new Error("Terminal tools not configured");
    }
    return this.toolHost.waitForTerminalExit(params);
  }

  async releaseTerminal(params: ReleaseTerminalRequest): Promise<ReleaseTerminalResponse> {
    if (!this.toolHost) {
      throw new Error("Terminal tools not configured");
    }
    return this.toolHost.releaseTerminal(params);
  }

  async killTerminal(params: KillTerminalCommandRequest): Promise<KillTerminalCommandResponse> {
    if (!this.toolHost) {
      throw new Error("Terminal tools not configured");
    }
    return this.toolHost.killTerminal(params);
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

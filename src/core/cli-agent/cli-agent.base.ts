import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import type { HarnessRuntime, HarnessRuntimeEvents } from "@/harness/harnessAdapter";
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

export abstract class CliAgentBase
  extends EventEmitter<HarnessRuntimeEvents>
  implements HarnessRuntime
{
  private connectionStatusValue: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private promptInFlight = false;

  public get connectionStatus(): ConnectionStatus {
    return this.connectionStatusValue;
  }

  protected setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatusValue = status;
    this.emit("state", status);
  }

  protected async withPromptGuard<T>(task: () => Promise<T>): Promise<T> {
    if (this.promptInFlight) {
      throw new Error("Prompt already in progress for this harness instance.");
    }
    this.promptInFlight = true;
    try {
      return await task();
    } finally {
      this.promptInFlight = false;
    }
  }

  protected extractPromptText(params: PromptRequest): string {
    const textBlock = params.prompt.find((block) => block.type === CONTENT_BLOCK_TYPE.TEXT);
    if (!textBlock) {
      return "";
    }
    return textBlock.text;
  }

  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract initialize(params?: Partial<InitializeRequest>): Promise<InitializeResponse>;
  public abstract newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
  public abstract setSessionMode?(params: SetSessionModeRequest): Promise<SetSessionModeResponse>;
  public abstract setSessionModel?(
    params: SetSessionModelRequest
  ): Promise<SetSessionModelResponse>;
  public abstract prompt(params: PromptRequest): Promise<PromptResponse>;
  public abstract authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse>;
  public abstract sessionUpdate(params: SessionNotification): Promise<void>;
}

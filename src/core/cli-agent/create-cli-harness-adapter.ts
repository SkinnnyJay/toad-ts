import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ALLOW_ONCE, REJECT_ONCE } from "@/constants/permission-option-kinds";
import { parseSessionListCommandResult } from "@/core/agent-management/session-list-command-result";
import {
  sortAgentManagementSessionsByRecency,
  toAgentManagementSessions,
  toUniqueAgentManagementSessions,
} from "@/core/agent-management/session-summary-mapper";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import { CliAgentBridge } from "@/core/cli-agent/cli-agent.bridge";
import type { CliAgentPort } from "@/core/cli-agent/cli-agent.port";
import { inferToolKindFromName } from "@/core/cli-agent/tool-kind-mapper";
import type {
  AgentManagementCommandResult,
  AgentManagementSession,
} from "@/types/agent-management.types";
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
import { PROTOCOL_VERSION } from "@agentclientprotocol/sdk";

export interface CreateCliHarnessAdapterOptions {
  cliAgent: CliAgentPort;
  bridge?: CliAgentBridge;
  unauthenticatedErrorMessage?: string;
}

const toNormalizedAgentManagementSessions = (
  sessions: AgentManagementSession[]
): AgentManagementSession[] => {
  return sortAgentManagementSessionsByRecency(toUniqueAgentManagementSessions(sessions));
};

export class CliHarnessAdapter extends CliAgentBase {
  private readonly cliAgent: CliAgentPort;
  private readonly bridge: CliAgentBridge;
  private readonly unauthenticatedErrorMessage: string;

  constructor(options: CreateCliHarnessAdapterOptions) {
    super();
    this.cliAgent = options.cliAgent;
    this.bridge = options.bridge ?? new CliAgentBridge();
    this.unauthenticatedErrorMessage =
      options.unauthenticatedErrorMessage ?? "CLI agent is not authenticated.";

    this.bridge.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.bridge.on("error", (error) => this.emit("error", error));
    this.bridge.on("permissionRequest", (request) => {
      this.emit("permissionRequest", {
        sessionId: request.sessionId ?? "session-unknown",
        toolCall: {
          toolCallId: request.requestId,
          kind: inferToolKindFromName(request.toolName),
        },
        options: [
          { optionId: ALLOW_ONCE, kind: ALLOW_ONCE, name: "Allow once" },
          { optionId: REJECT_ONCE, kind: REJECT_ONCE, name: "Reject once" },
        ],
      });
    });
  }

  async connect(): Promise<void> {
    if (
      this.connectionStatus === CONNECTION_STATUS.CONNECTED ||
      this.connectionStatus === CONNECTION_STATUS.CONNECTING
    ) {
      return;
    }
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    try {
      const installInfo = await this.cliAgent.verifyInstallation();
      if (!installInfo.installed) {
        const installCommand = installInfo.installCommand ?? "Install the configured CLI binary.";
        throw new Error(`CLI agent binary is not installed. ${installCommand}`);
      }

      const authStatus = await this.cliAgent.verifyAuth();
      this.cacheAuthStatus(authStatus.authenticated);
      if (!authStatus.authenticated) {
        throw new Error(this.unauthenticatedErrorMessage);
      }

      this.setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    } catch (error) {
      this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.cliAgent.disconnect();
    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return {
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    if (!this.cliAgent.createSession) {
      throw new Error("CLI agent does not support session creation.");
    }
    const sessionId = await this.cliAgent.createSession();
    return { sessionId };
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.runPromptGuarded(async () => {
      const promptText = params.prompt
        .filter((entry) => entry.type === CONTENT_BLOCK_TYPE.TEXT)
        .map((entry) => entry.text)
        .join("\n");

      const execution = await this.cliAgent.prompt({
        message: promptText,
        force: false,
        sessionId: params.sessionId,
        mode: this.getSessionPromptMode(params.sessionId),
        model: this.getSessionModelValue(params.sessionId),
        streaming: true,
      });

      for (const event of execution.events) {
        this.bridge.translate(event);
      }

      return {
        stopReason: execution.result.text.length > 0 ? "end_turn" : "max_tokens",
      };
    });
  }

  async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    const cachedAuth = this.getCachedAuthStatus();
    if (cachedAuth === true) {
      return {};
    }

    const authStatus = await this.cliAgent.verifyAuth();
    this.cacheAuthStatus(authStatus.authenticated);
    if (!authStatus.authenticated) {
      throw new Error(this.unauthenticatedErrorMessage);
    }
    return {};
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {
    return Promise.resolve();
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    this.setSessionModeValue(params);
    return {};
  }

  async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    this.setSessionModelValue(params);
    return {};
  }

  async runAgentCommand(args: string[]): Promise<AgentManagementCommandResult> {
    if (!this.cliAgent.runManagementCommand) {
      throw new Error("CLI agent does not support management commands.");
    }
    return this.cliAgent.runManagementCommand(args);
  }

  async listAgentSessions(): Promise<AgentManagementSession[]> {
    if (this.cliAgent.listSessions) {
      const sessions = await this.cliAgent.listSessions();
      return toNormalizedAgentManagementSessions(toAgentManagementSessions(sessions));
    }

    if (this.cliAgent.runManagementCommand) {
      const result = await this.cliAgent.runManagementCommand([AGENT_MANAGEMENT_COMMAND.LIST]);
      return toNormalizedAgentManagementSessions(
        toAgentManagementSessions(parseSessionListCommandResult(result))
      );
    }

    throw new Error("CLI agent does not support session listing.");
  }
}

export const createCliHarnessAdapter = (
  options: CreateCliHarnessAdapterOptions
): CliHarnessAdapter => {
  return new CliHarnessAdapter(options);
};

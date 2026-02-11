import type { CliAgentPort, CliAgentPromptExecution } from "@/core/cli-agent/cli-agent.port";
import type { CursorPromptRequest, CursorPromptResult } from "@/core/cursor/cursor-cli-connection";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CliAgentSession } from "@/types/cli-agent.types";

const CURSOR_AGENT_PORT_DEFAULT = {
  UNKNOWN_SESSION_ID: "session-unknown",
} as const;

type CursorPromptMode = NonNullable<CursorPromptRequest["mode"]>;

export interface CursorCliConnectionLike {
  verifyInstallation(): Promise<{ installed: boolean; version?: string }>;
  verifyAuth(): Promise<{ authenticated: boolean }>;
  listModels(): Promise<{ models: Array<{ id: string; name: string }>; defaultModel?: string }>;
  listSessions(): Promise<CliAgentSession[]>;
  createChat(): Promise<string>;
  spawnPrompt(request: CursorPromptRequest): Promise<CursorPromptResult>;
  disconnect(): Promise<void>;
  runManagementCommand(args: string[]): Promise<AgentManagementCommandResult>;
}

export interface CursorCliAgentPortOptions {
  connection: CursorCliConnectionLike;
  getPromptEnvOverrides?: () => NodeJS.ProcessEnv | undefined;
  isApiKeyConfigured?: () => boolean;
}

const toCursorPromptMode = (mode: string | undefined): CursorPromptMode | undefined => {
  if (mode === "agent" || mode === "plan" || mode === "ask") {
    return mode;
  }
  return undefined;
};

const resolveSessionId = (result: CursorPromptResult, fallback: string | undefined): string => {
  return result.sessionId ?? fallback ?? CURSOR_AGENT_PORT_DEFAULT.UNKNOWN_SESSION_ID;
};

const assertPromptSucceeded = (result: CursorPromptResult): void => {
  if (result.exitCode !== null && result.exitCode !== 0 && result.resultText === null) {
    throw new Error(`Cursor prompt failed${result.signal ? ` (${result.signal})` : ""}`);
  }
};

export class CursorCliAgentPort implements CliAgentPort {
  private readonly connection: CursorCliConnectionLike;
  private readonly getPromptEnvOverrides?: () => NodeJS.ProcessEnv | undefined;
  private readonly isApiKeyConfigured?: () => boolean;

  constructor(options: CursorCliAgentPortOptions) {
    this.connection = options.connection;
    this.getPromptEnvOverrides = options.getPromptEnvOverrides;
    this.isApiKeyConfigured = options.isApiKeyConfigured;
  }

  async verifyInstallation() {
    const result = await this.connection.verifyInstallation();
    return {
      binaryName: "cursor-agent",
      installed: result.installed,
      version: result.version,
      installCommand: "Install cursor-agent and ensure it is available on PATH.",
    };
  }

  async verifyAuth() {
    const result = await this.connection.verifyAuth();
    const authenticated = result.authenticated || this.isApiKeyConfigured?.() === true;
    return {
      authenticated,
      method: result.authenticated ? "browser_login" : authenticated ? "api_key" : "none",
    } as const;
  }

  async listModels() {
    const result = await this.connection.listModels();
    return {
      models: result.models.map((model) => ({
        id: model.id,
        name: model.name,
        isDefault: result.defaultModel === model.id,
        supportsThinking: true,
      })),
      defaultModel: result.defaultModel,
    };
  }

  async createSession(): Promise<string> {
    return this.connection.createChat();
  }

  async listSessions() {
    return this.connection.listSessions();
  }

  async prompt(input: {
    message: string;
    sessionId?: string;
    model?: string;
    mode?: string;
    force?: boolean;
    streaming?: boolean;
  }): Promise<CliAgentPromptExecution> {
    const result = await this.connection.spawnPrompt({
      prompt: input.message,
      sessionId: input.sessionId,
      model: input.model,
      mode: toCursorPromptMode(input.mode),
      force: input.force,
      streamPartialOutput: input.streaming,
      envOverrides: this.getPromptEnvOverrides?.(),
    });
    assertPromptSucceeded(result);
    return {
      result: {
        text: result.resultText ?? "",
        sessionId: resolveSessionId(result, input.sessionId),
        toolCallCount: 0,
      },
      events: [],
    };
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  async runManagementCommand(args: string[]) {
    return this.connection.runManagementCommand(args);
  }
}

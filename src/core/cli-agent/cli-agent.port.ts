import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type {
  CliAgentAuthStatus,
  CliAgentInstallInfo,
  CliAgentModelsResponse,
  CliAgentPromptInput,
  CliAgentPromptResult,
  CliAgentSession,
  StreamEvent,
} from "@/types/cli-agent.types";

export interface CliAgentPromptExecution {
  result: CliAgentPromptResult;
  events: StreamEvent[];
}

export interface CliAgentPort {
  verifyInstallation(): Promise<CliAgentInstallInfo>;
  verifyAuth(): Promise<CliAgentAuthStatus>;
  listModels(): Promise<CliAgentModelsResponse>;
  createSession?(): Promise<string>;
  listSessions?(): Promise<CliAgentSession[]>;
  prompt(input: CliAgentPromptInput): Promise<CliAgentPromptExecution>;
  disconnect(): Promise<void>;
  runManagementCommand?(args: string[]): Promise<AgentManagementCommandResult>;
}

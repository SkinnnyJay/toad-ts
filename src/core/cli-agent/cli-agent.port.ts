import type {
  CliAgentAuthStatus,
  CliAgentInstallInfo,
  CliAgentModelsResponse,
  CliAgentPromptInput,
  CliAgentSession,
  StreamEvent,
} from "@/types/cli-agent.types";
import type { EventEmitter } from "eventemitter3";

export interface CliAgentPromptExecutionResult {
  events: StreamEvent[];
  sessionId?: string;
  resultText?: string;
  stderr: string;
  exitCode: number | null;
}

export interface CliAgentPortEvents {
  streamEvent: (event: StreamEvent) => void;
  parseError: (payload: { line: string; reason: string }) => void;
  processExit: (payload: { code: number | null; signal: NodeJS.Signals | null }) => void;
}

export type CliAgentPort = EventEmitter<CliAgentPortEvents> & {
  getLastSessionId(): string | undefined;
  setEnv(overrides: Record<string, string>): void;
  disconnect(): Promise<void>;
  verifyInstallation(): Promise<CliAgentInstallInfo>;
  verifyAuth(): Promise<CliAgentAuthStatus>;
  createChat(): Promise<string>;
  listModels(): Promise<CliAgentModelsResponse>;
  listSessions(): Promise<CliAgentSession[]>;
  runPrompt(
    input: CliAgentPromptInput,
    options?: { apiKey?: string }
  ): Promise<CliAgentPromptExecutionResult>;
};

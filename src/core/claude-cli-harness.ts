import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";

import { createAcpAgentPort } from "@/core/acp-agent-port";
import type { ACPClientOptions, ACPConnectionLike } from "@/core/acp-client";
import { ACPConnection, type ACPConnectionOptions } from "@/core/acp-connection";
import type { AgentPort } from "@/core/agent-port";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import type { ConnectionStatus } from "@/types/domain";
import { retryWithBackoff } from "@/utils/async/retryWithBackoff";
import { createClassLogger } from "@/utils/logging/logger.utils";
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
import { EventEmitter } from "eventemitter3";

export type ClaudeCliHarnessAdapterEvents = HarnessRuntimeEvents;

export interface ClaudeCliHarnessAdapterOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  envDefaults?: NodeJS.ProcessEnv;
  clientOptions?: ACPClientOptions;
  connection?: ACPConnectionLike;
  connectionFactory?: (options: ACPConnectionOptions) => ACPConnectionLike;
}

const DEFAULT_CLAUDE_ARGS: string[] = [];

const parseArgs = (rawValue: string): string[] => {
  return rawValue
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const addLocalBinToPath = (env: NodeJS.ProcessEnv, cwd?: string): NodeJS.ProcessEnv => {
  const baseDir = cwd ?? process.cwd();
  const localBin = join(baseDir, "node_modules", ".bin");
  const pathValue = env.PATH ?? process.env.PATH ?? "";
  if (!existsSync(localBin)) {
    return env;
  }

  const segments = pathValue.split(delimiter).filter(Boolean);
  if (segments.includes(localBin)) {
    return env;
  }

  return {
    ...env,
    PATH: `${localBin}${delimiter}${pathValue}`,
  };
};

const resolveDefaults = (
  options: ClaudeCliHarnessAdapterOptions
): { command: string; args: string[]; env: NodeJS.ProcessEnv } => {
  const envDefaults = options.envDefaults ?? process.env;
  const commandFromEnv = envDefaults[ENV_KEY.TOADSTOOL_CLAUDE_COMMAND];
  const argsFromEnv = envDefaults[ENV_KEY.TOADSTOOL_CLAUDE_ARGS];

  const command = options.command ?? commandFromEnv ?? HARNESS_DEFAULT.CLAUDE_COMMAND;
  const args =
    options.args ?? (argsFromEnv !== undefined ? parseArgs(argsFromEnv) : [...DEFAULT_CLAUDE_ARGS]);

  const env = addLocalBinToPath({ ...envDefaults }, options.cwd);

  return { command, args, env };
};

export class ClaudeCliHarnessAdapter
  extends EventEmitter<ClaudeCliHarnessAdapterEvents>
  implements HarnessRuntime
{
  public readonly command: string;
  public readonly args: readonly string[];
  private readonly connection: ACPConnectionLike;
  private readonly client: AgentPort;
  private readonly logger = createClassLogger("ClaudeCliHarnessAdapter");

  constructor(options: ClaudeCliHarnessAdapterOptions = {}) {
    super();
    const resolved = resolveDefaults(options);
    this.command = resolved.command;
    this.args = resolved.args;

    const mergedEnv = { ...resolved.env, ...options.env };

    const connectionOptions: ACPConnectionOptions = {
      command: resolved.command,
      args: resolved.args,
      cwd: options.cwd,
      env: mergedEnv,
    };

    this.connection =
      options.connection ??
      (options.connectionFactory
        ? options.connectionFactory(connectionOptions)
        : new ACPConnection(connectionOptions));
    this.client = createAcpAgentPort({
      connection: this.connection,
      clientOptions: options.clientOptions,
    });

    this.client.on("state", (status) => this.emit("state", status));
    this.client.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.client.on("permissionRequest", (request) => this.emit("permissionRequest", request));
    this.client.on("error", (error) => this.emit("error", error));
  }

  get connectionStatus(): ConnectionStatus {
    return this.connection.connectionStatus;
  }

  async connect(): Promise<void> {
    try {
      await retryWithBackoff(
        async (attempt) => {
          if (attempt > 1) {
            this.emit("state", CONNECTION_STATUS.CONNECTING);
          }
          await this.client.connect();
        },
        {
          maxAttempts: LIMIT.MAX_CONNECTION_RETRIES,
          baseMs: TIMEOUT.BACKOFF_BASE_MS,
          capMs: TIMEOUT.BACKOFF_CAP_MS,
          shouldRetry: (error) => this.isRetryableConnectionError(error),
          onRetry: ({ attempt, delayMs, error }) => {
            this.logger.warn("Harness connect failed; retrying", {
              attempt,
              delayMs,
              error: error.message,
            });
          },
        }
      );
    } catch (error) {
      this.logger.error("Harness connect failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  private isRetryableConnectionError(error: unknown): boolean {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "EACCES") {
        return false;
      }
    }
    return true;
  }

  async initialize(params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return this.client.initialize(params);
  }

  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    return this.client.newSession(params);
  }

  async authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return this.client.authenticate(params);
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.client.prompt(params);
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    await this.client.sessionUpdate(params);
  }
}

export const claudeCliHarnessAdapter: HarnessAdapter = {
  id: "claude-cli",
  name: "Claude CLI",
  configSchema: harnessConfigSchema,
  createHarness: (config) =>
    new ClaudeCliHarnessAdapter({
      command: config.command,
      args: config.args,
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
    }),
};

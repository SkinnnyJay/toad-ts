import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";

import { createAcpAgentPort } from "@/core/acp-agent-port";
import type { ACPClientOptions, ACPConnectionLike } from "@/core/acp-client";
import { ACPConnection, type ACPConnectionOptions } from "@/core/acp-connection";
import type { AgentPort } from "@/core/agent-port";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import { createCliHarnessAdapter } from "@/core/cli-agent/create-cli-harness-adapter";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";
import { createPermissionHandler } from "@/tools/permissions";
import { ToolHost } from "@/tools/tool-host";
import { retryWithBackoff } from "@/utils/async/retryWithBackoff";
import { EnvManager } from "@/utils/env/env.utils";
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
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";

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
  const defaultEnv = EnvManager.getInstance().getSnapshot();
  const pathValue = env[ENV_KEY.PATH] ?? defaultEnv[ENV_KEY.PATH] ?? "";
  if (!existsSync(localBin)) {
    return env;
  }

  const segments = pathValue.split(delimiter).filter(Boolean);
  if (segments.includes(localBin)) {
    return env;
  }

  return {
    ...env,
    [ENV_KEY.PATH]: `${localBin}${delimiter}${pathValue}`,
  };
};

const resolveDefaults = (
  options: ClaudeCliHarnessAdapterOptions
): { command: string; args: string[]; env: NodeJS.ProcessEnv } => {
  const envDefaults = options.envDefaults ?? EnvManager.getInstance().getSnapshot();
  const commandFromEnv = envDefaults[ENV_KEY.TOADSTOOL_CLAUDE_COMMAND];
  const argsFromEnv = envDefaults[ENV_KEY.TOADSTOOL_CLAUDE_ARGS];

  const command = options.command ?? commandFromEnv ?? HARNESS_DEFAULT.CLAUDE_COMMAND;
  const args =
    options.args ?? (argsFromEnv !== undefined ? parseArgs(argsFromEnv) : [...DEFAULT_CLAUDE_ARGS]);

  const env = addLocalBinToPath({ ...envDefaults }, options.cwd);

  return { command, args, env };
};

export class ClaudeCliHarnessAdapter extends CliAgentBase implements HarnessRuntime {
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

    this.client.on("state", (status) => this.setConnectionStatus(status));
    this.client.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.client.on("permissionRequest", (request) => this.emit("permissionRequest", request));
    this.client.on("error", (error) => this.emit("error", error));
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
    if (isErrnoException(error)) {
      const code = error.code;
      if (code === ERROR_CODE.ENOENT || code === ERROR_CODE.EACCES) {
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

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    if (!this.client.setSessionMode) {
      return {};
    }
    try {
      return await this.client.setSessionMode(params);
    } catch (error) {
      if (isMethodNotFoundError(error)) {
        return {};
      }
      throw error;
    }
  }

  async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    if (!this.client.setSessionModel) {
      return {};
    }
    try {
      return await this.client.setSessionModel(params);
    } catch (error) {
      if (isMethodNotFoundError(error)) {
        return {};
      }
      throw error;
    }
  }

  async authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return this.client.authenticate(params);
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.withPromptGuard(async () => this.client.prompt(params));
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    await this.client.sessionUpdate(params);
  }
}

export const createAcpCliHarnessRuntime = (config: HarnessConfig): HarnessRuntime => {
  const env = { ...EnvManager.getInstance().getSnapshot(), ...config.env };
  const toolHost = new ToolHost({ baseDir: config.cwd, env });
  const clientOptions: ACPClientOptions = {
    toolHost,
    clientCapabilities: toolHost.capabilities,
    permissionHandler: createPermissionHandler(config.permissions),
  };

  return new ClaudeCliHarnessAdapter({
    command: config.command,
    args: config.args,
    cwd: config.cwd,
    env,
    clientOptions,
  });
};

export const createCliHarnessRuntime = createAcpCliHarnessRuntime;

export const claudeCliHarnessAdapter: HarnessAdapter = createCliHarnessAdapter({
  id: HARNESS_DEFAULT.CLAUDE_CLI_ID,
  name: HARNESS_DEFAULT.CLAUDE_CLI_NAME,
  configSchema: harnessConfigSchema,
  createRuntime: (config: HarnessConfig) => createAcpCliHarnessRuntime(config),
});

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const isMethodNotFoundError = (error: unknown): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code: unknown }).code === "number" &&
  (error as { code: number }).code === -32601;

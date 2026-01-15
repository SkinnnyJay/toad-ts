import { ACPClient, type ACPClientOptions, type ACPConnectionLike } from "@/core/acp-client";
import { ACPConnection, type ACPConnectionOptions } from "@/core/acp-connection";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { harnessConfigSchema } from "@/harness/harnessConfig";
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

const DEFAULT_CLAUDE_COMMAND = "claude";
const DEFAULT_CLAUDE_ARGS = ["--experimental-acp"] as const;
const CLAUDE_COMMAND_ENV_KEY = "TOAD_CLAUDE_COMMAND";
const CLAUDE_ARGS_ENV_KEY = "TOAD_CLAUDE_ARGS";

const parseArgs = (rawValue: string): string[] => {
  return rawValue
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const resolveDefaults = (
  options: ClaudeCliHarnessAdapterOptions
): { command: string; args: string[] } => {
  const envDefaults = options.envDefaults ?? process.env;
  const commandFromEnv = envDefaults[CLAUDE_COMMAND_ENV_KEY];
  const argsFromEnv = envDefaults[CLAUDE_ARGS_ENV_KEY];

  const command = options.command ?? commandFromEnv ?? DEFAULT_CLAUDE_COMMAND;
  const args =
    options.args ?? (argsFromEnv !== undefined ? parseArgs(argsFromEnv) : [...DEFAULT_CLAUDE_ARGS]);

  return { command, args };
};

export class ClaudeCliHarnessAdapter
  extends EventEmitter<ClaudeCliHarnessAdapterEvents>
  implements HarnessRuntime
{
  public readonly command: string;
  public readonly args: readonly string[];
  private readonly connection: ACPConnectionLike;
  private readonly client: ACPClient;

  constructor(options: ClaudeCliHarnessAdapterOptions = {}) {
    super();
    const resolved = resolveDefaults(options);
    this.command = resolved.command;
    this.args = resolved.args;

    const connectionOptions: ACPConnectionOptions = {
      command: resolved.command,
      args: resolved.args,
      cwd: options.cwd,
      env: options.env,
    };

    this.connection =
      options.connection ??
      (options.connectionFactory
        ? options.connectionFactory(connectionOptions)
        : new ACPConnection(connectionOptions));
    this.client = new ACPClient(this.connection, options.clientOptions);

    this.client.on("state", (status) => this.emit("state", status));
    this.client.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.client.on("permissionRequest", (request) => this.emit("permissionRequest", request));
    this.client.on("error", (error) => this.emit("error", error));
  }

  get connectionStatus(): ConnectionStatus {
    return this.connection.connectionStatus;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
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

  off<K extends keyof ClaudeCliHarnessAdapterEvents>(
    event: K,
    handler: ClaudeCliHarnessAdapterEvents[K]
  ): this {
    this.removeListener(event, handler);
    return this;
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

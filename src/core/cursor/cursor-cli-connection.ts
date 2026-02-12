import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { CliAgentProcessRunner } from "@/core/cli-agent/cli-agent-process-runner";
import type { CliAgentAuthStatus } from "@/types/cli-agent.types";
import {
  type CliAgentInstallInfo,
  CliAgentInstallInfoSchema,
  type CliAgentModelsResponse,
  type CliAgentPromptInput,
  CliAgentPromptInputSchema,
  type CliAgentSession,
  CliAgentSessionSchema,
} from "@/types/cli-agent.types";
import type { CursorStreamEvent } from "@/types/cursor-cli.types";
import { EnvManager } from "@/utils/env/env.utils";
import { EventEmitter } from "eventemitter3";
import {
  type CursorAboutInfo,
  type CursorAuthCommandResult,
  type CursorMcpServerStatus,
  parseCursorAboutOutput,
  parseCursorLoginOutput,
  parseCursorLogoutOutput,
  parseCursorMcpListOutput,
  parseCursorModelsOutput,
  parseCursorStatusOutput,
} from "./cursor-command-parsers";
import { CursorStreamParser, type CursorStreamParserOptions } from "./cursor-stream-parser";

const CURSOR_CLI_ARG = {
  PRINT: "-p",
  OUTPUT_FORMAT: "--output-format",
  STREAM_JSON: "stream-json",
  STREAM_PARTIAL_OUTPUT: "--stream-partial-output",
  RESUME: "--resume",
  MODEL: "--model",
  MODE: "--mode",
  WORKSPACE: "--workspace",
  FORCE: "--force",
  SANDBOX: "--sandbox",
  BROWSER: "--browser",
  APPROVE_MCPS: "--approve-mcps",
  API_KEY: "--api-key",
  VERSION: "--version",
  STATUS: "status",
  LOGIN: "login",
  LOGOUT: "logout",
  ABOUT: "about",
  MODELS: "models",
  MCP: "mcp",
  MCP_LIST: "list",
  LIST_SESSIONS: "ls",
  CREATE_CHAT: "create-chat",
} as const;

const CURSOR_REGEX = {
  CHAT_ID: /^[0-9a-fA-F-]{36}$/,
  WHITESPACE: /\s+/,
} as const;

export interface CursorPromptExecutionResult {
  events: CursorStreamEvent[];
  sessionId?: string;
  resultText?: string;
  stderr: string;
  exitCode: number | null;
}

export interface CursorCliConnectionEvents {
  streamEvent: (event: CursorStreamEvent) => void;
  parseError: (payload: { line: string; reason: string }) => void;
  processExit: (payload: { code: number | null; signal: NodeJS.Signals | null }) => void;
}

export interface CursorCliConnectionOptions extends CursorStreamParserOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnFn?: CursorCliSpawnFunction;
}

export interface CursorCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface CursorCommandOptions {
  stdinText?: string;
  timeoutMs?: number;
}

type CursorCliSpawnFunction = ConstructorParameters<typeof CliAgentProcessRunner>[0]["spawnFn"];

const parseArgs = (rawValue: string): string[] => {
  return rawValue
    .split(CURSOR_REGEX.WHITESPACE)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const toLines = (value: string): string[] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

export class CursorCliConnection extends EventEmitter<CursorCliConnectionEvents> {
  private readonly command: string;
  private readonly runner: CliAgentProcessRunner;
  private env: NodeJS.ProcessEnv;
  private readonly parserOptions: CursorStreamParserOptions;
  private latestSessionId: string | undefined;

  public constructor(options: CursorCliConnectionOptions = {}) {
    super();
    const baseEnv = { ...EnvManager.getInstance().getSnapshot(), ...options.env };
    const commandFromEnv = baseEnv[ENV_KEY.TOADSTOOL_CURSOR_COMMAND];
    const argsFromEnv = baseEnv[ENV_KEY.TOADSTOOL_CURSOR_ARGS];

    this.command = options.command ?? commandFromEnv ?? HARNESS_DEFAULT.CURSOR_COMMAND;
    const resolvedArgs =
      options.args ?? (argsFromEnv ? parseArgs(argsFromEnv) : [...HARNESS_DEFAULT.CURSOR_ARGS]);
    this.env = baseEnv;
    this.parserOptions = {
      maxAccumulatedOutputBytes: options.maxAccumulatedOutputBytes,
      maxPendingEvents: options.maxPendingEvents,
      resumePendingEvents: options.resumePendingEvents,
    };
    this.runner = new CliAgentProcessRunner({
      command: this.command,
      args: resolvedArgs,
      cwd: options.cwd,
      env: this.env,
      spawnFn: options.spawnFn,
      defaultCommandTimeoutMs: CURSOR_LIMIT.COMMAND_RESULT_TIMEOUT_MS,
      forceKillTimeoutMs: CURSOR_LIMIT.COMMAND_FORCE_KILL_TIMEOUT_MS,
      loggerName: "CursorCliConnection",
    });
  }

  public getLastSessionId(): string | undefined {
    return this.latestSessionId;
  }

  public setEnv(overrides: Record<string, string>): void {
    this.env = {
      ...this.env,
      ...overrides,
    };
    this.runner.setEnv(overrides);
  }

  public async disconnect(): Promise<void> {
    await this.runner.disconnect();
  }

  public async verifyInstallation(): Promise<CliAgentInstallInfo> {
    try {
      const result = await this.runCommand([CURSOR_CLI_ARG.VERSION]);
      const version = toLines(result.stdout)[0];
      return CliAgentInstallInfoSchema.parse({
        binaryName: this.command,
        version,
        installed: result.exitCode === 0,
      });
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return CliAgentInstallInfoSchema.parse({
          binaryName: this.command,
          installed: false,
        });
      }
      throw error;
    }
  }

  public async verifyAuth(): Promise<CliAgentAuthStatus> {
    const result = await this.runCommand([CURSOR_CLI_ARG.STATUS]);
    return parseCursorStatusOutput(result.stdout, result.stderr, this.env[ENV_KEY.CURSOR_API_KEY]);
  }

  public async login(): Promise<CursorAuthCommandResult> {
    const result = await this.runCommand([CURSOR_CLI_ARG.LOGIN]);
    return parseCursorLoginOutput(result.stdout, result.stderr);
  }

  public async logout(): Promise<CursorAuthCommandResult> {
    const result = await this.runCommand([CURSOR_CLI_ARG.LOGOUT]);
    return parseCursorLogoutOutput(result.stdout, result.stderr);
  }

  public async createChat(): Promise<string> {
    const result = await this.runCommand([CURSOR_CLI_ARG.CREATE_CHAT]);
    const id = toLines(result.stdout)[0];
    if (!id || !CURSOR_REGEX.CHAT_ID.test(id)) {
      throw new Error(`Unable to parse chat id from output: ${result.stdout}`);
    }
    return id;
  }

  public async listModels(): Promise<CliAgentModelsResponse> {
    const result = await this.runCommand([CURSOR_CLI_ARG.MODELS]);
    return parseCursorModelsOutput(result.stdout);
  }

  public async listSessions(): Promise<CliAgentSession[]> {
    const result = await this.runCommand([CURSOR_CLI_ARG.LIST_SESSIONS]);
    const lines = toLines(result.stdout);
    if (lines.some((line) => line.includes("Requires TTY"))) {
      return [];
    }

    const sessions = lines
      .map((line) => this.parseSessionLine(line))
      .filter((session): session is CliAgentSession => session !== null);
    return sessions;
  }

  public async about(): Promise<CursorAboutInfo> {
    const result = await this.runCommand([CURSOR_CLI_ARG.ABOUT]);
    return parseCursorAboutOutput(result.stdout);
  }

  public async listMcpServers(): Promise<CursorMcpServerStatus[]> {
    const result = await this.runCommand([CURSOR_CLI_ARG.MCP, CURSOR_CLI_ARG.MCP_LIST]);
    return parseCursorMcpListOutput(result.stdout);
  }

  public async runPrompt(
    input: CliAgentPromptInput,
    options: { apiKey?: string } = {}
  ): Promise<CursorPromptExecutionResult> {
    const payload = CliAgentPromptInputSchema.parse(input);
    const args = this.buildPromptArgs(payload, options.apiKey);
    const parser = new CursorStreamParser(this.parserOptions);
    const events: CursorStreamEvent[] = [];
    let resultText: string | undefined;
    let observedSessionId = payload.sessionId ?? this.latestSessionId;
    parser.on("event", (event) => {
      events.push(event);
      parser.drain(1);
      this.emit("streamEvent", event);
      if (event.type === "system") {
        observedSessionId = event.session_id;
        this.latestSessionId = event.session_id;
      }
      if (event.type === "result" && "result" in event && typeof event.result === "string") {
        resultText = event.result;
      }
    });
    parser.on("parseError", (payload) => this.emit("parseError", payload));

    const execution = await this.runner.runStreamingCommand(args, {
      stdinText: `${payload.message}\n`,
      onStdout: (chunk) => parser.write(chunk),
    });

    parser.flush();
    parser.drain();
    this.emit("processExit", { code: execution.exitCode, signal: execution.signal });

    if (execution.exitCode !== 0) {
      throw new Error(`Cursor process exited with code ${execution.exitCode}: ${execution.stderr}`);
    }

    return {
      events,
      sessionId: observedSessionId,
      resultText,
      stderr: execution.stderr,
      exitCode: execution.exitCode,
    };
  }

  private parseSessionLine(line: string): CliAgentSession | null {
    const words = line.split(CURSOR_REGEX.WHITESPACE);
    const id = words[0];
    if (!id || !CURSOR_REGEX.CHAT_ID.test(id)) {
      return null;
    }

    const title = line.slice(id.length).trim();
    return CliAgentSessionSchema.parse({
      id,
      title: title.length > 0 ? title : undefined,
    });
  }

  private buildPromptArgs(input: CliAgentPromptInput, apiKeyOverride?: string): string[] {
    const args: string[] = [
      CURSOR_CLI_ARG.PRINT,
      CURSOR_CLI_ARG.OUTPUT_FORMAT,
      CURSOR_CLI_ARG.STREAM_JSON,
      CURSOR_CLI_ARG.STREAM_PARTIAL_OUTPUT,
    ];

    const resumeSessionId = input.sessionId ?? this.latestSessionId;
    if (resumeSessionId) {
      args.push(CURSOR_CLI_ARG.RESUME, resumeSessionId);
    }
    if (input.model) {
      args.push(CURSOR_CLI_ARG.MODEL, input.model);
    }
    if (input.mode && input.mode !== "agent") {
      args.push(CURSOR_CLI_ARG.MODE, input.mode);
    }
    if (input.workspacePath) {
      args.push(CURSOR_CLI_ARG.WORKSPACE, input.workspacePath);
    }
    if (input.force) {
      args.push(CURSOR_CLI_ARG.FORCE);
    }
    if (input.sandbox) {
      args.push(CURSOR_CLI_ARG.SANDBOX, input.sandbox);
    }
    if (input.browser) {
      args.push(CURSOR_CLI_ARG.BROWSER);
    }
    if (input.approveMcps) {
      args.push(CURSOR_CLI_ARG.APPROVE_MCPS);
    }

    const apiKey = apiKeyOverride ?? this.env[ENV_KEY.CURSOR_API_KEY];
    if (apiKey) {
      args.push(CURSOR_CLI_ARG.API_KEY, apiKey);
    }

    return args;
  }

  private async runCommand(
    args: string[],
    options: CursorCommandOptions = {}
  ): Promise<CursorCommandResult> {
    const result = await this.runner.runCommand(args, {
      stdinText: options.stdinText,
      timeoutMs: options.timeoutMs,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }
}

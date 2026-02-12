import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { PERMISSION, type Permission } from "@/constants/permissions";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { TOOL_KIND, type ToolKind } from "@/constants/tool-kinds";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import { createCliHarnessAdapter } from "@/core/cli-agent/create-cli-harness-adapter";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import {
  resolveCliMode,
  toAboutResult,
  toLoginResult,
  toLogoutResult,
  toMcpResult,
  toModelsResult,
  toSandboxMode,
  toStatusResult,
} from "@/core/cursor/cursor-management";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import { HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import type {
  HarnessAdapter,
  HarnessRuntime,
  HarnessRuntimeEvents,
} from "@/harness/harnessAdapter";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";
import { getRulesState } from "@/rules/rules-service";
import type {
  CliAgentAboutResult,
  CliAgentLoginResult,
  CliAgentLogoutResult,
  CliAgentMcpListResult,
  CliAgentMode,
  CliAgentModelsResult,
  CliAgentSandboxMode,
  CliAgentStatusResult,
} from "@/types/cli-agent.types";
import type { CursorHookInput } from "@/types/cursor-hooks.types";
import type {
  AuthenticateRequest,
  AuthenticateResponse,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  RequestPermissionRequest,
  SessionNotification,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";
import { PROTOCOL_VERSION } from "@agentclientprotocol/sdk";

export type CursorCliHarnessAdapterEvents = HarnessRuntimeEvents;

export interface CursorCliHarnessAdapterOptions {
  connection?: CursorCliConnection;
  translator?: CursorToAcpTranslator;
  hookIpcServer?: HookIpcServer;
  hooksConfigGenerator?: HooksConfigGenerator;
  config?: HarnessConfig;
}

interface CursorPromptDefaults {
  model?: string;
  mode?: CliAgentMode;
  force: boolean;
  sandbox?: CliAgentSandboxMode;
  browser?: boolean;
  approveMcps?: boolean;
  workspacePath?: string;
}

export class CursorCliHarnessAdapter extends CliAgentBase implements HarnessRuntime {
  private readonly connection: CursorCliConnection;
  private readonly translator: CursorToAcpTranslator;
  private readonly hookIpcServer: HookIpcServer;
  private readonly hooksConfigGenerator: HooksConfigGenerator;
  private readonly sessionModelById = new Map<string, string>();
  private readonly sessionModeById = new Map<string, CliAgentMode>();
  private readonly promptDefaults: CursorPromptDefaults;
  private restoreHooks: (() => Promise<void>) | null = null;

  public constructor(options: CursorCliHarnessAdapterOptions = {}) {
    super();
    const config = options.config;
    const cursorConfig = config?.cursor;
    this.connection =
      options.connection ??
      new CursorCliConnection({
        command: config?.command,
        args: config?.args,
        cwd: config?.cwd,
        env: config?.env,
      });
    this.translator = options.translator ?? new CursorToAcpTranslator();
    this.hookIpcServer = options.hookIpcServer ?? new HookIpcServer();
    this.hooksConfigGenerator =
      options.hooksConfigGenerator ??
      new HooksConfigGenerator({
        projectRoot: config?.cwd ?? process.cwd(),
      });
    this.promptDefaults = {
      model: cursorConfig?.model,
      mode: cursorConfig?.mode,
      force: cursorConfig?.force ?? false,
      sandbox: toSandboxMode(cursorConfig?.sandbox),
      browser: cursorConfig?.browser,
      approveMcps: cursorConfig?.approveMcps,
      workspacePath: config?.cwd ?? process.cwd(),
    };

    this.connection.on("streamEvent", (event) => this.translator.handleEvent(event));
    this.connection.on("parseError", ({ reason }) => {
      this.emit("error", new Error(`Cursor parse error: ${reason}`));
    });
    this.connection.on("processExit", ({ code }) => {
      if (code !== 0) {
        this.emit("error", new Error(`Cursor process exited with code ${code}`));
      }
    });

    this.translator.on("sessionUpdate", (update) => this.emit("sessionUpdate", update));
    this.translator.on("error", (error) => this.emit("error", error));
  }

  public async connect(): Promise<void> {
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    const installInfo = await this.connection.verifyInstallation();
    if (!installInfo.installed) {
      this.setConnectionStatus(CONNECTION_STATUS.ERROR);
      throw new Error(
        `Cursor CLI binary '${installInfo.binaryName}' not found. Install cursor-agent or set ${ENV_KEY.TOADSTOOL_CURSOR_COMMAND}.`
      );
    }

    this.hookIpcServer.setHandlers({
      permissionRequest: async ({ payload }) => this.handleHookPermissionRequest(payload),
      contextInjection: async () => {
        const rules = getRulesState().rules;
        if (rules.length === 0) {
          return {};
        }
        const additionalContext = rules.map((rule) => rule.content).join("\n\n");
        return { additional_context: additionalContext };
      },
      continuation: async () => ({}),
      routeHandlers: {
        [CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT]: async ({ payload }) =>
          this.handleAfterAgentThought(payload),
        [CURSOR_HOOK_EVENT.AFTER_FILE_EDIT]: async ({ payload }) =>
          this.handleAfterFileEdit(payload),
      },
    });

    const endpoint = await this.hookIpcServer.start();
    const hookEnv = this.hooksConfigGenerator.createHookEnv(endpoint);
    this.connection.setEnv(hookEnv);
    const installResult = await this.hooksConfigGenerator.install(endpoint);
    this.restoreHooks = installResult.restore;
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTED);
  }

  public async disconnect(): Promise<void> {
    await this.connection.disconnect();
    await this.hookIpcServer.stop();
    if (this.restoreHooks) {
      await this.restoreHooks();
      this.restoreHooks = null;
    }
    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  public async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return {
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  public async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    const sessionId = await this.connection.createChat();
    return { sessionId };
  }

  public async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    const resolvedMode = resolveCliMode(params.modeId);
    if (resolvedMode) {
      this.sessionModeById.set(params.sessionId, resolvedMode);
      return {};
    }
    this.sessionModeById.delete(params.sessionId);
    return {};
  }

  public async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    this.sessionModelById.set(params.sessionId, params.modelId);
    return {};
  }

  public async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.withPromptGuard(async () => {
      const promptText = this.extractPromptText(params);
      const model = this.sessionModelById.get(params.sessionId) ?? this.promptDefaults.model;
      const mode = this.sessionModeById.get(params.sessionId) ?? this.promptDefaults.mode;
      const result = await this.connection.runPrompt({
        message: promptText,
        sessionId: params.sessionId,
        model,
        mode,
        sandbox: this.promptDefaults.sandbox,
        browser: this.promptDefaults.browser,
        approveMcps: this.promptDefaults.approveMcps,
        workspacePath: this.promptDefaults.workspacePath,
        force: this.promptDefaults.force,
        streaming: true,
      });
      if (result.sessionId && result.sessionId !== params.sessionId) {
        this.emit("sessionUpdate", {
          sessionId: result.sessionId,
          update: {
            sessionUpdate: SESSION_UPDATE_TYPE.SESSION_INFO_UPDATE,
          },
        });
      }
      return {
        stopReason: "end_turn",
      };
    });
  }

  public async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    const authStatus = await this.connection.verifyAuth();
    if (!authStatus.authenticated) {
      throw new Error(
        `Cursor authentication required. Run 'cursor-agent login' or set ${ENV_KEY.CURSOR_API_KEY}.`
      );
    }
    return {};
  }
  public async login(): Promise<CliAgentLoginResult> {
    return toLoginResult(await this.connection.login());
  }

  public async logout(): Promise<CliAgentLogoutResult> {
    return toLogoutResult(await this.connection.logout());
  }

  public async status(): Promise<CliAgentStatusResult> {
    return toStatusResult(await this.connection.verifyAuth());
  }

  public async about(): Promise<CliAgentAboutResult> {
    return toAboutResult(await this.connection.about());
  }

  public async models(): Promise<CliAgentModelsResult> {
    return toModelsResult(await this.connection.listModels());
  }

  public async mcp(): Promise<CliAgentMcpListResult> {
    return toMcpResult(await this.connection.listMcpServers());
  }

  public async sessionUpdate(_params: SessionNotification): Promise<void> {}

  private resolveHookSessionId(payload: CursorHookInput): string {
    return payload.session_id ?? payload.conversation_id;
  }

  private async handleHookPermissionRequest(
    payload: CursorHookInput
  ): Promise<Record<string, unknown>> {
    const decision = this.resolvePermissionDecision(payload);
    this.emitPermissionRequest(payload);

    if (
      payload.hook_event_name === CURSOR_HOOK_EVENT.PRE_TOOL_USE ||
      payload.hook_event_name === CURSOR_HOOK_EVENT.SUBAGENT_START
    ) {
      return { decision };
    }

    return { permission: decision };
  }

  private emitPermissionRequest(payload: CursorHookInput): void {
    const request = this.toPermissionRequest(payload);
    if (!request) {
      return;
    }
    this.emit("permissionRequest", request);
  }

  private toPermissionRequest(payload: CursorHookInput): RequestPermissionRequest | null {
    const sessionId = this.resolveHookSessionId(payload);
    const toolCallId = payload.generation_id;
    if (!toolCallId) {
      return null;
    }

    return {
      sessionId,
      toolCall: {
        toolCallId,
        title: this.getPermissionTitle(payload),
        kind: this.deriveToolKind(payload),
        rawInput: this.toPermissionRawInput(payload),
      },
      options: [
        { optionId: PERMISSION.ALLOW, kind: "allow_once", name: "Allow once" },
        { optionId: PERMISSION.DENY, kind: "reject_once", name: "Reject once" },
      ],
    };
  }

  private toPermissionRawInput(payload: CursorHookInput): Record<string, unknown> {
    const record = this.toRecord(payload);
    if (!record) {
      return {};
    }
    const eventName = record.hook_event_name;
    const command = record.command;
    const toolName = record.tool_name;
    const filePath = record.path;
    return {
      hook_event_name: eventName,
      ...(command !== undefined ? { command } : {}),
      ...(toolName !== undefined ? { tool_name: toolName } : {}),
      ...(filePath !== undefined ? { path: filePath } : {}),
    };
  }

  private resolvePermissionDecision(payload: CursorHookInput): Permission {
    const globalPermissions = getRulesState().permissions;
    const toolKind = this.deriveToolKind(payload);
    return globalPermissions[toolKind] ?? PERMISSION.ALLOW;
  }

  private getPermissionTitle(payload: CursorHookInput): string {
    if (payload.hook_event_name === CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION) {
      return this.getStringField(payload, "command") ?? payload.hook_event_name;
    }
    if (
      payload.hook_event_name === CURSOR_HOOK_EVENT.PRE_TOOL_USE ||
      payload.hook_event_name === CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION
    ) {
      return this.getStringField(payload, "tool_name") ?? payload.hook_event_name;
    }
    if (payload.hook_event_name === CURSOR_HOOK_EVENT.BEFORE_READ_FILE) {
      return this.getStringField(payload, "path") ?? payload.hook_event_name;
    }
    return payload.hook_event_name;
  }

  private deriveToolKind(payload: CursorHookInput): ToolKind {
    switch (payload.hook_event_name) {
      case CURSOR_HOOK_EVENT.BEFORE_READ_FILE:
        return TOOL_KIND.READ;
      case CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION:
        return TOOL_KIND.EXECUTE;
      case CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION:
        return TOOL_KIND.FETCH;
      case CURSOR_HOOK_EVENT.SUBAGENT_START:
        return TOOL_KIND.THINK;
      case CURSOR_HOOK_EVENT.PRE_TOOL_USE:
        return this.deriveToolKindFromName(this.getStringField(payload, "tool_name"));
      default:
        return TOOL_KIND.OTHER;
    }
  }

  private deriveToolKindFromName(toolName: string | undefined): ToolKind {
    if (!toolName) {
      return TOOL_KIND.OTHER;
    }
    const normalized = toolName.toLowerCase();
    if (normalized.includes("read")) {
      return TOOL_KIND.READ;
    }
    if (
      normalized.includes("edit") ||
      normalized.includes("write") ||
      normalized.includes("patch") ||
      normalized.includes("replace")
    ) {
      return TOOL_KIND.EDIT;
    }
    if (
      normalized.includes("search") ||
      normalized.includes("grep") ||
      normalized.includes("glob")
    ) {
      return TOOL_KIND.SEARCH;
    }
    if (
      normalized.includes("shell") ||
      normalized.includes("bash") ||
      normalized.includes("exec")
    ) {
      return TOOL_KIND.EXECUTE;
    }
    if (normalized.includes("fetch") || normalized.includes("web")) {
      return TOOL_KIND.FETCH;
    }
    return TOOL_KIND.OTHER;
  }

  private async handleAfterAgentThought(
    payload: CursorHookInput
  ): Promise<Record<string, unknown>> {
    if (payload.hook_event_name !== CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT) {
      return {};
    }

    const thought = this.getStringField(payload, "thought")?.trim();
    if (!thought) {
      return {};
    }

    this.emit("sessionUpdate", {
      sessionId: this.resolveHookSessionId(payload),
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK,
        content: {
          type: CONTENT_BLOCK_TYPE.TEXT,
          text: thought,
        },
      },
    });
    return {};
  }

  private async handleAfterFileEdit(payload: CursorHookInput): Promise<Record<string, unknown>> {
    if (payload.hook_event_name !== CURSOR_HOOK_EVENT.AFTER_FILE_EDIT) {
      return {};
    }

    const sessionId = this.resolveHookSessionId(payload);
    const edits = this.getRecordArrayField(payload, "edits");
    for (const [index, edit] of edits.entries()) {
      const callId = `cursor-after-file-edit-${payload.generation_id}-${index}`;
      const record = this.parseEditRecord(edit);
      if (!record) {
        continue;
      }
      const title = record.path ? `edit_file:${record.path}` : "edit_file";
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
          toolCallId: callId,
          title,
          rawInput: record,
          status: "in_progress",
        },
      });
      this.emit("sessionUpdate", {
        sessionId,
        update: {
          sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
          toolCallId: callId,
          rawOutput: {
            source: "afterFileEdit",
            path: record.path ?? this.getStringField(payload, "path"),
          },
          status: "completed",
        },
      });
    }
    return {};
  }

  private parseEditRecord(
    edit: unknown
  ): { path?: string; old_string?: string; new_string?: string } | null {
    if (!edit || typeof edit !== "object" || Array.isArray(edit)) {
      return null;
    }
    const entries = Object.entries(edit);
    const record: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      record[key] = value;
    }
    const path = typeof record.path === "string" ? record.path : undefined;
    const oldString = typeof record.old_string === "string" ? record.old_string : undefined;
    const newString = typeof record.new_string === "string" ? record.new_string : undefined;
    return {
      ...(path ? { path } : {}),
      ...(oldString !== undefined ? { old_string: oldString } : {}),
      ...(newString !== undefined ? { new_string: newString } : {}),
    };
  }

  private getStringField(payload: CursorHookInput, key: string): string | undefined {
    const record = this.toRecord(payload);
    if (!record) {
      return undefined;
    }
    const value = record[key];
    return typeof value === "string" ? value : undefined;
  }

  private getRecordArrayField(payload: CursorHookInput, key: string): Record<string, unknown>[] {
    const record = this.toRecord(payload);
    if (!record) {
      return [];
    }
    const value = record[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) => this.toRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      record[key] = entry;
    }
    return record;
  }
}

export const createCursorCliHarnessRuntime = (config: HarnessConfig): HarnessRuntime => {
  return new CursorCliHarnessAdapter({ config });
};

export const cursorCliHarnessAdapter: HarnessAdapter = createCliHarnessAdapter({
  id: HARNESS_DEFAULT.CURSOR_CLI_ID,
  name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
  configSchema: harnessConfigSchema,
  createRuntime: (config) => createCursorCliHarnessRuntime(config),
});

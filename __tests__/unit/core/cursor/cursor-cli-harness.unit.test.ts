import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENV_KEY } from "@/constants/env-keys";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_MODE } from "@/constants/session-modes";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CursorCliHarnessAdapter } from "@/core/cursor/cursor-cli-harness";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import type { HookIpcEndpoint, HookIpcServerHandlers } from "@/core/cursor/hook-ipc-server";
import { HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import { type HarnessConfig, harnessConfigSchema } from "@/harness/harnessConfig";
import { setRulesState } from "@/rules/rules-service";
import { CLI_AGENT_MODE, CLI_AGENT_SANDBOX_MODE } from "@/types/cli-agent.types";
import { describe, expect, it } from "vitest";

class FakeConnection extends CursorCliConnection {
  public installStatus = { installed: true, binaryName: "cursor-agent" };
  public authStatus = { authenticated: true };
  public loginStatus = {
    success: true,
    message: "Opening browser for login",
    requiresBrowser: true,
  };
  public logoutStatus = { success: true, message: "Logged out successfully" };
  public aboutInfo = {
    cliVersion: "1.2.3",
    model: "gpt-5",
    os: "linux",
    shell: "bash",
    userEmail: "dev@example.com",
    fields: { shell: "bash" },
  };
  public modelInfo = {
    models: [
      { id: "gpt-5", name: "GPT-5", isCurrent: true, isDefault: true },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", isCurrent: false, isDefault: false },
    ],
    defaultModel: "gpt-5",
    currentModel: "gpt-5",
  };
  public mcpServers = [{ name: "filesystem", status: "connected" }];
  public promptCalls: Array<{
    message: string;
    sessionId?: string;
    model?: string;
    mode?: string;
    sandbox?: string;
    browser?: boolean;
    approveMcps?: boolean;
    workspacePath?: string;
    force?: boolean;
  }> = [];
  public envUpdates: Array<Record<string, string>> = [];
  public deferredPrompt: Promise<void> | null = null;

  public constructor() {
    super({
      command: "cursor-agent",
      spawnFn: () => {
        throw new Error("spawn should not be used in fake");
      },
    });
  }

  public override setEnv(overrides: Record<string, string>): void {
    this.envUpdates.push(overrides);
  }

  public override async verifyInstallation() {
    return this.installStatus;
  }

  public override async verifyAuth() {
    return this.authStatus;
  }

  public override async createChat(): Promise<string> {
    return "session-123";
  }

  public override async login() {
    return this.loginStatus;
  }

  public override async logout() {
    return this.logoutStatus;
  }

  public override async about() {
    return this.aboutInfo;
  }

  public override async listModels() {
    return this.modelInfo;
  }

  public override async listMcpServers() {
    return this.mcpServers;
  }

  public override async runPrompt(input: {
    message: string;
    sessionId?: string;
    model?: string;
    mode?: string;
    sandbox?: string;
    browser?: boolean;
    approveMcps?: boolean;
    workspacePath?: string;
    force?: boolean;
  }) {
    this.promptCalls.push(input);
    if (this.deferredPrompt) {
      await this.deferredPrompt;
    }
    return {
      events: [],
      sessionId: input.sessionId ?? "session-123",
      resultText: "ok",
      stderr: "",
      exitCode: 0,
    };
  }

  public override async disconnect(): Promise<void> {}
}

class FakeHookServer extends HookIpcServer {
  public started = false;
  public stopped = false;
  public handlers: HookIpcServerHandlers | null = null;

  public constructor() {
    super({ transport: "http" });
  }

  public override setHandlers(handlers: HookIpcServerHandlers): void {
    this.handlers = handlers;
  }

  public override async start(): Promise<HookIpcEndpoint> {
    this.started = true;
    return { transport: "http", url: "http://127.0.0.1:9000/" };
  }

  public override async stop(): Promise<void> {
    this.stopped = true;
  }
}

class FakeHooksGenerator extends HooksConfigGenerator {
  public installed = false;
  public restored = false;

  public constructor() {
    super({ projectRoot: "/workspace" });
  }

  public override createHookEnv(): Record<string, string> {
    return {
      [ENV_KEY.TOADSTOOL_HOOK_SOCKET]: "/tmp/toadstool.sock",
    };
  }

  public override async install() {
    this.installed = true;
    return {
      hooksPath: "/workspace/.cursor/hooks.json",
      shimPath: "/workspace/.cursor/toadstool-cursor-hook-shim.mjs",
      restore: async () => {
        this.restored = true;
      },
    };
  }
}

class FakeTranslator extends CursorToAcpTranslator {
  public handleCalls = 0;
  public override handleEvent(): void {
    this.handleCalls += 1;
  }
}

const createHarness = (configOverrides: Partial<HarnessConfig> = {}) => {
  const connection = new FakeConnection();
  const hookServer = new FakeHookServer();
  const hooksGenerator = new FakeHooksGenerator();
  const translator = new FakeTranslator();
  const config = harnessConfigSchema.parse({
    id: "cursor-cli",
    name: "Cursor CLI",
    command: "cursor-agent",
    args: [],
    env: {},
    ...configOverrides,
  });
  const harness = new CursorCliHarnessAdapter({
    connection,
    hookIpcServer: hookServer,
    hooksConfigGenerator: hooksGenerator,
    translator,
    config,
  });
  return { harness, connection, hookServer, hooksGenerator };
};

describe("CursorCliHarnessAdapter", () => {
  it("connects successfully and installs hook integration", async () => {
    const { harness, hookServer, hooksGenerator, connection } = createHarness();
    const states: string[] = [];
    harness.on("state", (status) => states.push(status));

    await harness.connect();

    expect(states).toContain(CONNECTION_STATUS.CONNECTING);
    expect(states).toContain(CONNECTION_STATUS.CONNECTED);
    expect(hookServer.started).toBe(true);
    expect(hooksGenerator.installed).toBe(true);
    expect(connection.envUpdates[0]?.[ENV_KEY.TOADSTOOL_HOOK_SOCKET]).toBe("/tmp/toadstool.sock");
  });

  it("fails connect when cursor binary is missing", async () => {
    const { harness, connection } = createHarness();
    connection.installStatus = { installed: false, binaryName: "cursor-agent" };

    await expect(harness.connect()).rejects.toThrow("Cursor CLI binary");
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.ERROR);
  });

  it("authenticates with verifyAuth and errors when unauthenticated", async () => {
    const { harness, connection } = createHarness();
    connection.authStatus = { authenticated: false };

    await expect(harness.authenticate({})).rejects.toThrow("Cursor authentication required");
  });

  it("exposes management command methods via typed harness APIs", async () => {
    const { harness } = createHarness();
    const login = await harness.login();
    const logout = await harness.logout();
    const status = await harness.status();
    const about = await harness.about();
    const models = await harness.models();
    const mcp = await harness.mcp();

    expect(login.supported).toBe(true);
    expect(login.requiresBrowser).toBe(true);
    expect(logout.loggedOut).toBe(true);
    expect(status.authenticated).toBe(true);
    expect(about.version).toBe("1.2.3");
    expect(models.models).toContain("gpt-5");
    expect(mcp.servers[0]?.name).toBe("filesystem");
  });

  it("applies setSessionModel to subsequent prompts", async () => {
    const { harness, connection } = createHarness();
    await harness.connect();
    await harness.setSessionModel({ sessionId: "session-1", modelId: "gpt-5.2" });
    await harness.prompt({
      sessionId: "session-1",
      prompt: [{ type: "text", text: "hello" }],
    });

    expect(connection.promptCalls[0]?.model).toBe("gpt-5.2");
  });

  it("maps session mode updates to cursor CLI modes", async () => {
    const { harness, connection } = createHarness();
    await harness.connect();
    await harness.setSessionMode({ sessionId: "session-1", modeId: SESSION_MODE.READ_ONLY });
    await harness.prompt({
      sessionId: "session-1",
      prompt: [{ type: "text", text: "plan before editing" }],
    });

    expect(connection.promptCalls[0]?.mode).toBe(CLI_AGENT_MODE.ASK);
  });

  it("applies cursor prompt defaults from harness config", async () => {
    const { harness, connection } = createHarness({
      cwd: "/workspace/repo",
      cursor: {
        model: "gpt-5",
        mode: CLI_AGENT_MODE.PLAN,
        force: true,
        sandbox: true,
        browser: true,
        approveMcps: true,
      },
    });
    await harness.connect();
    await harness.prompt({
      sessionId: "session-1",
      prompt: [{ type: "text", text: "hello" }],
    });

    expect(connection.promptCalls[0]).toMatchObject({
      model: "gpt-5",
      mode: CLI_AGENT_MODE.PLAN,
      force: true,
      sandbox: CLI_AGENT_SANDBOX_MODE.ENABLED,
      browser: true,
      approveMcps: true,
      workspacePath: "/workspace/repo",
    });
  });

  it("guards against concurrent prompts", async () => {
    const { harness, connection } = createHarness();
    await harness.connect();

    let resolvePrompt: (() => void) | null = null;
    connection.deferredPrompt = new Promise<void>((resolve) => {
      resolvePrompt = resolve;
    });

    const firstPrompt = harness.prompt({
      sessionId: "session-1",
      prompt: [{ type: "text", text: "first" }],
    });
    const secondPrompt = harness.prompt({
      sessionId: "session-1",
      prompt: [{ type: "text", text: "second" }],
    });

    await expect(secondPrompt).rejects.toThrow("already in progress");
    if (resolvePrompt) {
      resolvePrompt();
    }
    await expect(firstPrompt).resolves.toMatchObject({ stopReason: "end_turn" });
  });

  it("registers context hook behavior", async () => {
    const { harness, hookServer } = createHarness();
    await harness.connect();

    const sessionStartResponse = await hookServer.handlers?.contextInjection?.({
      payload: {
        conversation_id: "conv",
        generation_id: "gen",
        model: "opus",
        hook_event_name: CURSOR_HOOK_EVENT.SESSION_START,
      },
    });

    expect(sessionStartResponse).toBeDefined();
  });

  it("emits thought and file diff updates from hook observers", async () => {
    const { harness, hookServer } = createHarness();
    const updates: Array<{ sessionId: string; updateType: string; payload: unknown }> = [];
    harness.on("sessionUpdate", (event) => {
      updates.push({
        sessionId: event.sessionId,
        updateType: event.update.sessionUpdate,
        payload: event.update,
      });
    });
    await harness.connect();

    await hookServer.handlers?.routeHandlers?.[CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT]?.({
      payload: {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        model: "opus",
        hook_event_name: CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
        thought: "Need to inspect tests first.",
      },
    });
    await hookServer.handlers?.routeHandlers?.[CURSOR_HOOK_EVENT.AFTER_FILE_EDIT]?.({
      payload: {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        model: "opus",
        hook_event_name: CURSOR_HOOK_EVENT.AFTER_FILE_EDIT,
        path: "src/foo.ts",
        edits: [
          {
            path: "src/foo.ts",
            old_string: "const a = 1;",
            new_string: "const a = 2;",
          },
        ],
      },
    });

    expect(
      updates.some((update) => update.updateType === SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK)
    ).toBe(true);
    expect(updates.some((update) => update.updateType === SESSION_UPDATE_TYPE.TOOL_CALL)).toBe(
      true
    );
    expect(
      updates.some((update) => update.updateType === SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE)
    ).toBe(true);
  });

  it("emits permission request events and applies tool-kind permission rules", async () => {
    setRulesState({
      rules: [],
      permissions: {
        [TOOL_KIND.EXECUTE]: PERMISSION.DENY,
      },
    });
    const { harness, hookServer } = createHarness();
    const requests: string[] = [];
    harness.on("permissionRequest", (request) => {
      requests.push(request.toolCall?.kind ?? "");
    });
    await harness.connect();

    const shellResponse = await hookServer.handlers?.permissionRequest?.({
      payload: {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        model: "opus",
        hook_event_name: CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
        command: "echo hello",
      },
    });

    expect(requests).toContain(TOOL_KIND.EXECUTE);
    expect(shellResponse).toMatchObject({ permission: PERMISSION.DENY });
    setRulesState({ rules: [], permissions: {} });
  });
});

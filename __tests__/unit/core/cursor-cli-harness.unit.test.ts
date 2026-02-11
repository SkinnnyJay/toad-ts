import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";
import { CONNECTION_STATUS } from "../../../src/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import { CURSOR_STREAM_TYPE } from "../../../src/constants/cursor-event-types";
import { CURSOR_HOOK_EVENT } from "../../../src/constants/cursor-hook-events";
import { CURSOR_HOOK_IPC_TRANSPORT } from "../../../src/constants/cursor-hook-ipc";
import { ENV_KEY } from "../../../src/constants/env-keys";
import { SESSION_UPDATE_TYPE } from "../../../src/constants/session-update-types";
import type {
  CursorPromptRequest,
  CursorPromptResult,
} from "../../../src/core/cursor/cursor-cli-connection";
import { CursorCliHarnessAdapter } from "../../../src/core/cursor/cursor-cli-harness";
import type { CursorHookPermissionRequest } from "../../../src/core/cursor/hook-ipc-server";
import type { CursorHookInput } from "../../../src/types/cursor-hooks.types";

const sessionId = "14855632-18d5-44a3-ab27-5c93e95a8011";

class FakeCursorConnection extends EventEmitter<{
  event: (event: {
    type: "assistant";
    session_id: string;
    message: { role: "assistant"; content: Array<{ type: "text"; text: string }> };
  }) => void;
  stderr: (_chunk: string) => void;
  error: (_error: Error) => void;
  exit: (_info: { code: number | null; signal: NodeJS.Signals | null }) => void;
}> {
  public promptRequests: CursorPromptRequest[] = [];
  public managementRequests: string[][] = [];

  async verifyInstallation(): Promise<{ installed: boolean; version?: string }> {
    return { installed: true, version: "1.0.0" };
  }

  async verifyAuth(): Promise<{ authenticated: boolean }> {
    return { authenticated: true };
  }

  async listModels(): Promise<{
    models: Array<{ id: string; name: string }>;
    defaultModel?: string;
  }> {
    return {
      models: [{ id: "opus-4.6-thinking", name: "Claude 4.6 Opus (Thinking)" }],
      defaultModel: "opus-4.6-thinking",
    };
  }

  async createChat(): Promise<string> {
    return sessionId;
  }

  async listSessions(): Promise<string[]> {
    return [sessionId];
  }

  async spawnPrompt(request: CursorPromptRequest): Promise<CursorPromptResult> {
    this.promptRequests.push(request);
    this.emit("event", {
      type: CURSOR_STREAM_TYPE.ASSISTANT,
      session_id: sessionId,
      message: {
        role: "assistant",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
      },
    });
    return {
      sessionId,
      resultText: "hello",
      events: [],
      stderr: "",
      exitCode: 0,
      signal: null,
    };
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async runManagementCommand(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.managementRequests.push(args);
    return {
      stdout: "ok",
      stderr: "",
      exitCode: 0,
    };
  }
}

class FakeHookServer extends EventEmitter<{
  hookEvent: (_event: CursorHookInput) => void;
  permissionRequest: (_request: CursorHookPermissionRequest) => void;
  error: (_error: Error) => void;
}> {
  public started = false;
  public stopped = false;

  async start(): Promise<{ transport: "http"; url: string }> {
    this.started = true;
    return {
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      url: "http://127.0.0.1:7777/hook",
    };
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }
}

describe("CursorCliHarnessAdapter", () => {
  it("connects, initializes, prompts, and emits translated session updates", async () => {
    const connection = new FakeCursorConnection();
    const hookServer = new FakeHookServer();
    let installCalled = 0;
    let cleanupCalled = 0;
    const sessionUpdates: string[] = [];
    const permissionRequestIds: string[] = [];

    const harness = new CursorCliHarnessAdapter({
      connection,
      hookServer,
      installHooksFn: async ({ socketTarget }) => {
        installCalled += 1;
        expect(socketTarget).toBe("http://127.0.0.1:7777/hook");
        return {
          paths: {
            hooksFilePath: "/tmp/hooks.json",
            toadstoolHooksDir: "/tmp/.toadstool/hooks",
            nodeShimPath: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
            bashShimPath: "/tmp/.toadstool/hooks/toadstool-hook.sh",
          },
          previousHooksRaw: null,
          generatedCommand: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
          generatedConfig: {
            version: 1,
            hooks: {},
          },
        };
      },
      cleanupHooksFn: async () => {
        cleanupCalled += 1;
      },
      env: {},
    });

    harness.on("sessionUpdate", (update) => {
      sessionUpdates.push(update.update.sessionUpdate);
    });
    harness.on("permissionRequest", (request) => {
      permissionRequestIds.push(request.toolCall.toolCallId);
    });

    await harness.connect();
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.CONNECTED);
    expect(installCalled).toBe(1);
    expect(hookServer.started).toBe(true);

    const initialized = await harness.initialize();
    expect(initialized.protocolVersion).toBeDefined();

    const created = await harness.newSession({ cwd: "/workspace", mcpServers: [] });
    expect(created.sessionId).toBe(sessionId);

    await harness.setSessionMode({ sessionId, modeId: "plan" });
    await harness.setSessionModel({ sessionId, modelId: "opus-4.6-thinking" });
    const promptResult = await harness.prompt({
      sessionId,
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
    });

    hookServer.emit("hookEvent", {
      conversation_id: sessionId,
      hook_event_name: CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
      thought: "Need to inspect the diff before applying changes.",
      workspace_roots: ["/workspace"],
    });
    hookServer.emit("permissionRequest", {
      requestId: "permission-shell-1",
      responseField: "permission",
      event: {
        conversation_id: sessionId,
        hook_event_name: CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
        command: "npm run test",
        workspace_roots: ["/workspace"],
      },
    });
    hookServer.emit("hookEvent", {
      conversation_id: sessionId,
      hook_event_name: CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION,
      command: "npm run test",
      exit_code: 0,
      stdout: "ok",
      stderr: "",
      workspace_roots: ["/workspace"],
    });
    hookServer.emit("hookEvent", {
      conversation_id: sessionId,
      hook_event_name: CURSOR_HOOK_EVENT.AFTER_FILE_EDIT,
      path: "src/index.ts",
      edits: [
        {
          path: "src/index.ts",
          old_string: "old",
          new_string: "new",
        },
      ],
      workspace_roots: ["/workspace"],
    });

    expect(promptResult.stopReason).toBe("end_turn");
    expect(connection.promptRequests).toHaveLength(1);
    expect(connection.promptRequests[0]?.mode).toBe("plan");
    expect(connection.promptRequests[0]?.model).toBe("opus-4.6-thinking");
    expect(connection.promptRequests[0]?.envOverrides?.[ENV_KEY.TOADSTOOL_HOOK_SOCKET]).toBe(
      "http://127.0.0.1:7777/hook"
    );
    const managementResult = await harness.runAgentCommand(["status"]);
    expect(managementResult.stdout).toBe("ok");
    expect(connection.managementRequests[0]).toEqual(["status"]);
    const listedSessions = await harness.listAgentSessions();
    expect(listedSessions).toEqual([{ id: sessionId }]);
    expect(permissionRequestIds).toEqual(["hook-14855632-18d5-44a3-ab27-5c93e95a8011-1"]);
    expect(sessionUpdates).toContain(SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    expect(sessionUpdates).toContain(SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK);
    expect(sessionUpdates).toContain(SESSION_UPDATE_TYPE.TOOL_CALL);
    expect(sessionUpdates).toContain(SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE);

    await harness.disconnect();
    expect(hookServer.stopped).toBe(true);
    expect(cleanupCalled).toBe(1);
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });

  it("fails connect when installation or auth is missing", async () => {
    const connection = new FakeCursorConnection();
    connection.verifyInstallation = async () => ({ installed: false });
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookServer: new FakeHookServer(),
      installHooksFn: async () => {
        throw new Error("should not install hooks when missing binary");
      },
      cleanupHooksFn: async () => {},
      env: {},
    });

    await expect(harness.connect()).rejects.toThrow("not installed");
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);

    const authConnection = new FakeCursorConnection();
    authConnection.verifyAuth = async () => ({ authenticated: false });
    const authHarness = new CursorCliHarnessAdapter({
      connection: authConnection,
      hookServer: new FakeHookServer(),
      installHooksFn: async () => {
        throw new Error("should not install hooks when auth is missing");
      },
      cleanupHooksFn: async () => {},
      env: {},
    });

    await expect(authHarness.connect()).rejects.toThrow("cursor-agent login");
    expect(authHarness.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });

  it("allows connect with CURSOR_API_KEY when auth status is false", async () => {
    const connection = new FakeCursorConnection();
    connection.verifyAuth = async () => ({ authenticated: false });
    const hookServer = new FakeHookServer();

    const harness = new CursorCliHarnessAdapter({
      connection,
      hookServer,
      installHooksFn: async () => ({
        paths: {
          hooksFilePath: "/tmp/hooks.json",
          toadstoolHooksDir: "/tmp/.toadstool/hooks",
          nodeShimPath: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
          bashShimPath: "/tmp/.toadstool/hooks/toadstool-hook.sh",
        },
        previousHooksRaw: null,
        generatedCommand: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
        generatedConfig: {
          version: 1,
          hooks: {},
        },
      }),
      cleanupHooksFn: async () => {},
      env: { [ENV_KEY.CURSOR_API_KEY]: "token" },
    });

    await harness.connect();
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.CONNECTED);
    expect(hookServer.started).toBe(true);
    await harness.disconnect();
  });

  it("rejects concurrent prompts while one prompt is in flight", async () => {
    const connection = new FakeCursorConnection();
    let releasePrompt: (() => void) | null = null;
    connection.spawnPrompt = async (request: CursorPromptRequest): Promise<CursorPromptResult> => {
      connection.promptRequests.push(request);
      await new Promise<void>((resolve) => {
        releasePrompt = resolve;
      });
      return {
        sessionId,
        resultText: "done",
        events: [],
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    };

    const harness = new CursorCliHarnessAdapter({
      connection,
      hookServer: new FakeHookServer(),
      installHooksFn: async () => ({
        paths: {
          hooksFilePath: "/tmp/hooks.json",
          toadstoolHooksDir: "/tmp/.toadstool/hooks",
          nodeShimPath: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
          bashShimPath: "/tmp/.toadstool/hooks/toadstool-hook.sh",
        },
        previousHooksRaw: null,
        generatedCommand: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
        generatedConfig: {
          version: 1,
          hooks: {},
        },
      }),
      cleanupHooksFn: async () => {},
      env: {},
    });

    await harness.connect();
    const firstPrompt = harness.prompt({
      sessionId,
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "first" }],
    });

    await expect(
      harness.prompt({
        sessionId,
        prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "second" }],
      })
    ).rejects.toThrow("already in progress");

    releasePrompt?.();
    await expect(firstPrompt).resolves.toEqual({ stopReason: "end_turn" });
    await harness.disconnect();
  });
});

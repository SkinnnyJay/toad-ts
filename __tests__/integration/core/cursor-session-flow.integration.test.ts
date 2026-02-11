import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import { CURSOR_STREAM_TYPE } from "../../../src/constants/cursor-event-types";
import { CURSOR_HOOK_IPC_TRANSPORT } from "../../../src/constants/cursor-hook-ipc";
import type {
  CursorPromptRequest,
  CursorPromptResult,
} from "../../../src/core/cursor/cursor-cli-connection";
import { CursorCliHarnessAdapter } from "../../../src/core/cursor/cursor-cli-harness";
import { SessionManager } from "../../../src/core/session-manager";
import { SessionStream } from "../../../src/core/session-stream";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema } from "../../../src/types/domain";

class IntegrationFakeConnection extends EventEmitter<{
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
    return { models: [{ id: "auto", name: "Auto" }], defaultModel: "auto" };
  }

  async createChat(): Promise<string> {
    return "session-cursor-integration";
  }

  async spawnPrompt(request: CursorPromptRequest): Promise<CursorPromptResult> {
    this.promptRequests.push(request);
    this.emit("event", {
      type: CURSOR_STREAM_TYPE.ASSISTANT,
      session_id: "session-cursor-integration",
      message: {
        role: "assistant",
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "integration response" }],
      },
    });
    return {
      sessionId: "session-cursor-integration",
      resultText: "integration response",
      events: [],
      stderr: "",
      exitCode: 0,
      signal: null,
    };
  }

  async disconnect(): Promise<void> {
    // no-op
  }
}

class IntegrationFakeHookServer extends EventEmitter<{ error: (_error: Error) => void }> {
  async start(): Promise<{ transport: "http"; url: string }> {
    return {
      transport: CURSOR_HOOK_IPC_TRANSPORT.HTTP,
      url: "http://127.0.0.1:8899/hook",
    };
  }

  async stop(): Promise<void> {
    // no-op
  }
}

describe("Cursor session flow integration", () => {
  it("creates a session and streams assistant updates into the store", async () => {
    const store = useAppStore.getState();
    store.reset();

    const connection = new IntegrationFakeConnection();
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookServer: new IntegrationFakeHookServer(),
      installHooksFn: async () => ({
        paths: {
          hooksFilePath: "/tmp/hooks.json",
          toadstoolHooksDir: "/tmp/.toadstool/hooks",
          nodeShimPath: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
          bashShimPath: "/tmp/.toadstool/hooks/toadstool-hook.sh",
        },
        previousHooksRaw: null,
        generatedCommand: "/tmp/.toadstool/hooks/toadstool-hook.mjs",
        generatedConfig: { version: 1, hooks: {} },
      }),
      cleanupHooksFn: async () => {},
    });

    const sessionStream = new SessionStream(store);
    const detach = sessionStream.attach(harness);
    const manager = new SessionManager(harness, store);

    try {
      await harness.connect();
      await harness.initialize();
      const session = await manager.createSession({
        cwd: process.cwd(),
        agentId: AgentIdSchema.parse("cursor-cli"),
        title: "Cursor Integration",
        mode: "auto",
        model: "opus-4.6-thinking",
      });

      await harness.prompt({
        sessionId: session.id,
        prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello from integration" }],
      });

      const messages = store.getMessagesForSession(session.id);
      const assistantMessages = messages.filter((message) => message.role === "assistant");
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(connection.promptRequests[0]?.model).toBe("opus-4.6-thinking");
    } finally {
      detach();
      await harness.disconnect();
    }
  });
});

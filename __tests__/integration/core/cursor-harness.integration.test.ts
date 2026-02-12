import { readFileSync } from "node:fs";
import path from "node:path";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { CursorCliConnection } from "@/core/cursor/cursor-cli-connection";
import { CursorCliHarnessAdapter } from "@/core/cursor/cursor-cli-harness";
import type { HookIpcEndpoint, HookIpcServerHandlers } from "@/core/cursor/hook-ipc-server";
import { HookIpcServer } from "@/core/cursor/hook-ipc-server";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import { SessionStream } from "@/core/session-stream";
import { useAppStore } from "@/store/app-store";
import { cursorStreamEvent } from "@/types/cursor-cli.types";
import { afterEach, describe, expect, it } from "vitest";
import { setupSession } from "../../utils/ink-test-helpers";

class StreamingFakeConnection extends CursorCliConnection {
  public installStatus = { installed: true, binaryName: "cursor-agent" };
  public authStatus = { authenticated: true };
  public createChatId = "session-created";
  public promptCalls: Array<{ message: string; sessionId?: string; model?: string }> = [];
  public streamEvents = readFileSync(
    path.join(process.cwd(), "__tests__/fixtures/cursor/ndjson/tool-use-response.ndjson"),
    "utf8"
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => cursorStreamEvent.parse(JSON.parse(line)));
  public shouldThrowPromptError = false;

  public constructor() {
    super({
      command: "cursor-agent",
      spawnFn: () => {
        throw new Error("spawn should not run in integration fake");
      },
    });
  }

  public override async verifyInstallation() {
    return this.installStatus;
  }

  public override async verifyAuth() {
    return this.authStatus;
  }

  public override async createChat(): Promise<string> {
    return this.createChatId;
  }

  public override async runPrompt(input: {
    message: string;
    sessionId?: string;
    model?: string;
    force: boolean;
    streaming: boolean;
  }) {
    this.promptCalls.push(input);
    if (this.shouldThrowPromptError) {
      throw new Error("prompt crashed");
    }
    for (const event of this.streamEvents) {
      this.emit("streamEvent", event);
    }
    return {
      events: this.streamEvents,
      sessionId: input.sessionId ?? this.createChatId,
      resultText: "done",
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
    return { transport: "http", url: "http://127.0.0.1:9090/" };
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
      [ENV_KEY.TOADSTOOL_HOOK_SOCKET]: "http://127.0.0.1:9090/",
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

describe("Cursor harness integration", () => {
  afterEach(() => {
    useAppStore.getState().reset();
  });

  it("fails connect when cursor binary is missing", async () => {
    const connection = new StreamingFakeConnection();
    connection.installStatus = { installed: false, binaryName: "cursor-agent" };
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookIpcServer: new FakeHookServer(),
      hooksConfigGenerator: new FakeHooksGenerator(),
    });

    await expect(harness.connect()).rejects.toThrow("Cursor CLI binary");
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.ERROR);
  });

  it("fails authenticate when cursor is not logged in", async () => {
    const connection = new StreamingFakeConnection();
    connection.authStatus = { authenticated: false };
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookIpcServer: new FakeHookServer(),
      hooksConfigGenerator: new FakeHooksGenerator(),
    });

    await expect(harness.authenticate({})).rejects.toThrow("Cursor authentication required");
  });

  it("emits runtime error on unexpected cursor process exit", async () => {
    const connection = new StreamingFakeConnection();
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookIpcServer: new FakeHookServer(),
      hooksConfigGenerator: new FakeHooksGenerator(),
    });
    const errors: string[] = [];
    harness.on("error", (error) => {
      errors.push(error.message);
    });

    connection.emit("processExit", { code: 9, signal: null });
    expect(errors.some((message) => message.includes("code 9"))).toBe(true);
  });

  it("streams cursor events through SessionStream into store messages and tools", async () => {
    const sessionId = setupSession({ sessionId: "14855632-18d5-44a3-ab27-5c93e95a8011" });
    const connection = new StreamingFakeConnection();
    const hookServer = new FakeHookServer();
    const hooksGenerator = new FakeHooksGenerator();
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookIpcServer: hookServer,
      hooksConfigGenerator: hooksGenerator,
    });
    const stream = new SessionStream(useAppStore.getState());
    stream.attach(harness);

    await harness.connect();
    await harness.prompt({
      sessionId,
      prompt: [{ type: "text", text: "read README in one line" }],
    });

    const messages = useAppStore.getState().getMessagesForSession(sessionId);
    expect(messages.length).toBeGreaterThan(0);
    expect(
      messages.some((message) =>
        message.content.some((block) => block.type === CONTENT_BLOCK_TYPE.TOOL_CALL)
      )
    ).toBe(true);
    expect(
      messages.some((message) =>
        message.content.some(
          (block) =>
            block.type === CONTENT_BLOCK_TYPE.TEXT &&
            block.text.includes("toadstool-cursor-fixture.txt")
        )
      )
    ).toBe(true);
  });

  it("creates chat ids and passes session/model into prompt calls", async () => {
    const connection = new StreamingFakeConnection();
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookIpcServer: new FakeHookServer(),
      hooksConfigGenerator: new FakeHooksGenerator(),
    });
    await harness.connect();

    const session = await harness.newSession({ cwd: "/workspace" });
    await harness.setSessionModel({ sessionId: session.sessionId, modelId: "gpt-5.2" });
    await harness.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: "hello" }],
    });

    expect(session.sessionId).toBe("session-created");
    expect(connection.promptCalls[0]?.sessionId).toBe("session-created");
    expect(connection.promptCalls[0]?.model).toBe("gpt-5.2");
  });

  it("handles prompt failure and allows subsequent prompt retries", async () => {
    const sessionId = setupSession({ sessionId: "session-created" });
    const connection = new StreamingFakeConnection();
    const harness = new CursorCliHarnessAdapter({
      connection,
      hookIpcServer: new FakeHookServer(),
      hooksConfigGenerator: new FakeHooksGenerator(),
    });
    await harness.connect();

    connection.shouldThrowPromptError = true;
    await expect(
      harness.prompt({
        sessionId,
        prompt: [{ type: "text", text: "first" }],
      })
    ).rejects.toThrow("prompt crashed");

    connection.shouldThrowPromptError = false;
    await expect(
      harness.prompt({
        sessionId,
        prompt: [{ type: "text", text: "retry" }],
      })
    ).resolves.toMatchObject({ stopReason: "end_turn" });
  });
});

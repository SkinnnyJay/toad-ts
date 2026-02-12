import { PassThrough, Readable, Writable } from "node:stream";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ERROR_CODE } from "@/constants/error-codes";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SESSION_MODE } from "@/constants/session-modes";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { EnvManager } from "@/utils/env/env.utils";
import {
  type Agent,
  AgentSideConnection,
  PROTOCOL_VERSION,
  type SessionNotification,
  type Stream,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it, vi } from "vitest";
import type { ACPConnectionLike } from "../../../src/core/acp-client";
import type { ACPConnectionOptions } from "../../../src/core/acp-connection";
import {
  ClaudeCliHarnessAdapter,
  claudeCliHarnessAdapter,
} from "../../../src/core/claude-cli-harness";
import type { ConnectionStatus } from "../../../src/types/domain";

class FakeConnection extends EventEmitter implements ACPConnectionLike {
  connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;

  constructor(private readonly stream: Stream) {
    super();
  }

  async connect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.CONNECTED;
    this.emit("state", this.connectionStatus);
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.emit("state", this.connectionStatus);
  }

  getStream(): Stream {
    return this.stream;
  }
}

const createStreamPair = (): {
  clientStream: Stream;
  agentStream: Stream;
  clientToAgent: PassThrough;
  agentToClient: PassThrough;
} => {
  const clientToAgent = new PassThrough();
  const agentToClient = new PassThrough();
  const clientStream = ndJsonStream(
    Writable.toWeb(clientToAgent) as unknown as WritableStream<Uint8Array>,
    Readable.toWeb(agentToClient) as unknown as ReadableStream<Uint8Array>
  );
  const agentStream = ndJsonStream(
    Writable.toWeb(agentToClient) as unknown as WritableStream<Uint8Array>,
    Readable.toWeb(clientToAgent) as unknown as ReadableStream<Uint8Array>
  );

  return { clientStream, agentStream, clientToAgent, agentToClient };
};

const createClientStream = (): Stream => {
  const input = new PassThrough();
  const output = new PassThrough();
  return ndJsonStream(
    Writable.toWeb(input) as unknown as WritableStream<Uint8Array>,
    Readable.toWeb(output) as unknown as ReadableStream<Uint8Array>
  );
};

class FlakyConnection extends EventEmitter implements ACPConnectionLike {
  connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private attempts = 0;

  constructor(
    private readonly stream: Stream,
    private readonly failCount: number
  ) {
    super();
  }

  async connect(): Promise<void> {
    this.attempts += 1;
    if (this.attempts <= this.failCount) {
      this.connectionStatus = CONNECTION_STATUS.ERROR;
      this.emit("state", this.connectionStatus);
      const error = new Error(`connect failed ${this.attempts}`);
      throw Object.assign(error, { code: "ECONNREFUSED" });
    }
    this.connectionStatus = CONNECTION_STATUS.CONNECTED;
    this.emit("state", this.connectionStatus);
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.emit("state", this.connectionStatus);
  }

  getStream(): Stream {
    return this.stream;
  }

  get attemptCount(): number {
    return this.attempts;
  }
}

class FatalConnection extends EventEmitter implements ACPConnectionLike {
  connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private attempts = 0;

  constructor(
    private readonly stream: Stream,
    private readonly error: NodeJS.ErrnoException
  ) {
    super();
  }

  async connect(): Promise<void> {
    this.attempts += 1;
    this.connectionStatus = CONNECTION_STATUS.ERROR;
    this.emit("state", this.connectionStatus);
    throw this.error;
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.emit("state", this.connectionStatus);
  }

  getStream(): Stream {
    return this.stream;
  }

  get attemptCount(): number {
    return this.attempts;
  }
}

describe("ClaudeCliHarnessAdapter", () => {
  it("connects and routes ACP session updates", async () => {
    const { clientStream, agentStream, clientToAgent, agentToClient } = createStreamPair();

    const agentConnection = new AgentSideConnection((conn) => {
      const agent: Agent = {
        initialize: async () => ({ protocolVersion: PROTOCOL_VERSION }),
        authenticate: async () => ({}),
        cancel: async () => {},
        newSession: async () => ({ sessionId: "session-1" }),
        prompt: async (params) => {
          await conn.sessionUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
              content: { type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" },
            },
          });
          return { stopReason: "end_turn" };
        },
      };
      return agent;
    }, agentStream);

    const connection = new FakeConnection(clientStream);
    const adapter = new ClaudeCliHarnessAdapter({ connection });
    const updates: SessionNotification[] = [];
    adapter.on("sessionUpdate", (update) => updates.push(update));

    await adapter.connect();
    const init = await adapter.initialize();
    const session = await adapter.newSession({ cwd: ".", mcpServers: [] });
    const result = await adapter.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hi" }],
    });

    expect(init.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(result.stopReason).toBe("end_turn");
    expect(updates).toHaveLength(1);
    expect(agentConnection).toBeDefined();

    await adapter.disconnect();
    clientToAgent.end();
    agentToClient.end();
  });

  it("resolves command and args from env defaults", () => {
    const originalCommand = process.env.TOADSTOOL_CLAUDE_COMMAND;
    const originalArgs = process.env.TOADSTOOL_CLAUDE_ARGS;

    process.env.TOADSTOOL_CLAUDE_COMMAND = "claude-code-acp";
    process.env.TOADSTOOL_CLAUDE_ARGS = "--experimental-acp --model sonnet";
    EnvManager.resetInstance();

    const captured: ACPConnectionOptions[] = [];
    const adapter = new ClaudeCliHarnessAdapter({
      connectionFactory: (options) => {
        captured.push(options);
        return new FakeConnection(createClientStream());
      },
    });

    expect(adapter.command).toBe("claude-code-acp");
    expect(adapter.args).toEqual(["--experimental-acp", "--model", "sonnet"]);
    expect(captured[0]?.command).toBe("claude-code-acp");
    expect(captured[0]?.args).toEqual(["--experimental-acp", "--model", "sonnet"]);

    if (originalCommand === undefined) {
      Reflect.deleteProperty(process.env, "TOADSTOOL_CLAUDE_COMMAND");
    } else {
      process.env.TOADSTOOL_CLAUDE_COMMAND = originalCommand;
    }

    if (originalArgs === undefined) {
      Reflect.deleteProperty(process.env, "TOADSTOOL_CLAUDE_ARGS");
    } else {
      process.env.TOADSTOOL_CLAUDE_ARGS = originalArgs;
    }
    EnvManager.resetInstance();
  });

  it("retries connection with backoff before succeeding", async () => {
    vi.useFakeTimers();
    const connection = new FlakyConnection(createClientStream(), 2);
    const adapter = new ClaudeCliHarnessAdapter({ connection });

    const connectPromise = adapter.connect();
    await vi.runAllTimersAsync();

    await expect(connectPromise).resolves.toBeUndefined();
    expect(connection.attemptCount).toBe(3);
    vi.useRealTimers();
  });

  it("stops retrying when error is not recoverable", async () => {
    vi.useFakeTimers();
    const enoentError = Object.assign(new Error("missing binary"), { code: "ENOENT" });
    const connection = new FatalConnection(createClientStream(), enoentError);
    const adapter = new ClaudeCliHarnessAdapter({ connection });

    await expect(adapter.connect()).rejects.toThrow("missing binary");
    expect(connection.attemptCount).toBe(1);
    vi.useRealTimers();
  });

  it("rejects concurrent prompt calls while a prompt is in progress", async () => {
    const { clientStream, agentStream, clientToAgent, agentToClient } = createStreamPair();
    let releasePrompt: (() => void) | undefined;
    const promptRelease = new Promise<void>((resolve) => {
      releasePrompt = resolve;
    });

    const agentConnection = new AgentSideConnection((conn) => {
      const agent: Agent = {
        initialize: async () => ({ protocolVersion: PROTOCOL_VERSION }),
        authenticate: async () => ({}),
        cancel: async () => {},
        newSession: async () => ({ sessionId: "session-guard" }),
        prompt: async (params) => {
          await conn.sessionUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
              content: { type: CONTENT_BLOCK_TYPE.TEXT, text: "waiting" },
            },
          });
          await promptRelease;
          return { stopReason: "end_turn" };
        },
      };
      return agent;
    }, agentStream);

    const adapter = new ClaudeCliHarnessAdapter({ connection: new FakeConnection(clientStream) });

    await adapter.connect();
    const session = await adapter.newSession({ cwd: ".", mcpServers: [] });
    const firstPrompt = adapter.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "first" }],
    });

    await expect(
      adapter.prompt({
        sessionId: session.sessionId,
        prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "second" }],
      })
    ).rejects.toThrow("Prompt already in progress for this harness instance.");

    releasePrompt?.();
    await expect(firstPrompt).resolves.toEqual({ stopReason: "end_turn" });

    expect(agentConnection).toBeDefined();
    await adapter.disconnect();
    clientToAgent.end();
    agentToClient.end();
  });

  it("passes session mode/model updates through when agent supports them", async () => {
    const { clientStream, agentStream, clientToAgent, agentToClient } = createStreamPair();
    const setSessionModeSpy = vi.fn(async () => ({}));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const agentConnection = new AgentSideConnection((_conn) => {
      const agent: Agent = {
        initialize: async () => ({ protocolVersion: PROTOCOL_VERSION }),
        authenticate: async () => ({}),
        cancel: async () => {},
        newSession: async () => ({ sessionId: "session-mode-model" }),
        prompt: async () => ({ stopReason: "end_turn" }),
        setSessionMode: setSessionModeSpy,
      };
      return agent;
    }, agentStream);

    const adapter = new ClaudeCliHarnessAdapter({ connection: new FakeConnection(clientStream) });

    try {
      await adapter.connect();
      await adapter.initialize();

      await expect(
        adapter.setSessionMode({ sessionId: "session-mode-model", modeId: SESSION_MODE.AUTO })
      ).resolves.toEqual({});
      await expect(
        adapter.setSessionModel({ sessionId: "session-mode-model", modelId: "sonnet" })
      ).resolves.toEqual({});

      expect(setSessionModeSpy).toHaveBeenCalledWith({
        sessionId: "session-mode-model",
        modeId: SESSION_MODE.AUTO,
      });

      expect(agentConnection).toBeDefined();
      await adapter.disconnect();
      clientToAgent.end();
      agentToClient.end();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("exposes claude adapter metadata and runtime factory wiring", () => {
    const config = harnessConfigSchema.parse({
      id: HARNESS_DEFAULT.CLAUDE_CLI_ID,
      name: HARNESS_DEFAULT.CLAUDE_CLI_NAME,
      command: HARNESS_DEFAULT.CLAUDE_COMMAND,
      args: HARNESS_DEFAULT.CLAUDE_ARGS,
      env: {},
    });

    const runtime = claudeCliHarnessAdapter.createHarness(config);

    expect(claudeCliHarnessAdapter.id).toBe(HARNESS_DEFAULT.CLAUDE_CLI_ID);
    expect(claudeCliHarnessAdapter.name).toBe(HARNESS_DEFAULT.CLAUDE_CLI_NAME);
    expect(runtime).toBeInstanceOf(ClaudeCliHarnessAdapter);
    expect(runtime.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });

  it("rethrows non-method-not-found errors from setSessionMode", async () => {
    const adapter = new ClaudeCliHarnessAdapter({
      connection: new FakeConnection(createClientStream()),
    });
    const patchedError = { code: ERROR_CODE.AUTH_REQUIRED, message: "Auth required" };
    const patchedClient = Reflect.get(adapter, "client") as {
      setSessionMode: (params: { sessionId: string; modeId: string }) => Promise<unknown>;
    };
    patchedClient.setSessionMode = vi.fn(async () => {
      throw patchedError;
    });

    await expect(
      adapter.setSessionMode({ sessionId: "session-mode-model", modeId: SESSION_MODE.AUTO })
    ).rejects.toBe(patchedError);
  });

  it("rethrows non-method-not-found errors from setSessionModel", async () => {
    const adapter = new ClaudeCliHarnessAdapter({
      connection: new FakeConnection(createClientStream()),
    });
    const patchedError = { code: ERROR_CODE.AUTH_REQUIRED, message: "Auth required" };
    const patchedClient = Reflect.get(adapter, "client") as {
      setSessionModel: (params: { sessionId: string; modelId: string }) => Promise<unknown>;
    };
    patchedClient.setSessionModel = vi.fn(async () => {
      throw patchedError;
    });

    await expect(
      adapter.setSessionModel({ sessionId: "session-mode-model", modelId: "sonnet" })
    ).rejects.toBe(patchedError);
  });
});

import { PassThrough, Readable, Writable } from "node:stream";
import { CONNECTION_STATUS } from "@/constants/connection-status";

import "dotenv/config";

import {
  type Agent,
  AgentSideConnection,
  type AuthenticateRequest,
  type AuthenticateResponse,
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  PROTOCOL_VERSION,
  type PromptRequest,
  type PromptResponse,
  type SessionNotification,
  type Stream,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";

import type { ACPConnectionLike } from "../../../src/core/acp-client";
import type { ACPConnectionOptions } from "../../../src/core/acp-connection";
import {
  ClaudeCliHarnessAdapter,
  claudeCliHarnessAdapter,
} from "../../../src/core/claude-cli-harness";
import { SessionManager } from "../../../src/core/session-manager";
import { SessionStream } from "../../../src/core/session-stream";
import { createDefaultHarnessConfig } from "../../../src/harness/defaultHarnessConfig";
import type { HarnessRuntime } from "../../../src/harness/harnessAdapter";
import { type AppStore, useAppStore } from "../../../src/store/app-store";
import type { ConnectionStatus } from "../../../src/types/domain";
import { AgentIdSchema, SessionIdSchema } from "../../../src/types/domain";

const createStreamPair = (): { clientStream: Stream; agentStream: Stream } => {
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
  return { clientStream, agentStream };
};

class FakeConnection implements ACPConnectionLike {
  private readonly emitter = new EventEmitter();
  connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;

  constructor(private readonly stream: Stream) {}

  async connect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.CONNECTED;
    this.emitter.emit("state", this.connectionStatus);
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.emitter.emit("state", this.connectionStatus);
  }

  getStream(): Stream {
    return this.stream;
  }

  on(
    event: "state" | "error" | "exit",
    handler:
      | ((status: ConnectionStatus) => void)
      | ((error: Error) => void)
      | ((info: { code: number | null; signal: NodeJS.Signals | null }) => void)
  ): void {
    this.emitter.on(event, handler as () => void);
  }
}

describe("Claude CLI session flow", () => {
  it("stores a session id when using the Claude harness", async () => {
    const store = useAppStore.getState();
    store.reset();

    const harness: HarnessRuntime = new ClaudeCliHarnessAdapter({
      connectionFactory: (_options: ACPConnectionOptions) => {
        const { clientStream, agentStream } = createStreamPair();
        new AgentSideConnection((_conn) => {
          const agent: Agent = {
            initialize: async () => ({ protocolVersion: PROTOCOL_VERSION }),
            authenticate: async () => ({}),
            newSession: async (_req) => ({ sessionId: "session-claude" }),
            prompt: async (_req) => ({ stopReason: "end_turn" }),
            cancel: async () => {},
          };
          return agent;
        }, agentStream);

        return new FakeConnection(clientStream);
      },
    });

    harness.on("state", (status) => store.setConnectionStatus(status));

    const sessionStream = new SessionStream(useAppStore.getState());
    const detach = sessionStream.attach(harness);
    const manager = new SessionManager(harness, store);

    await harness.connect();
    await harness.initialize();
    const session = await manager.createSession({
      cwd: "/tmp/claude-test",
      agentId: AgentIdSchema.parse("claude-cli"),
      title: "Claude CLI",
    });
    store.setCurrentSession(session.id);

    const state = useAppStore.getState() as unknown as {
      currentSessionId?: string;
      connectionStatus?: ConnectionStatus;
      getSession: AppStore["getSession"];
    };
    expect(state.currentSessionId).toBe(SessionIdSchema.parse("session-claude"));
    expect(state.getSession(SessionIdSchema.parse("session-claude"))?.title).toBe("Claude CLI");
    expect(state.connectionStatus).toBe("connected");

    detach();
    await harness.disconnect();
  });

  const isEnabled = (value: string | undefined): boolean => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
    );
  };

  const runRealClaudeE2E = isEnabled(process.env.RUN_CLAUDE_CLI_E2E);
  const realTest = runRealClaudeE2E ? it : it.skip;

  if (!runRealClaudeE2E) {
    console.warn("Skipping real claude-cli E2E: set RUN_CLAUDE_CLI_E2E=1 to enable");
  }

  realTest(
    "creates a session id with real claude-cli (opt-in)",
    async () => {
      const store = useAppStore.getState();
      store.reset();

      const { harnesses } = createDefaultHarnessConfig(process.env);
      const claudeConfig = harnesses["claude-cli"];
      expect(claudeConfig).toBeDefined();

      const harness = claudeCliHarnessAdapter.createHarness(claudeConfig);
      harness.on("state", (status) => store.setConnectionStatus(status));

      const sessionStream = new SessionStream(useAppStore.getState());
      const detach = sessionStream.attach(harness);
      const manager = new SessionManager(harness, store);

      try {
        await harness.connect();
        await harness.initialize();
        const session = await manager.createSession({
          cwd: process.cwd(),
          agentId: AgentIdSchema.parse("claude-cli"),
          title: "Claude CLI E2E",
          env: process.env,
        });
        store.setCurrentSession(session.id);

        const state = useAppStore.getState() as unknown as {
          currentSessionId?: string;
          connectionStatus?: ConnectionStatus;
          getSession: AppStore["getSession"];
        };
        expect(state.currentSessionId).toBe(session.id);
        expect(state.connectionStatus).toBe("connected");
      } finally {
        detach();
        await harness.disconnect();
      }
    },
    30000
  );
});

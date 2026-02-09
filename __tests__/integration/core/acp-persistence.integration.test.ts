import { PassThrough, Readable, Writable } from "node:stream";
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
  type Stream,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it, vi } from "vitest";

import { CONNECTION_STATUS } from "../../../src/constants/connection-status";
import { PERSISTENCE_WRITE_MODE } from "../../../src/constants/persistence-write-modes";
import { ACPClient, type ACPConnectionLike } from "../../../src/core/acp-client";
import { useAppStore } from "../../../src/store/app-store";
import { PersistenceManager } from "../../../src/store/persistence/persistence-manager";
import type { PersistenceProvider } from "../../../src/store/persistence/persistence-provider";
import { defaultSnapshot } from "../../../src/store/session-persistence";
import { type ConnectionStatus, MessageIdSchema, SessionIdSchema } from "../../../src/types/domain";

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

describe("ACP + persistence integration", () => {
  it("connects and handles initialize/newSession/prompt over ACP streams", async () => {
    const { clientStream, agentStream } = createStreamPair();

    new AgentSideConnection((_conn) => {
      const agent: Agent = {
        initialize: async (_params: InitializeRequest): Promise<InitializeResponse> => ({
          protocolVersion: PROTOCOL_VERSION,
        }),
        authenticate: async (_params: AuthenticateRequest): Promise<AuthenticateResponse> => ({}),
        newSession: async (_params: NewSessionRequest): Promise<NewSessionResponse> => ({
          sessionId: "session-acp",
        }),
        prompt: async (_params: PromptRequest): Promise<PromptResponse> => ({
          stopReason: "end_turn",
        }),
        cancel: async () => {},
      };
      return agent;
    }, agentStream);

    const connection = new FakeConnection(clientStream);
    const client = new ACPClient(connection);

    await client.connect();
    const init = await client.initialize();
    expect(init.protocolVersion).toBe(PROTOCOL_VERSION);

    const session = await client.newSession({ cwd: "/tmp", mcpServers: [] });
    expect(session.sessionId).toBe("session-acp");

    const promptResult = await client.prompt({
      sessionId: "session-acp",
      prompt: [{ type: "text", text: "hi" }],
    });
    expect(promptResult.stopReason).toBe("end_turn");

    await client.disconnect();
    expect(connection.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });

  it("continues persisting after an initial save failure", async () => {
    vi.useFakeTimers();
    const store = useAppStore.getState();
    store.reset();

    let saveCalls = 0;
    const savedSnapshots: string[] = [];

    const provider: PersistenceProvider = {
      async load() {
        return defaultSnapshot;
      },
      async save(snapshot) {
        saveCalls += 1;
        if (saveCalls === 1) {
          throw new Error("boom");
        }
        savedSnapshots.push(String(Object.keys(snapshot.messages).length));
      },
      async close() {},
      async search() {
        return [];
      },
      async getSessionHistory() {
        return {
          id: SessionIdSchema.parse("session-test"),
          agentId: undefined,
          messageIds: [],
          createdAt: 0,
          updatedAt: 0,
          mode: "auto",
          metadata: undefined,
          messages: [],
        };
      },
    };

    const manager = new PersistenceManager(useAppStore, provider, {
      writeMode: PERSISTENCE_WRITE_MODE.PER_MESSAGE,
      batchDelay: 1,
    });

    await manager.hydrate();
    manager.start();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-1"),
      sessionId: SessionIdSchema.parse("session-1"),
      role: "assistant",
      content: [{ type: "text", text: "first" }],
      createdAt: 0,
      isStreaming: false,
    });

    await vi.runAllTimersAsync();

    store.appendMessage({
      id: MessageIdSchema.parse("msg-2"),
      sessionId: SessionIdSchema.parse("session-1"),
      role: "user",
      content: [{ type: "text", text: "second" }],
      createdAt: 1,
      isStreaming: false,
    });

    await vi.runAllTimersAsync();

    await manager.close();
    vi.useRealTimers();

    expect(saveCalls).toBeGreaterThanOrEqual(2);
    expect(savedSnapshots).toContain("2");
  });
});

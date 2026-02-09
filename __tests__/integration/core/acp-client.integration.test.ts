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
  type SessionNotification,
  type Stream,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";

import { CONNECTION_STATUS } from "../../../src/constants/connection-status";
import { ACPClient, type ACPConnectionLike } from "../../../src/core/acp-client";
import type { ConnectionStatus } from "../../../src/types/domain";

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

describe("ACPClient integration", () => {
  it("connects and performs initialize/newSession/prompt over streams", async () => {
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
});

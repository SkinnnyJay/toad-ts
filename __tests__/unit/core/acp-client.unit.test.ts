import { PassThrough, Readable, Writable } from "node:stream";
import {
  type Agent,
  AgentSideConnection,
  PROTOCOL_VERSION,
  type Stream,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";
import { ACPClient, type ACPConnectionLike } from "../../../src/core/acp-client";
import type { ConnectionStatus } from "../../../src/types/domain";

class FakeConnection extends EventEmitter implements ACPConnectionLike {
  connectionStatus: ConnectionStatus = "disconnected";

  constructor(private readonly stream: Stream) {
    super();
  }

  async connect(): Promise<void> {
    this.connectionStatus = "connected";
    this.emit("state", this.connectionStatus);
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = "disconnected";
    this.emit("state", this.connectionStatus);
  }

  getStream(): Stream {
    return this.stream;
  }
}

describe("ACPClient", () => {
  it("initializes and receives session updates", async () => {
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
              sessionUpdate: "agent_message_chunk",
              content: { type: "text", text: "hello" },
            },
          });
          return { stopReason: "end_turn" };
        },
      };
      return agent;
    }, agentStream);

    const connection = new FakeConnection(clientStream);
    const client = new ACPClient(connection);
    const updates: string[] = [];
    client.on("sessionUpdate", () => updates.push("update"));

    await client.connect();
    const init = await client.initialize();
    const session = await client.newSession({ cwd: ".", mcpServers: [] });
    const result = await client.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: "hi" }],
    });

    expect(init.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(result.stopReason).toBe("end_turn");
    expect(updates.length).toBeGreaterThan(0);

    await client.disconnect();
    clientToAgent.end();
    agentToClient.end();
  });
});

import { CONNECTION_STATUS } from "@/constants/connection-status";
import {
  type AuthenticateResponse,
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  PROTOCOL_VERSION,
  type PromptRequest,
  type PromptResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";
import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";

import { SessionManager } from "../../../src/core/session-manager";
import { SessionStream } from "../../../src/core/session-stream";
import type { HarnessRuntime, HarnessRuntimeEvents } from "../../../src/harness/harnessAdapter";
import { type AppStore, useAppStore } from "../../../src/store/app-store";
import type { ConnectionStatus } from "../../../src/types/domain";
import { SessionIdSchema } from "../../../src/types/domain";

class FakeHarnessRuntime extends EventEmitter<HarnessRuntimeEvents> implements HarnessRuntime {
  connectionStatus: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;

  async connect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.CONNECTED;
    this.emit("state", this.connectionStatus);
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;
    this.emit("state", this.connectionStatus);
  }

  async initialize(): Promise<InitializeResponse> {
    return { protocolVersion: Number(PROTOCOL_VERSION) } as InitializeResponse;
  }

  async newSession(): Promise<NewSessionResponse> {
    const sessionId = SessionIdSchema.parse(`session-${nanoid(6)}`);
    return { sessionId } satisfies NewSessionResponse;
  }

  async prompt(): Promise<PromptResponse> {
    return { stopReason: "end_turn" } as PromptResponse;
  }

  async authenticate(): Promise<AuthenticateResponse> {
    return {};
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {}
}

describe("App session flow", () => {
  it("stores a new session id on repeated connects", async () => {
    const store = useAppStore.getState();
    store.reset();

    const runtime = new FakeHarnessRuntime();
    runtime.on("state", (status) => store.setConnectionStatus(status));

    const sessionStream = new SessionStream(useAppStore.getState());
    const detach = sessionStream.attach(runtime);

    const manager = new SessionManager(runtime, store);

    for (let i = 0; i < 3; i += 1) {
      store.setConnectionStatus("connecting");
      await runtime.connect();
      await runtime.initialize();
      const session = await manager.createSession({ cwd: `/tmp/${i}` });
      store.setCurrentSession(session.id);

      const state = useAppStore.getState() as {
        currentSessionId?: string;
        connectionStatus?: ConnectionStatus;
      };
      expect(state.currentSessionId).toBe(session.id);
      expect(state.connectionStatus).toBe("connected");
    }

    detach();
    await runtime.disconnect();
  });
});

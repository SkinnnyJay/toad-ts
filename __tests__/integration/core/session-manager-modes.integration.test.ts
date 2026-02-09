import type { NewSessionRequest, NewSessionResponse } from "@agentclientprotocol/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import { ENV_KEY } from "../../../src/constants/env-keys";
import { SESSION_MODE } from "../../../src/constants/session-modes";
import { SessionManager } from "../../../src/core/session-manager";
import type { SessionStore } from "../../../src/core/session-manager";
import { type AppStore, useAppStore } from "../../../src/store/app-store";

class FakeSessionClient {
  constructor(private readonly sessionId: string) {}

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    return { sessionId: this.sessionId };
  }
}

describe("SessionManager integration - session modes and persistence", () => {
  const originalMode = process.env[ENV_KEY.TOADSTOOL_SESSION_MODE];

  beforeEach(() => {
    useAppStore.getState().reset();
    if (originalMode === undefined) {
      Reflect.deleteProperty(process.env, ENV_KEY.TOADSTOOL_SESSION_MODE);
    } else {
      process.env[ENV_KEY.TOADSTOOL_SESSION_MODE] = originalMode;
    }
  });

  it("applies session mode from environment when not provided", async () => {
    process.env[ENV_KEY.TOADSTOOL_SESSION_MODE] = SESSION_MODE.FULL_ACCESS;
    const store = useAppStore.getState();
    const client = new FakeSessionClient("session-env");
    const manager = new SessionManager(client, store as unknown as SessionStore);

    const session = await manager.createSession({
      cwd: "/tmp/env-mode",
      agentId: "agent-1" as const,
      title: "Env Mode",
    });

    const saved = (useAppStore.getState() as AppStore).getSession(session.id);
    expect(session.mode).toBe(SESSION_MODE.FULL_ACCESS);
    expect(saved?.mode).toBe(SESSION_MODE.FULL_ACCESS);
  });

  it("prefers explicit mode parameter over environment", async () => {
    process.env[ENV_KEY.TOADSTOOL_SESSION_MODE] = SESSION_MODE.FULL_ACCESS;
    const store = useAppStore.getState();
    const client = new FakeSessionClient("session-param");
    const manager = new SessionManager(client, store as unknown as SessionStore);

    const session = await manager.createSession({
      cwd: "/tmp/explicit-mode",
      agentId: "agent-1" as const,
      title: "Explicit Mode",
      mode: SESSION_MODE.READ_ONLY,
    });

    const saved = (useAppStore.getState() as AppStore).getSession(session.id);
    expect(session.mode).toBe(SESSION_MODE.READ_ONLY);
    expect(saved?.mode).toBe(SESSION_MODE.READ_ONLY);
  });
});

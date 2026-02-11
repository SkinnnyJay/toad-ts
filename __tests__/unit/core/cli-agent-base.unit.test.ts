import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CliAgentBase } from "@/core/cli-agent/cli-agent.base";
import type {
  AuthenticateRequest,
  AuthenticateResponse,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SessionNotification,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
} from "@agentclientprotocol/sdk";
import { describe, expect, it, vi } from "vitest";

class TestCliAgentBase extends CliAgentBase {
  private releasePrompt: (() => void) | null = null;

  async connect(): Promise<void> {
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTED);
  }

  async disconnect(): Promise<void> {
    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return { protocolVersion: "1.0.0" };
  }

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    return { sessionId: "session-test" };
  }

  async prompt(_params: PromptRequest): Promise<PromptResponse> {
    return this.runPromptGuarded(
      () =>
        new Promise((resolve) => {
          this.releasePrompt = () => resolve({ stopReason: "end_turn" });
        })
    );
  }

  resolvePrompt(): void {
    this.releasePrompt?.();
    this.releasePrompt = null;
  }

  async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return {};
  }

  async sessionUpdate(_params: SessionNotification): Promise<void> {
    return Promise.resolve();
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    this.setSessionModeValue(params);
    return {};
  }

  async setSessionModel(params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    this.setSessionModelValue(params);
    return {};
  }

  readPromptMode(sessionId: string): "agent" | "plan" | "ask" | undefined {
    return this.getSessionPromptMode(sessionId);
  }

  readPromptModel(sessionId: string): string | undefined {
    return this.getSessionModelValue(sessionId);
  }

  setCachedAuth(authenticated: boolean): void {
    this.cacheAuthStatus(authenticated);
  }

  readCachedAuth(maxAgeMs?: number): boolean | null {
    return this.getCachedAuthStatus(maxAgeMs);
  }
}

describe("CliAgentBase", () => {
  it("emits state transitions through connection status helper", async () => {
    const harness = new TestCliAgentBase();
    const stateHandler = vi.fn();
    harness.on("state", stateHandler);

    await harness.connect();
    await harness.disconnect();

    expect(stateHandler).toHaveBeenNthCalledWith(1, CONNECTION_STATUS.CONNECTED);
    expect(stateHandler).toHaveBeenNthCalledWith(2, CONNECTION_STATUS.DISCONNECTED);
  });

  it("guards against concurrent prompt execution", async () => {
    const harness = new TestCliAgentBase();

    const firstPrompt = harness.prompt({
      sessionId: "session-test",
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
    });

    await expect(
      harness.prompt({
        sessionId: "session-test",
        prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "again" }],
      })
    ).rejects.toThrow("already in progress");

    harness.resolvePrompt();
    await expect(firstPrompt).resolves.toEqual({ stopReason: "end_turn" });
  });

  it("stores session mode/model and caches auth status", async () => {
    const harness = new TestCliAgentBase();

    await harness.setSessionMode({ sessionId: "session-1", modeId: "plan" });
    await harness.setSessionModel({ sessionId: "session-1", modelId: "gpt-5" });
    harness.setCachedAuth(true);

    expect(harness.readPromptMode("session-1")).toBe("plan");
    expect(harness.readPromptModel("session-1")).toBe("gpt-5");
    expect(harness.readCachedAuth()).toBe(true);
    expect(harness.readCachedAuth(-1)).toBe(null);
  });
});

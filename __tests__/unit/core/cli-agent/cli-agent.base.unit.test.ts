import { CONNECTION_STATUS } from "@/constants/connection-status";
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
import { describe, expect, it } from "vitest";

class TestCliAgentHarness extends CliAgentBase {
  public async connect(): Promise<void> {
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTED);
  }

  public async disconnect(): Promise<void> {
    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  public async initialize(_params?: Partial<InitializeRequest>): Promise<InitializeResponse> {
    return { protocolVersion: "1" };
  }

  public async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    return { sessionId: "session-1" };
  }

  public async setSessionMode(_params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    return {};
  }

  public async setSessionModel(_params: SetSessionModelRequest): Promise<SetSessionModelResponse> {
    return {};
  }

  public async prompt(_params: PromptRequest): Promise<PromptResponse> {
    return { stopReason: "end_turn" };
  }

  public async authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse> {
    return {};
  }

  public async sessionUpdate(_params: SessionNotification): Promise<void> {}

  public async runGuarded<T>(task: () => Promise<T>): Promise<T> {
    return this.withPromptGuard(task);
  }

  public getTextFromPrompt(params: PromptRequest): string {
    return this.extractPromptText(params);
  }
}

describe("CliAgentBase", () => {
  it("tracks connection status transitions", async () => {
    const harness = new TestCliAgentHarness();
    const states: string[] = [];
    harness.on("state", (status) => states.push(status));

    await harness.connect();
    await harness.disconnect();

    expect(states).toEqual([CONNECTION_STATUS.CONNECTED, CONNECTION_STATUS.DISCONNECTED]);
  });

  it("guards concurrent prompt execution", async () => {
    const harness = new TestCliAgentHarness();
    let release: (() => void) | null = null;
    const blocking = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = harness.runGuarded(async () => {
      await blocking;
      return "done";
    });
    const second = harness.runGuarded(async () => "nope");

    await expect(second).rejects.toThrow("Prompt already in progress");
    if (release) {
      release();
    }
    await expect(first).resolves.toBe("done");
  });

  it("extracts text blocks from prompt payloads", () => {
    const harness = new TestCliAgentHarness();
    const text = harness.getTextFromPrompt({
      sessionId: "session-1",
      prompt: [{ type: "text", text: "hello world" }],
    });
    expect(text).toBe("hello world");
  });

  it("returns empty string when prompt has no text block", () => {
    const harness = new TestCliAgentHarness();
    const text = harness.getTextFromPrompt({
      sessionId: "session-1",
      prompt: [{ type: "resource_link", resourceLink: { uri: "file:///tmp/a" } }],
    });
    expect(text).toBe("");
  });

  it("returns unsupported defaults for management commands", async () => {
    const harness = new TestCliAgentHarness();

    const login = await harness.login();
    const logout = await harness.logout();
    const status = await harness.status();
    const about = await harness.about();
    const models = await harness.models();
    const mcp = await harness.mcp();

    expect(login.supported).toBe(false);
    expect(logout.supported).toBe(false);
    expect(status.supported).toBe(false);
    expect(about.supported).toBe(false);
    expect(models.supported).toBe(false);
    expect(models.models).toEqual([]);
    expect(mcp.supported).toBe(false);
    expect(mcp.servers).toEqual([]);
  });
});

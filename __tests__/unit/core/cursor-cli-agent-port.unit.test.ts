import { CursorCliAgentPort } from "@/core/cursor/cursor-cli-agent-port";
import type { CursorPromptRequest, CursorPromptResult } from "@/core/cursor/cursor-cli-connection";
import { describe, expect, it } from "vitest";

class FakeCursorConnection {
  public promptRequests: CursorPromptRequest[] = [];

  async verifyInstallation(): Promise<{ installed: boolean; version?: string }> {
    return { installed: true, version: "1.2.3" };
  }

  async verifyAuth(): Promise<{ authenticated: boolean }> {
    return { authenticated: true };
  }

  async listModels(): Promise<{
    models: Array<{ id: string; name: string }>;
    defaultModel?: string;
  }> {
    return {
      models: [{ id: "gpt-5", name: "GPT-5" }],
      defaultModel: "gpt-5",
    };
  }

  async createChat(): Promise<string> {
    return "session-created";
  }

  async listSessions(): Promise<string[]> {
    return ["session-created"];
  }

  async spawnPrompt(request: CursorPromptRequest): Promise<CursorPromptResult> {
    this.promptRequests.push(request);
    return {
      sessionId: request.sessionId ?? "session-created",
      resultText: "ok",
      events: [],
      stderr: "",
      exitCode: 0,
      signal: null,
    };
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async runManagementCommand(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return {
      stdout: args.join(" "),
      stderr: "",
      exitCode: 0,
    };
  }
}

describe("CursorCliAgentPort", () => {
  it("maps prompt inputs to cursor prompt request", async () => {
    const connection = new FakeCursorConnection();
    const port = new CursorCliAgentPort({
      connection,
      getPromptEnvOverrides: () => ({ TOADSTOOL_HOOK_SOCKET: "http://127.0.0.1:9999/hook" }),
    });

    const response = await port.prompt({
      message: "hello",
      sessionId: "session-1",
      mode: "plan",
      model: "gpt-5",
      force: true,
      streaming: true,
    });

    expect(connection.promptRequests[0]).toEqual(
      expect.objectContaining({
        prompt: "hello",
        sessionId: "session-1",
        mode: "plan",
        model: "gpt-5",
        force: true,
        streamPartialOutput: true,
        envOverrides: { TOADSTOOL_HOOK_SOCKET: "http://127.0.0.1:9999/hook" },
      })
    );
    expect(response.result).toEqual({
      text: "ok",
      sessionId: "session-1",
      toolCallCount: 0,
    });
    expect(response.events).toEqual([]);
  });

  it("throws when cursor prompt exits with error and no result", async () => {
    const connection = new FakeCursorConnection();
    connection.spawnPrompt = async (): Promise<CursorPromptResult> => ({
      sessionId: "session-1",
      resultText: null,
      events: [],
      stderr: "failed",
      exitCode: 1,
      signal: null,
    });
    const port = new CursorCliAgentPort({ connection });

    await expect(
      port.prompt({
        message: "hello",
        sessionId: "session-1",
      })
    ).rejects.toThrow("Cursor prompt failed");
  });

  it("maps installation and model metadata", async () => {
    const port = new CursorCliAgentPort({
      connection: new FakeCursorConnection(),
    });

    const install = await port.verifyInstallation();
    const models = await port.listModels();

    expect(install.binaryName).toBe("cursor-agent");
    expect(install.version).toBe("1.2.3");
    expect(models.defaultModel).toBe("gpt-5");
    expect(models.models[0]).toEqual({
      id: "gpt-5",
      name: "GPT-5",
      isDefault: true,
      supportsThinking: true,
    });
  });
});

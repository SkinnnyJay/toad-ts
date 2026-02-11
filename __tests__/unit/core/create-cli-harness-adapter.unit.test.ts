import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ALLOW_ONCE, REJECT_ONCE } from "@/constants/permission-option-kinds";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { TOOL_KIND } from "@/constants/tool-kinds";
import type { CliAgentPort, CliAgentPromptExecution } from "@/core/cli-agent/cli-agent.port";
import {
  type CliHarnessAdapter,
  createCliHarnessAdapter,
} from "@/core/cli-agent/create-cli-harness-adapter";
import { type CliAgentPromptInput, STREAM_EVENT_TYPE } from "@/types/cli-agent.types";
import { describe, expect, it } from "vitest";

class FakeCliAgentPort implements CliAgentPort {
  public promptInputs: CliAgentPromptInput[] = [];
  public installed = true;
  public authenticated = true;
  public releasePrompt: (() => void) | null = null;

  async verifyInstallation() {
    return {
      binaryName: "fake",
      installed: this.installed,
      installCommand: "npm install -g fake",
    };
  }

  async verifyAuth() {
    return {
      authenticated: this.authenticated,
      method: "browser_login",
    };
  }

  async listModels() {
    return {
      models: [{ id: "gpt-5", name: "GPT-5", isDefault: true }],
      defaultModel: "gpt-5",
    };
  }

  async createSession(): Promise<string> {
    return "session-fake";
  }

  async prompt(input: CliAgentPromptInput): Promise<CliAgentPromptExecution> {
    this.promptInputs.push(input);
    return {
      result: {
        text: "done",
        sessionId: input.sessionId ?? "session-fake",
        toolCallCount: 0,
      },
      events: [
        {
          type: STREAM_EVENT_TYPE.TEXT_DELTA,
          sessionId: input.sessionId ?? "session-fake",
          text: "done",
        },
      ],
    };
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  async runManagementCommand(args: string[]) {
    return {
      stdout: args.join(" "),
      stderr: "",
      exitCode: 0,
    };
  }
}

describe("createCliHarnessAdapter", () => {
  it("creates harness adapter that bridges stream events", async () => {
    const cliAgent = new FakeCliAgentPort();
    const harness = createCliHarnessAdapter({ cliAgent });
    const sessionUpdates: string[] = [];

    harness.on("sessionUpdate", (update) => {
      sessionUpdates.push(update.update.sessionUpdate);
    });

    await harness.connect();
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.CONNECTED);

    await harness.setSessionMode({ sessionId: "session-fake", modeId: "plan" });
    await harness.setSessionModel({ sessionId: "session-fake", modelId: "gpt-5" });
    const response = await harness.prompt({
      sessionId: "session-fake",
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
    });

    expect(response.stopReason).toBe("end_turn");
    expect(cliAgent.promptInputs[0]?.mode).toBe("plan");
    expect(cliAgent.promptInputs[0]?.model).toBe("gpt-5");
    expect(sessionUpdates).toContain(SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);

    const commandResult = await harness.runAgentCommand(["status"]);
    expect(commandResult.stdout).toBe("status");

    await harness.disconnect();
    expect(harness.connectionStatus).toBe(CONNECTION_STATUS.DISCONNECTED);
  });

  it("guards concurrent prompts", async () => {
    const cliAgent = new FakeCliAgentPort();
    cliAgent.prompt = async (input: CliAgentPromptInput): Promise<CliAgentPromptExecution> => {
      cliAgent.promptInputs.push(input);
      await new Promise<void>((resolve) => {
        cliAgent.releasePrompt = resolve;
      });
      return {
        result: {
          text: "later",
          sessionId: input.sessionId ?? "session-fake",
          toolCallCount: 0,
        },
        events: [],
      };
    };
    const harness: CliHarnessAdapter = createCliHarnessAdapter({ cliAgent });
    await harness.connect();

    const firstPrompt = harness.prompt({
      sessionId: "session-fake",
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "first" }],
    });

    await expect(
      harness.prompt({
        sessionId: "session-fake",
        prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "second" }],
      })
    ).rejects.toThrow("already in progress");

    cliAgent.releasePrompt?.();
    await expect(firstPrompt).resolves.toEqual({ stopReason: "end_turn" });
  });

  it("maps permission stream events to ACP permission requests", async () => {
    const cliAgent = new FakeCliAgentPort();
    cliAgent.prompt = async (input: CliAgentPromptInput): Promise<CliAgentPromptExecution> => {
      cliAgent.promptInputs.push(input);
      return {
        result: {
          text: "done",
          sessionId: input.sessionId ?? "session-fake",
          toolCallCount: 0,
        },
        events: [
          {
            type: STREAM_EVENT_TYPE.PERMISSION_REQUEST,
            sessionId: input.sessionId ?? "session-fake",
            requestId: "req-1",
            toolName: "shell",
            toolInput: { command: "ls" },
          },
        ],
      };
    };
    const harness = createCliHarnessAdapter({ cliAgent });
    const requests: Array<{
      optionKinds: string[];
      toolKind: string;
      sessionId: string;
    }> = [];

    harness.on("permissionRequest", (request) => {
      requests.push({
        optionKinds: request.options.map((option) => option.kind),
        toolKind: request.toolCall.kind ?? "",
        sessionId: request.sessionId,
      });
    });

    await harness.connect();
    await harness.prompt({
      sessionId: "session-fake",
      prompt: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "needs permission" }],
    });

    expect(requests).toEqual([
      {
        optionKinds: [ALLOW_ONCE, REJECT_ONCE],
        toolKind: TOOL_KIND.EXECUTE,
        sessionId: "session-fake",
      },
    ]);
  });
});

import { CONNECTION_STATUS } from "@/constants/connection-status";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import {
  CLI_AGENT_AUTH_METHOD,
  CLI_AGENT_MODE,
  CLI_AGENT_SANDBOX_MODE,
  CliAgentAboutResultSchema,
  CliAgentAuthStatusSchema,
  CliAgentCapabilitiesSchema,
  CliAgentInstallInfoSchema,
  CliAgentLoginResultSchema,
  CliAgentLogoutResultSchema,
  CliAgentMcpListResultSchema,
  CliAgentModelSchema,
  CliAgentModelsResponseSchema,
  CliAgentPromptInputSchema,
  CliAgentPromptResultSchema,
  CliAgentSessionSchema,
  CliAgentStatusResultSchema,
  STREAM_EVENT_TYPE,
  StreamErrorEventSchema,
  StreamEventSchema,
  StreamPermissionRequestEventSchema,
  StreamResultEventSchema,
  StreamStateEventSchema,
  StreamTextDeltaEventSchema,
  StreamThinkingDeltaEventSchema,
  StreamToolCompleteEventSchema,
  StreamToolStartEventSchema,
} from "@/types/cli-agent.types";
import { describe, expect, it } from "vitest";

describe("cli-agent types", () => {
  it("parses install/auth/model/session/prompt/capabilities schemas", () => {
    const installInfo = CliAgentInstallInfoSchema.parse({
      binaryName: "cursor-agent",
      binaryPath: "/usr/local/bin/cursor-agent",
      version: "2026.01.28",
      installed: true,
    });
    const authStatus = CliAgentAuthStatusSchema.parse({
      authenticated: true,
      method: CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN,
      email: "dev@example.com",
    });
    const model = CliAgentModelSchema.parse({
      id: "opus-4.6-thinking",
      name: "Claude 4.6 Opus (Thinking)",
      isDefault: true,
    });
    const models = CliAgentModelsResponseSchema.parse({
      models: [model],
      defaultModel: model.id,
      currentModel: model.id,
    });
    const session = CliAgentSessionSchema.parse({
      id: "session-1",
      title: "My Session",
      createdAt: "2026-02-12T10:00:00.000Z",
      model: model.id,
      messageCount: 4,
    });
    const promptInput = CliAgentPromptInputSchema.parse({
      message: "Hello",
      sessionId: session.id,
      model: model.id,
      mode: CLI_AGENT_MODE.ASK,
      sandbox: CLI_AGENT_SANDBOX_MODE.ENABLED,
      browser: true,
      approveMcps: true,
      workspacePath: "/workspace",
      force: false,
      streaming: true,
    });
    const promptResult = CliAgentPromptResultSchema.parse({
      text: "Hi",
      sessionId: session.id,
      durationMs: 1234,
      toolCallCount: 2,
    });
    const capabilities = CliAgentCapabilitiesSchema.parse({
      streaming: true,
      resume: true,
      modes: true,
      hooks: true,
      cloud: true,
      modelListing: true,
      sessionListing: false,
      authCommand: true,
      mcpManagement: true,
    });

    expect(installInfo.installed).toBe(true);
    expect(authStatus.method).toBe(CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN);
    expect(models.models.length).toBe(1);
    expect(promptInput.mode).toBe(CLI_AGENT_MODE.ASK);
    expect(promptInput.sandbox).toBe(CLI_AGENT_SANDBOX_MODE.ENABLED);
    expect(promptResult.toolCallCount).toBe(2);
    expect(capabilities.cloud).toBe(true);
  });

  it("parses management command result schemas", () => {
    const loginResult = CliAgentLoginResultSchema.parse({
      supported: true,
      requiresBrowser: true,
      command: "cursor-agent login",
      message: "Opens browser",
    });
    const logoutResult = CliAgentLogoutResultSchema.parse({
      supported: false,
      message: "logout not supported",
    });
    const statusResult = CliAgentStatusResultSchema.parse({
      supported: true,
      authenticated: true,
      method: CLI_AGENT_AUTH_METHOD.API_KEY,
      email: "dev@example.com",
      version: "1.0.0",
      model: "gpt-5",
      details: { shell: "zsh" },
    });
    const aboutResult = CliAgentAboutResultSchema.parse({
      supported: true,
      version: "1.0.0",
      os: "linux",
      shell: "bash",
      userEmail: "dev@example.com",
    });
    const mcpListResult = CliAgentMcpListResultSchema.parse({
      supported: true,
      servers: [{ name: "filesystem", status: "connected" }],
    });

    expect(loginResult.requiresBrowser).toBe(true);
    expect(logoutResult.supported).toBe(false);
    expect(statusResult.authenticated).toBe(true);
    expect(aboutResult.userEmail).toBe("dev@example.com");
    expect(mcpListResult.servers[0]?.name).toBe("filesystem");
  });

  it("parses all stream event variants", () => {
    const textDelta = StreamTextDeltaEventSchema.parse({
      type: STREAM_EVENT_TYPE.TEXT_DELTA,
      delta: "hel",
      sessionId: "session-1",
    });
    const thinkingDelta = StreamThinkingDeltaEventSchema.parse({
      type: STREAM_EVENT_TYPE.THINKING_DELTA,
      delta: "ponder",
      sessionId: "session-1",
    });
    const toolStart = StreamToolStartEventSchema.parse({
      type: STREAM_EVENT_TYPE.TOOL_START,
      toolCallId: "tool-1",
      name: "read",
      arguments: { path: "README.md" },
    });
    const toolComplete = StreamToolCompleteEventSchema.parse({
      type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
      toolCallId: "tool-1",
      status: TOOL_CALL_STATUS.SUCCEEDED,
      result: { lines: 42 },
    });
    const permissionRequest = StreamPermissionRequestEventSchema.parse({
      type: STREAM_EVENT_TYPE.PERMISSION_REQUEST,
      requestId: "request-1",
      toolCallId: "tool-1",
      toolName: "bash",
    });
    const state = StreamStateEventSchema.parse({
      type: STREAM_EVENT_TYPE.STATE,
      status: CONNECTION_STATUS.CONNECTED,
      details: "ready",
    });
    const result = StreamResultEventSchema.parse({
      type: STREAM_EVENT_TYPE.RESULT,
      text: "done",
      sessionId: "session-1",
      durationMs: 100,
      isError: false,
    });
    const error = StreamErrorEventSchema.parse({
      type: STREAM_EVENT_TYPE.ERROR,
      message: "failure",
      code: "E_FAIL",
    });

    const events = [
      StreamEventSchema.parse(textDelta),
      StreamEventSchema.parse(thinkingDelta),
      StreamEventSchema.parse(toolStart),
      StreamEventSchema.parse(toolComplete),
      StreamEventSchema.parse(permissionRequest),
      StreamEventSchema.parse(state),
      StreamEventSchema.parse(result),
      StreamEventSchema.parse(error),
    ];

    expect(events).toHaveLength(8);
  });

  it("rejects unknown stream event types", () => {
    const parsed = StreamEventSchema.safeParse({
      type: "unknown_event",
      message: "nope",
    });
    expect(parsed.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  CLI_AGENT_PROMPT_MODE,
  CliAgentCapabilitiesSchema,
  CliAgentPromptInputSchema,
  CliAgentPromptResultSchema,
  CliAgentSessionSchema,
  STREAM_EVENT_TYPE,
  StreamEventSchema,
} from "../../../src/types/cli-agent.types";

describe("cli-agent.types schemas", () => {
  it("parses prompt input with defaults", () => {
    const parsed = CliAgentPromptInputSchema.parse({
      message: "hello",
      mode: CLI_AGENT_PROMPT_MODE.AGENT,
    });

    expect(parsed.force).toBe(false);
    expect(parsed.streaming).toBe(true);
  });

  it("parses stream tool event variants", () => {
    const started = StreamEventSchema.parse({
      type: STREAM_EVENT_TYPE.TOOL_START,
      sessionId: "session-1",
      toolCallId: "tool-1",
      toolName: "read_file",
      toolInput: { path: "/tmp/input.txt" },
    });
    const completed = StreamEventSchema.parse({
      type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
      sessionId: "session-1",
      toolCallId: "tool-1",
      toolName: "read_file",
      success: true,
      result: { size: 10 },
    });
    const result = StreamEventSchema.parse({
      type: STREAM_EVENT_TYPE.RESULT,
      text: "done",
      sessionId: "session-1",
      success: true,
      durationMs: 12,
    });

    expect(started.type).toBe(STREAM_EVENT_TYPE.TOOL_START);
    expect(completed.type).toBe(STREAM_EVENT_TYPE.TOOL_COMPLETE);
    expect(result.type).toBe(STREAM_EVENT_TYPE.RESULT);
  });

  it("rejects invalid stream event payloads", () => {
    expect(() =>
      StreamEventSchema.parse({
        type: STREAM_EVENT_TYPE.TOOL_START,
        toolName: "read_file",
      })
    ).toThrow();
  });

  it("parses capability and session schemas", () => {
    const capabilities = CliAgentCapabilitiesSchema.parse({
      supportsStreaming: true,
      supportsResume: true,
      supportsModes: true,
      supportsModelSelection: true,
      supportsHooks: true,
      supportsCloudAgents: false,
      supportsMcp: true,
      supportsBrowser: false,
      supportsSandbox: false,
      supportsThinking: true,
      supportsForce: true,
      supportsSessionListing: true,
      supportsSessionCreation: true,
    });
    const session = CliAgentSessionSchema.parse({
      id: "chat-1",
      title: "Session",
      createdAt: "2026-02-11T00:00:00.000Z",
      model: "opus-4.6-thinking",
      messageCount: 3,
    });
    const promptResult = CliAgentPromptResultSchema.parse({
      text: "done",
      sessionId: "chat-1",
    });

    expect(capabilities.supportsHooks).toBe(true);
    expect(session.model).toBe("opus-4.6-thinking");
    expect(promptResult.toolCallCount).toBe(0);
  });
});

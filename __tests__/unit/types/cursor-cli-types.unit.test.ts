import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CURSOR_CLOUD_AGENT_STATUS } from "@/constants/cursor-cloud-status";
import {
  CURSOR_EVENT_SUBTYPE,
  CURSOR_EVENT_TYPE,
  CURSOR_TOOL_TYPE,
} from "@/constants/cursor-event-types";
import {
  ALL_CURSOR_HOOK_EVENTS,
  CURSOR_BLOCKING_HOOK_EVENTS,
  CURSOR_HOOK_EVENT,
  CURSOR_OBSERVE_ONLY_HOOK_EVENTS,
} from "@/constants/cursor-hook-events";
import {
  CliAgentAuthStatusSchema,
  CliAgentCapabilitiesSchema,
  CliAgentInstallInfoSchema,
  CliAgentModelSchema,
  CliAgentModelsResponseSchema,
  CliAgentPromptInputSchema,
  CliAgentPromptResultSchema,
  CliAgentSessionSchema,
  STREAM_EVENT_TYPE,
  StreamEventSchema,
} from "@/types/cli-agent.types";
import {
  CursorAssistantEventSchema,
  CursorResultEventSchema,
  CursorStreamEventSchema,
  CursorSystemEventSchema,
  CursorToolCallCompletedEventSchema,
  CursorToolCallStartedEventSchema,
  CursorUserEventSchema,
  extractToolInput,
  extractToolResult,
  extractToolTypeKey,
  normalizeToolName,
  parseCursorAboutOutput,
  parseCursorMcpListOutput,
  parseCursorModelsOutput,
  parseCursorStatusOutput,
} from "@/types/cursor-cli.types";
import {
  CursorAfterAgentThoughtInputSchema,
  CursorAfterFileEditInputSchema,
  CursorBeforeShellExecutionInputSchema,
  CursorBeforeShellExecutionOutputSchema,
  CursorHookBaseInputSchema,
  CursorPreToolUseInputSchema,
  CursorPreToolUseOutputSchema,
  CursorSessionStartInputSchema,
  CursorSessionStartOutputSchema,
  CursorStopInputSchema,
  CursorStopOutputSchema,
} from "@/types/cursor-hooks.types";
import { describe, expect, it } from "vitest";

// ── Fixture helpers ──────────────────────────────────────────

function loadNdjsonFixture(name: string): string[] {
  const path = resolve(__dirname, "../../fixtures/cursor/ndjson", name);
  const content = readFileSync(path, "utf-8");
  return content.split("\n").filter((line) => line.trim().length > 0);
}

function loadTextFixture(name: string): string {
  const path = resolve(__dirname, "../../fixtures/cursor", name);
  return readFileSync(path, "utf-8");
}

// ── Constants tests ──────────────────────────────────────────

describe("Cursor Event Type Constants", () => {
  it("has all NDJSON event types", () => {
    expect(CURSOR_EVENT_TYPE.SYSTEM).toBe("system");
    expect(CURSOR_EVENT_TYPE.USER).toBe("user");
    expect(CURSOR_EVENT_TYPE.ASSISTANT).toBe("assistant");
    expect(CURSOR_EVENT_TYPE.TOOL_CALL).toBe("tool_call");
    expect(CURSOR_EVENT_TYPE.RESULT).toBe("result");
  });

  it("has all event subtypes", () => {
    expect(CURSOR_EVENT_SUBTYPE.INIT).toBe("init");
    expect(CURSOR_EVENT_SUBTYPE.STARTED).toBe("started");
    expect(CURSOR_EVENT_SUBTYPE.COMPLETED).toBe("completed");
    expect(CURSOR_EVENT_SUBTYPE.SUCCESS).toBe("success");
  });

  it("has all known tool types", () => {
    expect(CURSOR_TOOL_TYPE.READ).toBe("readToolCall");
    expect(CURSOR_TOOL_TYPE.WRITE).toBe("writeToolCall");
    expect(CURSOR_TOOL_TYPE.EDIT).toBe("editToolCall");
    expect(CURSOR_TOOL_TYPE.SHELL).toBe("shellToolCall");
    expect(CURSOR_TOOL_TYPE.GREP).toBe("grepToolCall");
    expect(CURSOR_TOOL_TYPE.LS).toBe("lsToolCall");
    expect(CURSOR_TOOL_TYPE.GLOB).toBe("globToolCall");
    expect(CURSOR_TOOL_TYPE.DELETE).toBe("deleteToolCall");
    expect(CURSOR_TOOL_TYPE.TODO).toBe("todoToolCall");
    expect(CURSOR_TOOL_TYPE.FUNCTION).toBe("function");
  });
});

describe("Cursor Hook Event Constants", () => {
  it("has all 18 hook events", () => {
    expect(Object.keys(CURSOR_HOOK_EVENT)).toHaveLength(18);
  });

  it("blocking + observe-only = all events", () => {
    const allFromSets = new Set([
      ...CURSOR_BLOCKING_HOOK_EVENTS,
      ...CURSOR_OBSERVE_ONLY_HOOK_EVENTS,
    ]);
    expect(allFromSets.size).toBe(ALL_CURSOR_HOOK_EVENTS.length);
    expect(allFromSets.size).toBe(18);
  });
});

describe("Cursor Cloud Status Constants", () => {
  it("has all agent statuses", () => {
    expect(CURSOR_CLOUD_AGENT_STATUS.CREATING).toBe("CREATING");
    expect(CURSOR_CLOUD_AGENT_STATUS.RUNNING).toBe("RUNNING");
    expect(CURSOR_CLOUD_AGENT_STATUS.FINISHED).toBe("FINISHED");
    expect(CURSOR_CLOUD_AGENT_STATUS.STOPPED).toBe("STOPPED");
    expect(CURSOR_CLOUD_AGENT_STATUS.ERROR).toBe("ERROR");
  });
});

// ── NDJSON Schema validation with real fixtures ──────────────

describe("Cursor NDJSON Schema Validation", () => {
  describe("hello-response.ndjson fixture", () => {
    const lines = loadNdjsonFixture("hello-response.ndjson");

    it("validates system.init event", () => {
      const parsed = JSON.parse(lines[0]!);
      const result = CursorSystemEventSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("system");
        expect(result.data.subtype).toBe("init");
        expect(result.data.session_id).toBeDefined();
        expect(result.data.model).toBeDefined();
        expect(result.data.cwd).toBeDefined();
      }
    });

    it("validates user event", () => {
      const parsed = JSON.parse(lines[1]!);
      const result = CursorUserEventSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("user");
        expect(result.data.message.role).toBe("user");
      }
    });

    it("validates streaming assistant delta events", () => {
      // Lines 2-10 are streaming deltas (have timestamp_ms)
      for (let i = 2; i <= 10; i++) {
        const parsed = JSON.parse(lines[i]!);
        const result = CursorAssistantEventSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("assistant");
          expect(result.data.timestamp_ms).toBeDefined();
        }
      }
    });

    it("validates final complete assistant event", () => {
      // Line 11 is the complete message (no timestamp_ms)
      const parsed = JSON.parse(lines[11]!);
      const result = CursorAssistantEventSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("assistant");
        expect(result.data.timestamp_ms).toBeUndefined();
      }
    });

    it("validates result event", () => {
      const lastLine = lines[lines.length - 1]!;
      const parsed = JSON.parse(lastLine);
      const result = CursorResultEventSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("result");
        expect(result.data.subtype).toBe("success");
        expect(result.data.duration_ms).toBeGreaterThan(0);
        expect(result.data.is_error).toBe(false);
      }
    });

    it("validates all lines through the union schema", () => {
      for (const line of lines) {
        const parsed = JSON.parse(line);
        const result = CursorStreamEventSchema.safeParse(parsed);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("tool-use-response.ndjson fixture", () => {
    const lines = loadNdjsonFixture("tool-use-response.ndjson");

    it("validates tool_call.started events", () => {
      const startedLines = lines.filter((l) => {
        const p = JSON.parse(l);
        return p.type === "tool_call" && p.subtype === "started";
      });
      expect(startedLines.length).toBeGreaterThan(0);

      for (const line of startedLines) {
        const parsed = JSON.parse(line);
        const result = CursorToolCallStartedEventSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.call_id).toBeDefined();
          expect(result.data.tool_call).toBeDefined();
        }
      }
    });

    it("validates tool_call.completed events", () => {
      const completedLines = lines.filter((l) => {
        const p = JSON.parse(l);
        return p.type === "tool_call" && p.subtype === "completed";
      });
      expect(completedLines.length).toBeGreaterThan(0);

      for (const line of completedLines) {
        const parsed = JSON.parse(line);
        const result = CursorToolCallCompletedEventSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.call_id).toBeDefined();
          expect(result.data.tool_call).toBeDefined();
        }
      }
    });

    it("extracts tool type keys from tool_call payloads", () => {
      const startedLine = lines.find((l) => {
        const p = JSON.parse(l);
        return p.type === "tool_call" && p.subtype === "started";
      })!;
      const parsed = JSON.parse(startedLine);
      const key = extractToolTypeKey(parsed.tool_call);
      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
    });

    it("normalizes tool names from tool type keys", () => {
      expect(normalizeToolName("readToolCall", {})).toBe("read_file");
      expect(normalizeToolName("writeToolCall", {})).toBe("write_file");
      expect(normalizeToolName("editToolCall", {})).toBe("edit_file");
      expect(normalizeToolName("shellToolCall", {})).toBe("shell");
      expect(normalizeToolName("grepToolCall", {})).toBe("grep");
      expect(normalizeToolName("lsToolCall", {})).toBe("ls");
      expect(normalizeToolName("globToolCall", {})).toBe("glob");
      expect(normalizeToolName("deleteToolCall", {})).toBe("delete_file");
      expect(normalizeToolName("todoToolCall", {})).toBe("todo");
      expect(normalizeToolName("unknownToolCall", {})).toBe("unknownToolCall");
    });

    it("normalizes function tool names", () => {
      const toolCall = { function: { name: "my_custom_tool", arguments: "{}" } };
      expect(normalizeToolName("function", toolCall)).toBe("my_custom_tool");
    });

    it("handles unknown function tool names", () => {
      expect(normalizeToolName("function", { function: {} })).toBe("unknown_function");
      expect(normalizeToolName("function", {})).toBe("unknown_function");
    });

    it("extracts tool input from real fixture", () => {
      const startedLine = lines.find((l) => {
        const p = JSON.parse(l);
        return p.type === "tool_call" && p.subtype === "started";
      })!;
      const parsed = JSON.parse(startedLine);
      const key = extractToolTypeKey(parsed.tool_call)!;
      const input = extractToolInput(key, parsed.tool_call);
      expect(input).toBeDefined();
      expect(typeof input).toBe("object");
    });

    it("extracts tool result from completed fixture", () => {
      const completedLine = lines.find((l) => {
        const p = JSON.parse(l);
        return p.type === "tool_call" && p.subtype === "completed";
      })!;
      const parsed = JSON.parse(completedLine);
      const key = extractToolTypeKey(parsed.tool_call)!;
      const result = extractToolResult(key, parsed.tool_call);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });
});

// ── Output parser tests ──────────────────────────────────────

describe("Cursor Output Parsers", () => {
  describe("parseCursorModelsOutput", () => {
    it("parses real models fixture", () => {
      const stdout = loadTextFixture("models-output.txt");
      const result = parseCursorModelsOutput(stdout);
      expect(result.models.length).toBeGreaterThan(0);
      expect(result.defaultModel).toBeDefined();
    });

    it("identifies default and current models", () => {
      const stdout = loadTextFixture("models-output.txt");
      const result = parseCursorModelsOutput(stdout);
      const defaultModel = result.models.find((m) => m.isDefault);
      expect(defaultModel).toBeDefined();
      const currentModel = result.models.find((m) => m.isCurrent);
      expect(currentModel).toBeDefined();
    });

    it("parses model id and name correctly", () => {
      const stdout = "gpt-5.2 - GPT-5.2\nsonnet-4.5 - Claude 4.5 Sonnet";
      const result = parseCursorModelsOutput(stdout);
      expect(result.models).toHaveLength(2);
      expect(result.models[0]?.id).toBe("gpt-5.2");
      expect(result.models[0]?.name).toBe("GPT-5.2");
      expect(result.models[1]?.id).toBe("sonnet-4.5");
      expect(result.models[1]?.name).toBe("Claude 4.5 Sonnet");
    });

    it("handles empty output", () => {
      const result = parseCursorModelsOutput("");
      expect(result.models).toHaveLength(0);
      expect(result.defaultModel).toBeUndefined();
    });
  });

  describe("parseCursorStatusOutput", () => {
    it("parses real status fixture", () => {
      const stdout = loadTextFixture("status-output.txt");
      const result = parseCursorStatusOutput(stdout);
      expect(result.authenticated).toBe(true);
      expect(result.email).toBeDefined();
    });

    it("handles not logged in", () => {
      const result = parseCursorStatusOutput("Not logged in");
      expect(result.authenticated).toBe(false);
      expect(result.email).toBeUndefined();
    });
  });

  describe("parseCursorAboutOutput", () => {
    it("parses key-value format", () => {
      const stdout = `About Cursor CLI

CLI Version         2026.01.28-fd13201
Model               Claude 4.6 Opus (Thinking)
OS                  darwin (arm64)
User Email          test@example.com`;
      const result = parseCursorAboutOutput(stdout);
      expect(result["CLI Version"]).toBe("2026.01.28-fd13201");
      expect(result.Model).toBe("Claude 4.6 Opus (Thinking)");
      expect(result.OS).toBe("darwin (arm64)");
      expect(result["User Email"]).toBe("test@example.com");
    });

    it("handles empty output", () => {
      const result = parseCursorAboutOutput("");
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("parseCursorMcpListOutput", () => {
    it("parses MCP list format", () => {
      const stdout = `playwright: not loaded (needs approval)
github: not loaded (needs approval)
context7: loaded`;
      const result = parseCursorMcpListOutput(stdout);
      expect(result).toHaveLength(3);
      expect(result[0]?.name).toBe("playwright");
      expect(result[0]?.status).toBe("not loaded");
      expect(result[0]?.reason).toBe("needs approval");
      expect(result[2]?.name).toBe("context7");
      expect(result[2]?.status).toBe("loaded");
      expect(result[2]?.reason).toBeUndefined();
    });

    it("handles empty output", () => {
      const result = parseCursorMcpListOutput("");
      expect(result).toHaveLength(0);
    });
  });
});

// ── Hook schema validation ───────────────────────────────────

describe("Cursor Hook Schema Validation", () => {
  const baseInput = {
    conversation_id: "abc-123",
    generation_id: "gen-456",
    model: "claude-4.6-opus",
    hook_event_name: "sessionStart",
    cursor_version: "2026.01.28-fd13201",
    workspace_roots: ["/workspace"],
    user_email: "test@example.com",
    transcript_path: null,
  };

  it("validates base hook input", () => {
    const result = CursorHookBaseInputSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("validates sessionStart input", () => {
    const input = {
      ...baseInput,
      session_id: "session-789",
      is_background_agent: false,
      composer_mode: "agent",
    };
    const result = CursorSessionStartInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates sessionStart output", () => {
    const output = {
      env: { MY_VAR: "value" },
      additional_context: "Follow TOADSTOOL rules",
      continue: true,
    };
    const result = CursorSessionStartOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates preToolUse input", () => {
    const input = {
      ...baseInput,
      hook_event_name: "preToolUse",
      tool_name: "Shell",
      tool_input: { command: "npm install" },
      tool_use_id: "tool-abc",
      cwd: "/workspace",
    };
    const result = CursorPreToolUseInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates preToolUse output (allow)", () => {
    const output = { decision: "allow" };
    const result = CursorPreToolUseOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates preToolUse output (deny with reason)", () => {
    const output = {
      decision: "deny",
      reason: "Blocked by policy",
    };
    const result = CursorPreToolUseOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates beforeShellExecution input", () => {
    const input = {
      ...baseInput,
      hook_event_name: "beforeShellExecution",
      command: "rm -rf /",
      working_directory: "/workspace",
    };
    const result = CursorBeforeShellExecutionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates beforeShellExecution output", () => {
    const output = { permission: "deny", reason: "Dangerous command" };
    const result = CursorBeforeShellExecutionOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates stop input", () => {
    const input = {
      ...baseInput,
      hook_event_name: "stop",
      status: "completed",
      loop_count: 0,
    };
    const result = CursorStopInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates stop output with followup", () => {
    const output = { followup_message: "Now run the tests" };
    const result = CursorStopOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates afterAgentThought input", () => {
    const input = {
      ...baseInput,
      hook_event_name: "afterAgentThought",
      thought: "I should read the file first",
    };
    const result = CursorAfterAgentThoughtInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates afterFileEdit input", () => {
    const input = {
      ...baseInput,
      hook_event_name: "afterFileEdit",
      path: "/workspace/src/index.ts",
      edits: [{ old_string: "const x = 1;", new_string: "const x = 2;" }],
    };
    const result = CursorAfterFileEditInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ── Generic CLI agent type tests ─────────────────────────────

describe("Generic CLI Agent Types", () => {
  it("validates CliAgentInstallInfo", () => {
    const data = {
      binaryName: "cursor-agent",
      binaryPath: "/usr/local/bin/cursor-agent",
      version: "2026.01.28",
      installed: true,
    };
    const result = CliAgentInstallInfoSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentAuthStatus", () => {
    const data = {
      authenticated: true,
      method: "browser_login",
      email: "test@example.com",
    };
    const result = CliAgentAuthStatusSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentModel", () => {
    const data = {
      id: "opus-4.6-thinking",
      name: "Claude 4.6 Opus (Thinking)",
      isDefault: true,
      isCurrent: true,
    };
    const result = CliAgentModelSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentModelsResponse", () => {
    const data = {
      models: [
        { id: "gpt-5.2", name: "GPT-5.2" },
        { id: "opus-4.6", name: "Claude 4.6 Opus", isDefault: true },
      ],
      defaultModel: "opus-4.6",
    };
    const result = CliAgentModelsResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentSession", () => {
    const data = {
      id: "session-123",
      title: "Test Session",
      model: "gpt-5.2",
    };
    const result = CliAgentSessionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentPromptInput", () => {
    const data = {
      message: "Hello world",
      sessionId: "session-123",
      model: "gpt-5.2",
      mode: "agent",
    };
    const result = CliAgentPromptInputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentPromptResult", () => {
    const data = {
      text: "Hello! How can I help?",
      sessionId: "session-123",
      durationMs: 5000,
      toolCallCount: 2,
    };
    const result = CliAgentPromptResultSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates CliAgentCapabilities", () => {
    const data = {
      supportsStreaming: true,
      supportsResume: true,
      supportsModes: true,
      supportsModelSelection: true,
      supportsHooks: true,
      supportsCloudAgents: true,
      supportsMcp: true,
      supportsBrowser: true,
      supportsSandbox: true,
      supportsThinking: true,
      supportsForce: true,
      supportsSessionListing: false,
      supportsSessionCreation: true,
    };
    const result = CliAgentCapabilitiesSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates StreamEvent discriminated union", () => {
    const textDelta = {
      type: STREAM_EVENT_TYPE.TEXT_DELTA,
      text: "Hello",
      sessionId: "s1",
    };
    const result = StreamEventSchema.safeParse(textDelta);
    expect(result.success).toBe(true);
  });

  it("validates all stream event types", () => {
    const events = [
      { type: STREAM_EVENT_TYPE.SESSION_INIT, model: "gpt-5.2" },
      { type: STREAM_EVENT_TYPE.TEXT_DELTA, text: "Hi" },
      { type: STREAM_EVENT_TYPE.TEXT_COMPLETE, text: "Full text" },
      {
        type: STREAM_EVENT_TYPE.TOOL_START,
        toolCallId: "t1",
        toolName: "read_file",
        toolInput: { path: "/a.txt" },
      },
      {
        type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
        toolCallId: "t1",
        toolName: "read_file",
        success: true,
      },
      {
        type: STREAM_EVENT_TYPE.TOOL_ERROR,
        toolCallId: "t1",
        toolName: "read_file",
        error: "not found",
      },
      { type: STREAM_EVENT_TYPE.THINKING_DELTA, text: "Thinking..." },
      { type: STREAM_EVENT_TYPE.THINKING_COMPLETE, text: "Full thought" },
      {
        type: STREAM_EVENT_TYPE.PERMISSION_REQUEST,
        toolName: "shell",
        toolInput: { command: "ls" },
        requestId: "r1",
      },
      {
        type: STREAM_EVENT_TYPE.FILE_EDIT,
        path: "/a.txt",
        edits: [{ oldString: "a", newString: "b" }],
      },
      { type: STREAM_EVENT_TYPE.ERROR, message: "Something failed" },
      { type: STREAM_EVENT_TYPE.RESULT, text: "Done", success: true },
    ];

    for (const event of events) {
      const result = StreamEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    }
  });
});

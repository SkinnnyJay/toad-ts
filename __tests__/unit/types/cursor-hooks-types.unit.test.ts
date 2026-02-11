import { describe, expect, it } from "vitest";
import { CURSOR_HOOK_EVENT } from "../../../src/constants/cursor-hook-events";
import {
  CursorAfterFileEditHookSchema,
  CursorAfterShellExecutionHookSchema,
  CursorBeforeMcpExecutionHookSchema,
  CursorHookInputSchema,
  CursorHookPreToolUseResponseSchema,
  CursorHookSessionStartResponseSchema,
  CursorHookStopResponseSchema,
} from "../../../src/types/cursor-hooks.types";

describe("cursor-hooks.types schemas", () => {
  const createBaseInput = (hookEventName: string) => ({
    conversation_id: "conversation-1",
    generation_id: "generation-1",
    hook_event_name: hookEventName,
    workspace_roots: ["/workspace"],
    model: "opus-4.6-thinking",
  });

  it("parses all hook event variants with common input fields", () => {
    for (const hookEventName of Object.values(CURSOR_HOOK_EVENT)) {
      const parsed = CursorHookInputSchema.parse(createBaseInput(hookEventName));
      expect(parsed.hook_event_name).toBe(hookEventName);
    }
  });

  it("parses event-specific payload examples", () => {
    const shell = CursorAfterShellExecutionHookSchema.parse({
      ...createBaseInput(CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION),
      command: "echo hello",
      exit_code: 0,
      stdout: "hello",
    });
    const mcp = CursorBeforeMcpExecutionHookSchema.parse({
      ...createBaseInput(CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION),
      server_name: "github",
      tool_name: "create_issue",
      tool_input: { title: "Bug" },
    });
    const fileEdit = CursorAfterFileEditHookSchema.parse({
      ...createBaseInput(CURSOR_HOOK_EVENT.AFTER_FILE_EDIT),
      path: "/workspace/src/file.ts",
      edits: [{ old_string: "a", new_string: "b" }],
    });

    expect(shell.command).toBe("echo hello");
    expect(mcp.server_name).toBe("github");
    expect(fileEdit.path).toBe("/workspace/src/file.ts");
  });

  it("parses hook response schemas", () => {
    const sessionStartResponse = CursorHookSessionStartResponseSchema.parse({
      continue: true,
      additional_context: "Use repo rules.",
      env: { SAMPLE_KEY: "value" },
    });
    const preToolUseResponse = CursorHookPreToolUseResponseSchema.parse({
      decision: "ask",
      reason: "requires approval",
    });
    const stopResponse = CursorHookStopResponseSchema.parse({
      followup_message: "Continue with tests.",
    });

    expect(sessionStartResponse.continue).toBe(true);
    expect(preToolUseResponse.decision).toBe("ask");
    expect(stopResponse.followup_message).toBe("Continue with tests.");
  });
});

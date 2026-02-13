import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { PERMISSION } from "@/constants/permissions";
import {
  CursorBeforeMcpExecutionOutputSchema,
  CursorBeforeReadFileOutputSchema,
  CursorBeforeShellExecutionOutputSchema,
  CursorHookInputSchema,
  CursorPreToolUseOutputSchema,
  CursorSessionStartInputSchema,
  CursorSessionStartOutputSchema,
  CursorStopOutputSchema,
  CursorSubagentStartOutputSchema,
  CursorSubagentStopOutputSchema,
} from "@/types/cursor-hooks.types";
import { describe, expect, it } from "vitest";

const baseEvent = {
  conversation_id: "conv-1",
  generation_id: "gen-1",
  model: "opus-4.6-thinking",
  cursor_version: "2026.01.28",
  workspace_roots: ["/workspace"],
};

describe("cursor-hooks types", () => {
  it("parses sessionStart event payload", () => {
    const parsed = CursorSessionStartInputSchema.parse({
      ...baseEvent,
      session_id: "sess-1",
      hook_event_name: CURSOR_HOOK_EVENT.SESSION_START,
      composer_mode: "ask",
      is_background_agent: false,
    });

    expect(parsed.hook_event_name).toBe(CURSOR_HOOK_EVENT.SESSION_START);
    expect(parsed.composer_mode).toBe("ask");
  });

  it("parses all hook event names through discriminated union", () => {
    const events = [
      CURSOR_HOOK_EVENT.SESSION_START,
      CURSOR_HOOK_EVENT.SESSION_END,
      CURSOR_HOOK_EVENT.PRE_TOOL_USE,
      CURSOR_HOOK_EVENT.POST_TOOL_USE,
      CURSOR_HOOK_EVENT.POST_TOOL_USE_FAILURE,
      CURSOR_HOOK_EVENT.SUBAGENT_START,
      CURSOR_HOOK_EVENT.SUBAGENT_STOP,
      CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
      CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION,
      CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
      CURSOR_HOOK_EVENT.AFTER_MCP_EXECUTION,
      CURSOR_HOOK_EVENT.BEFORE_READ_FILE,
      CURSOR_HOOK_EVENT.AFTER_FILE_EDIT,
      CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT,
      CURSOR_HOOK_EVENT.PRE_COMPACT,
      CURSOR_HOOK_EVENT.STOP,
      CURSOR_HOOK_EVENT.AFTER_AGENT_RESPONSE,
      CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
    ];

    for (const hookEventName of events) {
      const parsed = CursorHookInputSchema.parse({
        ...baseEvent,
        hook_event_name: hookEventName,
      });
      expect(parsed.hook_event_name).toBe(hookEventName);
    }
  });

  it("parses output decision schemas", () => {
    const preToolUse = CursorPreToolUseOutputSchema.parse({
      decision: PERMISSION.DENY,
      reason: "Denied by policy",
    });
    const beforeShell = CursorBeforeShellExecutionOutputSchema.parse({
      permission: PERMISSION.ASK,
    });
    const beforeMcp = CursorBeforeMcpExecutionOutputSchema.parse({
      permission: PERMISSION.ALLOW,
    });
    const beforeReadFile = CursorBeforeReadFileOutputSchema.parse({
      permission: PERMISSION.DENY,
    });
    const stop = CursorStopOutputSchema.parse({
      followup_message: "continue",
    });
    const sessionStart = CursorSessionStartOutputSchema.parse({
      continue: true,
      additional_context: "rules",
      env: { KEY: "VALUE" },
    });
    const subagentStart = CursorSubagentStartOutputSchema.parse({
      decision: PERMISSION.ASK,
    });
    const subagentStop = CursorSubagentStopOutputSchema.parse({
      followup_message: "next task",
    });

    expect(preToolUse.decision).toBe(PERMISSION.DENY);
    expect(beforeShell.permission).toBe(PERMISSION.ASK);
    expect(beforeMcp.permission).toBe(PERMISSION.ALLOW);
    expect(beforeReadFile.permission).toBe(PERMISSION.DENY);
    expect(stop.followup_message).toBe("continue");
    expect(sessionStart.continue).toBe(true);
    expect(subagentStart.decision).toBe(PERMISSION.ASK);
    expect(subagentStop.followup_message).toBe("next task");
  });
});

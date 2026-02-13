import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { PERMISSION } from "@/constants/permissions";
import { z } from "zod";

const CursorHookEventSchema = z.enum([
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
]);

export const CursorHookInputBaseSchema = z
  .object({
    conversation_id: z.string().min(1),
    generation_id: z.string().min(1),
    session_id: z.string().min(1).optional(),
    model: z.string().min(1),
    hook_event_name: CursorHookEventSchema,
    cursor_version: z.string().min(1).optional(),
    workspace_roots: z.array(z.string()).optional(),
    user_email: z.string().nullable().optional(),
    transcript_path: z.string().nullable().optional(),
  })
  .passthrough();
export type CursorHookInputBase = z.infer<typeof CursorHookInputBaseSchema>;

const withHookEventName = (
  hookEventName: z.infer<typeof CursorHookEventSchema>,
  shape?: z.ZodRawShape
) => {
  return CursorHookInputBaseSchema.extend({
    hook_event_name: z.literal(hookEventName),
    ...(shape ?? {}),
  }).passthrough();
};

export const CursorSessionStartInputSchema = withHookEventName(CURSOR_HOOK_EVENT.SESSION_START, {
  is_background_agent: z.boolean().optional(),
  composer_mode: z.string().optional(),
});
export const CursorSessionEndInputSchema = withHookEventName(CURSOR_HOOK_EVENT.SESSION_END);
export const CursorPreToolUseInputSchema = withHookEventName(CURSOR_HOOK_EVENT.PRE_TOOL_USE, {
  tool_name: z.string().optional(),
  tool_input: z.record(z.unknown()).optional(),
});
export const CursorPostToolUseInputSchema = withHookEventName(CURSOR_HOOK_EVENT.POST_TOOL_USE, {
  tool_name: z.string().optional(),
  tool_result: z.unknown().optional(),
});
export const CursorPostToolUseFailureInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.POST_TOOL_USE_FAILURE,
  {
    tool_name: z.string().optional(),
    error: z.string().optional(),
  }
);
export const CursorSubagentStartInputSchema = withHookEventName(CURSOR_HOOK_EVENT.SUBAGENT_START, {
  task_description: z.string().optional(),
});
export const CursorSubagentStopInputSchema = withHookEventName(CURSOR_HOOK_EVENT.SUBAGENT_STOP, {
  summary: z.string().optional(),
});
export const CursorBeforeShellExecutionInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
  {
    command: z.string().optional(),
  }
);
export const CursorAfterShellExecutionInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION,
  {
    command: z.string().optional(),
    exit_code: z.number().int().optional(),
  }
);
export const CursorBeforeMcpExecutionInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
  {
    server_name: z.string().optional(),
    tool_name: z.string().optional(),
  }
);
export const CursorAfterMcpExecutionInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.AFTER_MCP_EXECUTION,
  {
    server_name: z.string().optional(),
    tool_name: z.string().optional(),
    result: z.unknown().optional(),
  }
);
export const CursorBeforeReadFileInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.BEFORE_READ_FILE,
  {
    path: z.string().optional(),
  }
);
export const CursorAfterFileEditInputSchema = withHookEventName(CURSOR_HOOK_EVENT.AFTER_FILE_EDIT, {
  path: z.string().optional(),
  edits: z.array(z.record(z.unknown())).optional(),
});
export const CursorBeforeSubmitPromptInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT,
  {
    prompt: z.string().optional(),
  }
);
export const CursorPreCompactInputSchema = withHookEventName(CURSOR_HOOK_EVENT.PRE_COMPACT);
export const CursorStopInputSchema = withHookEventName(CURSOR_HOOK_EVENT.STOP);
export const CursorAfterAgentResponseInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.AFTER_AGENT_RESPONSE,
  {
    response: z.string().optional(),
  }
);
export const CursorAfterAgentThoughtInputSchema = withHookEventName(
  CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
  {
    thought: z.string().optional(),
  }
);

export const CursorHookInputSchema = z.discriminatedUnion("hook_event_name", [
  CursorSessionStartInputSchema,
  CursorSessionEndInputSchema,
  CursorPreToolUseInputSchema,
  CursorPostToolUseInputSchema,
  CursorPostToolUseFailureInputSchema,
  CursorSubagentStartInputSchema,
  CursorSubagentStopInputSchema,
  CursorBeforeShellExecutionInputSchema,
  CursorAfterShellExecutionInputSchema,
  CursorBeforeMcpExecutionInputSchema,
  CursorAfterMcpExecutionInputSchema,
  CursorBeforeReadFileInputSchema,
  CursorAfterFileEditInputSchema,
  CursorBeforeSubmitPromptInputSchema,
  CursorPreCompactInputSchema,
  CursorStopInputSchema,
  CursorAfterAgentResponseInputSchema,
  CursorAfterAgentThoughtInputSchema,
]);
export type CursorHookInput = z.infer<typeof CursorHookInputSchema>;

const CursorDecisionSchema = z.enum([PERMISSION.ALLOW, PERMISSION.DENY, PERMISSION.ASK]);

export const CursorSessionStartOutputSchema = z
  .object({
    continue: z.boolean().optional(),
    additional_context: z.string().optional(),
    env: z.record(z.string()).optional(),
  })
  .strict();
export type CursorSessionStartOutput = z.infer<typeof CursorSessionStartOutputSchema>;

export const CursorPreToolUseOutputSchema = z
  .object({
    decision: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type CursorPreToolUseOutput = z.infer<typeof CursorPreToolUseOutputSchema>;

export const CursorBeforeShellExecutionOutputSchema = z
  .object({
    permission: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type CursorBeforeShellExecutionOutput = z.infer<
  typeof CursorBeforeShellExecutionOutputSchema
>;

export const CursorBeforeMcpExecutionOutputSchema = z
  .object({
    permission: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type CursorBeforeMcpExecutionOutput = z.infer<typeof CursorBeforeMcpExecutionOutputSchema>;

export const CursorBeforeReadFileOutputSchema = z
  .object({
    permission: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type CursorBeforeReadFileOutput = z.infer<typeof CursorBeforeReadFileOutputSchema>;

export const CursorStopOutputSchema = z
  .object({
    followup_message: z.string().optional(),
  })
  .strict();
export type CursorStopOutput = z.infer<typeof CursorStopOutputSchema>;

export const CursorSubagentStartOutputSchema = z
  .object({
    decision: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type CursorSubagentStartOutput = z.infer<typeof CursorSubagentStartOutputSchema>;

export const CursorSubagentStopOutputSchema = z
  .object({
    followup_message: z.string().optional(),
  })
  .strict();
export type CursorSubagentStopOutput = z.infer<typeof CursorSubagentStopOutputSchema>;

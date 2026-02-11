import { CURSOR_HOOK_EVENT, type CursorHookEvent } from "@/constants/cursor-hook-events";
import { z } from "zod";

export const CURSOR_HOOK_DECISION = {
  ALLOW: "allow",
  DENY: "deny",
  ASK: "ask",
} as const;

export type CursorHookDecision = (typeof CURSOR_HOOK_DECISION)[keyof typeof CURSOR_HOOK_DECISION];

const cursorHookEventValues: [CursorHookEvent, ...CursorHookEvent[]] = [
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

export const CursorHookCommonFieldsSchema = z
  .object({
    conversation_id: z.string().min(1),
    generation_id: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    hook_event_name: z.enum(cursorHookEventValues),
    cursor_version: z.string().min(1).optional(),
    workspace_roots: z.array(z.string().min(1)).default([]),
    user_email: z.string().email().nullable().optional(),
    transcript_path: z.string().min(1).nullable().optional(),
  })
  .passthrough();

export type CursorHookCommonFields = z.infer<typeof CursorHookCommonFieldsSchema>;

const createHookEventSchema = <T extends z.ZodRawShape>(
  eventName: CursorHookEvent,
  shape: T
): z.ZodObject<{ hook_event_name: z.ZodLiteral<CursorHookEvent> } & T> =>
  CursorHookCommonFieldsSchema.extend({
    hook_event_name: z.literal(eventName),
    ...shape,
  });

export const CursorSessionStartHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.SESSION_START,
  {}
);
export const CursorSessionEndHookSchema = createHookEventSchema(CURSOR_HOOK_EVENT.SESSION_END, {});
export const CursorPreToolUseHookSchema = createHookEventSchema(CURSOR_HOOK_EVENT.PRE_TOOL_USE, {
  tool_name: z.string().min(1).optional(),
  tool_input: z.unknown().optional(),
});
export const CursorPostToolUseHookSchema = createHookEventSchema(CURSOR_HOOK_EVENT.POST_TOOL_USE, {
  tool_name: z.string().min(1).optional(),
  tool_output: z.unknown().optional(),
});
export const CursorPostToolUseFailureHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.POST_TOOL_USE_FAILURE,
  {
    tool_name: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
  }
);
export const CursorSubagentStartHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.SUBAGENT_START,
  {
    subagent_name: z.string().min(1).optional(),
    prompt: z.string().optional(),
  }
);
export const CursorSubagentStopHookSchema = createHookEventSchema(CURSOR_HOOK_EVENT.SUBAGENT_STOP, {
  subagent_name: z.string().min(1).optional(),
  result: z.string().optional(),
});
export const CursorBeforeShellExecutionHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
  {
    command: z.string().min(1).optional(),
  }
);
export const CursorAfterShellExecutionHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION,
  {
    command: z.string().min(1).optional(),
    exit_code: z.number().int().optional(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
  }
);
export const CursorBeforeMcpExecutionHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
  {
    server_name: z.string().min(1).optional(),
    tool_name: z.string().min(1).optional(),
    tool_input: z.unknown().optional(),
  }
);
export const CursorAfterMcpExecutionHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.AFTER_MCP_EXECUTION,
  {
    server_name: z.string().min(1).optional(),
    tool_name: z.string().min(1).optional(),
    tool_output: z.unknown().optional(),
  }
);
export const CursorBeforeReadFileHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.BEFORE_READ_FILE,
  {
    path: z.string().min(1).optional(),
  }
);
const CursorFileEditSchema = z
  .object({
    path: z.string().min(1).optional(),
    old_string: z.string().optional(),
    new_string: z.string().optional(),
  })
  .passthrough();

export const CursorAfterFileEditHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.AFTER_FILE_EDIT,
  {
    path: z.string().min(1).optional(),
    edits: z.array(CursorFileEditSchema).optional(),
  }
);
export const CursorBeforeSubmitPromptHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT,
  {
    prompt: z.string().optional(),
  }
);
export const CursorPreCompactHookSchema = createHookEventSchema(CURSOR_HOOK_EVENT.PRE_COMPACT, {});
export const CursorStopHookSchema = createHookEventSchema(CURSOR_HOOK_EVENT.STOP, {
  reason: z.string().optional(),
});
export const CursorAfterAgentResponseHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.AFTER_AGENT_RESPONSE,
  {
    response: z.string().optional(),
  }
);
export const CursorAfterAgentThoughtHookSchema = createHookEventSchema(
  CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
  {
    thought: z.string().optional(),
  }
);

export const CursorHookInputSchema = z.union([
  CursorSessionStartHookSchema,
  CursorSessionEndHookSchema,
  CursorPreToolUseHookSchema,
  CursorPostToolUseHookSchema,
  CursorPostToolUseFailureHookSchema,
  CursorSubagentStartHookSchema,
  CursorSubagentStopHookSchema,
  CursorBeforeShellExecutionHookSchema,
  CursorAfterShellExecutionHookSchema,
  CursorBeforeMcpExecutionHookSchema,
  CursorAfterMcpExecutionHookSchema,
  CursorBeforeReadFileHookSchema,
  CursorAfterFileEditHookSchema,
  CursorBeforeSubmitPromptHookSchema,
  CursorPreCompactHookSchema,
  CursorStopHookSchema,
  CursorAfterAgentResponseHookSchema,
  CursorAfterAgentThoughtHookSchema,
]);

export type CursorHookInput = z.infer<typeof CursorHookInputSchema>;

const CursorDecisionSchema = z.enum([
  CURSOR_HOOK_DECISION.ALLOW,
  CURSOR_HOOK_DECISION.DENY,
  CURSOR_HOOK_DECISION.ASK,
]);

export const CursorHookSessionStartResponseSchema = z
  .object({
    continue: z.boolean().optional(),
    additional_context: z.string().optional(),
    env: z.record(z.string()).optional(),
  })
  .strict();

export const CursorHookPreToolUseResponseSchema = z
  .object({
    decision: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();

export const CursorHookBeforeShellExecutionResponseSchema = z
  .object({
    permission: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();

export const CursorHookBeforeMcpExecutionResponseSchema = z
  .object({
    permission: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();

export const CursorHookBeforeReadFileResponseSchema = z
  .object({
    permission: CursorDecisionSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();

export const CursorHookStopResponseSchema = z
  .object({
    followup_message: z.string().optional(),
  })
  .strict();

export const CursorHookSubagentStopResponseSchema = z
  .object({
    followup_message: z.string().optional(),
  })
  .strict();

export const CursorHookBeforeSubmitPromptResponseSchema = z
  .object({
    continue: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .strict();

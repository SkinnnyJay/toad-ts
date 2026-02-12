/**
 * Cursor CLI hook event Zod schemas.
 *
 * These validate the JSON payloads exchanged between Cursor Agent
 * and hook scripts via stdin/stdout.
 *
 * @see PLAN2.md — "Hooks System (Channel 2)"
 */

import { z } from "zod";

// ── Common base fields (sent to ALL hooks) ───────────────────

export const CursorHookBaseInputSchema = z.object({
  conversation_id: z.string(),
  generation_id: z.string(),
  model: z.string(),
  hook_event_name: z.string(),
  cursor_version: z.string(),
  workspace_roots: z.array(z.string()),
  user_email: z.string().nullable(),
  transcript_path: z.string().nullable(),
});
export type CursorHookBaseInput = z.infer<typeof CursorHookBaseInputSchema>;

// ── sessionStart ─────────────────────────────────────────────

export const CursorSessionStartInputSchema = CursorHookBaseInputSchema.extend({
  session_id: z.string(),
  is_background_agent: z.boolean(),
  composer_mode: z.string(),
});
export type CursorSessionStartInput = z.infer<typeof CursorSessionStartInputSchema>;

export const CursorSessionStartOutputSchema = z.object({
  env: z.record(z.string()).optional(),
  additional_context: z.string().optional(),
  continue: z.boolean().optional(),
});
export type CursorSessionStartOutput = z.infer<typeof CursorSessionStartOutputSchema>;

// ── sessionEnd ───────────────────────────────────────────────

export const CursorSessionEndInputSchema = CursorHookBaseInputSchema.extend({
  session_id: z.string(),
});
export type CursorSessionEndInput = z.infer<typeof CursorSessionEndInputSchema>;

// sessionEnd is fire-and-forget — no output schema needed

// ── preToolUse ───────────────────────────────────────────────

export const CursorPreToolUseInputSchema = CursorHookBaseInputSchema.extend({
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
  tool_use_id: z.string(),
  cwd: z.string().optional(),
});
export type CursorPreToolUseInput = z.infer<typeof CursorPreToolUseInputSchema>;

export const CursorPreToolUseOutputSchema = z.object({
  decision: z.enum(["allow", "deny"]),
  reason: z.string().optional(),
  updated_input: z.record(z.unknown()).optional(),
});
export type CursorPreToolUseOutput = z.infer<typeof CursorPreToolUseOutputSchema>;

// ── postToolUse ──────────────────────────────────────────────

export const CursorPostToolUseInputSchema = CursorHookBaseInputSchema.extend({
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
  tool_use_id: z.string(),
  tool_result: z.unknown(),
  cwd: z.string().optional(),
});
export type CursorPostToolUseInput = z.infer<typeof CursorPostToolUseInputSchema>;

// postToolUse is observe-only — no output needed

// ── postToolUseFailure ───────────────────────────────────────

export const CursorPostToolUseFailureInputSchema = CursorHookBaseInputSchema.extend({
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
  tool_use_id: z.string(),
  error: z.string(),
  cwd: z.string().optional(),
});
export type CursorPostToolUseFailureInput = z.infer<typeof CursorPostToolUseFailureInputSchema>;

// ── subagentStart ────────────────────────────────────────────

export const CursorSubagentStartInputSchema = CursorHookBaseInputSchema.extend({
  task_description: z.string().optional(),
  subagent_id: z.string().optional(),
});
export type CursorSubagentStartInput = z.infer<typeof CursorSubagentStartInputSchema>;

export const CursorSubagentStartOutputSchema = z.object({
  decision: z.enum(["allow", "deny"]),
  reason: z.string().optional(),
});
export type CursorSubagentStartOutput = z.infer<typeof CursorSubagentStartOutputSchema>;

// ── subagentStop ─────────────────────────────────────────────

export const CursorSubagentStopInputSchema = CursorHookBaseInputSchema.extend({
  subagent_id: z.string().optional(),
  result: z.string().optional(),
});
export type CursorSubagentStopInput = z.infer<typeof CursorSubagentStopInputSchema>;

export const CursorSubagentStopOutputSchema = z.object({
  followup_message: z.string().optional(),
});
export type CursorSubagentStopOutput = z.infer<typeof CursorSubagentStopOutputSchema>;

// ── beforeShellExecution ─────────────────────────────────────

export const CursorBeforeShellExecutionInputSchema = CursorHookBaseInputSchema.extend({
  command: z.string(),
  working_directory: z.string().optional(),
  shell: z.string().optional(),
});
export type CursorBeforeShellExecutionInput = z.infer<typeof CursorBeforeShellExecutionInputSchema>;

export const CursorBeforeShellExecutionOutputSchema = z.object({
  permission: z.enum(["allow", "deny", "ask"]),
  reason: z.string().optional(),
});
export type CursorBeforeShellExecutionOutput = z.infer<typeof CursorBeforeShellExecutionOutputSchema>;

// ── afterShellExecution ──────────────────────────────────────

export const CursorAfterShellExecutionInputSchema = CursorHookBaseInputSchema.extend({
  command: z.string(),
  exit_code: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  working_directory: z.string().optional(),
});
export type CursorAfterShellExecutionInput = z.infer<typeof CursorAfterShellExecutionInputSchema>;

// ── beforeMCPExecution ───────────────────────────────────────

export const CursorBeforeMCPExecutionInputSchema = CursorHookBaseInputSchema.extend({
  server_name: z.string(),
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
});
export type CursorBeforeMCPExecutionInput = z.infer<typeof CursorBeforeMCPExecutionInputSchema>;

export const CursorBeforeMCPExecutionOutputSchema = z.object({
  permission: z.enum(["allow", "deny"]),
  reason: z.string().optional(),
});
export type CursorBeforeMCPExecutionOutput = z.infer<typeof CursorBeforeMCPExecutionOutputSchema>;

// ── afterMCPExecution ────────────────────────────────────────

export const CursorAfterMCPExecutionInputSchema = CursorHookBaseInputSchema.extend({
  server_name: z.string(),
  tool_name: z.string(),
  tool_result: z.unknown(),
});
export type CursorAfterMCPExecutionInput = z.infer<typeof CursorAfterMCPExecutionInputSchema>;

// ── beforeReadFile ───────────────────────────────────────────

export const CursorBeforeReadFileInputSchema = CursorHookBaseInputSchema.extend({
  path: z.string(),
});
export type CursorBeforeReadFileInput = z.infer<typeof CursorBeforeReadFileInputSchema>;

export const CursorBeforeReadFileOutputSchema = z.object({
  permission: z.enum(["allow", "deny"]),
  reason: z.string().optional(),
});
export type CursorBeforeReadFileOutput = z.infer<typeof CursorBeforeReadFileOutputSchema>;

// ── afterFileEdit ────────────────────────────────────────────

export const CursorFileEditDetailSchema = z.object({
  old_string: z.string(),
  new_string: z.string(),
});

export const CursorAfterFileEditInputSchema = CursorHookBaseInputSchema.extend({
  path: z.string(),
  edits: z.array(CursorFileEditDetailSchema),
});
export type CursorAfterFileEditInput = z.infer<typeof CursorAfterFileEditInputSchema>;

// ── beforeSubmitPrompt ───────────────────────────────────────

export const CursorBeforeSubmitPromptInputSchema = CursorHookBaseInputSchema.extend({
  prompt: z.string(),
});
export type CursorBeforeSubmitPromptInput = z.infer<typeof CursorBeforeSubmitPromptInputSchema>;

export const CursorBeforeSubmitPromptOutputSchema = z.object({
  continue: z.boolean().optional(),
  modified_prompt: z.string().optional(),
});
export type CursorBeforeSubmitPromptOutput = z.infer<typeof CursorBeforeSubmitPromptOutputSchema>;

// ── preCompact ───────────────────────────────────────────────

export const CursorPreCompactInputSchema = CursorHookBaseInputSchema.extend({
  token_count: z.number().optional(),
  max_tokens: z.number().optional(),
});
export type CursorPreCompactInput = z.infer<typeof CursorPreCompactInputSchema>;

// ── stop ─────────────────────────────────────────────────────

export const CursorStopInputSchema = CursorHookBaseInputSchema.extend({
  status: z.string(),
  loop_count: z.number(),
});
export type CursorStopInput = z.infer<typeof CursorStopInputSchema>;

export const CursorStopOutputSchema = z.object({
  followup_message: z.string().optional(),
});
export type CursorStopOutput = z.infer<typeof CursorStopOutputSchema>;

// ── afterAgentResponse ───────────────────────────────────────

export const CursorAfterAgentResponseInputSchema = CursorHookBaseInputSchema.extend({
  response: z.string(),
});
export type CursorAfterAgentResponseInput = z.infer<typeof CursorAfterAgentResponseInputSchema>;

// ── afterAgentThought ────────────────────────────────────────

export const CursorAfterAgentThoughtInputSchema = CursorHookBaseInputSchema.extend({
  thought: z.string(),
});
export type CursorAfterAgentThoughtInput = z.infer<typeof CursorAfterAgentThoughtInputSchema>;

// ── Generic hook input/output (for routing) ──────────────────

/** Union of all hook inputs for generic routing */
export type CursorHookInput =
  | CursorSessionStartInput
  | CursorSessionEndInput
  | CursorPreToolUseInput
  | CursorPostToolUseInput
  | CursorPostToolUseFailureInput
  | CursorSubagentStartInput
  | CursorSubagentStopInput
  | CursorBeforeShellExecutionInput
  | CursorAfterShellExecutionInput
  | CursorBeforeMCPExecutionInput
  | CursorAfterMCPExecutionInput
  | CursorBeforeReadFileInput
  | CursorAfterFileEditInput
  | CursorBeforeSubmitPromptInput
  | CursorPreCompactInput
  | CursorStopInput
  | CursorAfterAgentResponseInput
  | CursorAfterAgentThoughtInput;

/** Union of all hook outputs (for blocking hooks) */
export type CursorHookOutput =
  | CursorSessionStartOutput
  | CursorPreToolUseOutput
  | CursorSubagentStartOutput
  | CursorSubagentStopOutput
  | CursorBeforeShellExecutionOutput
  | CursorBeforeMCPExecutionOutput
  | CursorBeforeReadFileOutput
  | CursorBeforeSubmitPromptOutput
  | CursorStopOutput
  | Record<string, never>;

/**
 * Generic CLI Agent Zod schemas.
 *
 * Protocol-agnostic types representing common operations every CLI agent supports,
 * regardless of underlying protocol (NDJSON, ACP, etc.).
 *
 * @see PLAN2.md — "ADDENDUM A: Generic CLI Agent Interface"
 */

import { z } from "zod";

// ── Installation & Auth ──────────────────────────────────────

export const CliAgentInstallInfoSchema = z.object({
  binaryName: z.string(),
  binaryPath: z.string().optional(),
  version: z.string().optional(),
  installed: z.boolean(),
  installCommand: z.string().optional(),
});
export type CliAgentInstallInfo = z.infer<typeof CliAgentInstallInfoSchema>;

export const CliAgentAuthMethodSchema = z.enum(["api_key", "browser_login", "oauth", "none"]);
export type CliAgentAuthMethod = z.infer<typeof CliAgentAuthMethodSchema>;

export const CliAgentAuthStatusSchema = z.object({
  authenticated: z.boolean(),
  method: CliAgentAuthMethodSchema.optional(),
  email: z.string().optional(),
  expiresAt: z.number().optional(),
});
export type CliAgentAuthStatus = z.infer<typeof CliAgentAuthStatusSchema>;

// ── Models ───────────────────────────────────────────────────

export const CliAgentModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string().optional(),
  isDefault: z.boolean().default(false),
  isCurrent: z.boolean().default(false),
  supportsThinking: z.boolean().default(false),
  maxContextTokens: z.number().optional(),
});
export type CliAgentModel = z.infer<typeof CliAgentModelSchema>;

export const CliAgentModelsResponseSchema = z.object({
  models: z.array(CliAgentModelSchema),
  defaultModel: z.string().optional(),
  currentModel: z.string().optional(),
});
export type CliAgentModelsResponse = z.infer<typeof CliAgentModelsResponseSchema>;

// ── Sessions ─────────────────────────────────────────────────

export const CliAgentSessionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  createdAt: z.string().optional(),
  model: z.string().optional(),
  messageCount: z.number().optional(),
});
export type CliAgentSession = z.infer<typeof CliAgentSessionSchema>;

// ── Prompt Input ─────────────────────────────────────────────

export const CliAgentModeSchema = z.enum(["agent", "plan", "ask"]);
export type CliAgentMode = z.infer<typeof CliAgentModeSchema>;

export const CliAgentPromptInputSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
  model: z.string().optional(),
  mode: CliAgentModeSchema.optional(),
  workspacePath: z.string().optional(),
  force: z.boolean().default(false),
  streaming: z.boolean().default(true),
  additionalFlags: z.record(z.string()).optional(),
});
export type CliAgentPromptInput = z.infer<typeof CliAgentPromptInputSchema>;

// ── Stream Events (Protocol-Agnostic) ────────────────────────

export const STREAM_EVENT_TYPE = {
  SESSION_INIT: "session_init",
  TEXT_DELTA: "text_delta",
  TEXT_COMPLETE: "text_complete",
  TOOL_START: "tool_start",
  TOOL_COMPLETE: "tool_complete",
  TOOL_ERROR: "tool_error",
  THINKING_DELTA: "thinking_delta",
  THINKING_COMPLETE: "thinking_complete",
  PERMISSION_REQUEST: "permission_request",
  FILE_EDIT: "file_edit",
  ERROR: "error",
  RESULT: "result",
} as const;

export type StreamEventType = (typeof STREAM_EVENT_TYPE)[keyof typeof STREAM_EVENT_TYPE];

export const StreamEventBaseSchema = z.object({
  type: z.string(),
  sessionId: z.string().optional(),
  timestamp: z.number().optional(),
});

export const SessionInitEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.SESSION_INIT),
  model: z.string(),
  mode: z.string().optional(),
});
export type SessionInitEvent = z.infer<typeof SessionInitEventSchema>;

export const TextDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_DELTA),
  text: z.string(),
});
export type TextDeltaEvent = z.infer<typeof TextDeltaEventSchema>;

export const TextCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_COMPLETE),
  text: z.string(),
});
export type TextCompleteEvent = z.infer<typeof TextCompleteEventSchema>;

export const ToolStartEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_START),
  toolCallId: z.string(),
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
});
export type ToolStartEvent = z.infer<typeof ToolStartEventSchema>;

export const ToolCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_COMPLETE),
  toolCallId: z.string(),
  toolName: z.string(),
  success: z.boolean(),
  result: z.record(z.unknown()).optional(),
});
export type ToolCompleteEvent = z.infer<typeof ToolCompleteEventSchema>;

export const ToolErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_ERROR),
  toolCallId: z.string(),
  toolName: z.string(),
  error: z.string(),
});
export type ToolErrorEvent = z.infer<typeof ToolErrorEventSchema>;

export const ThinkingDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.THINKING_DELTA),
  text: z.string(),
});
export type ThinkingDeltaEvent = z.infer<typeof ThinkingDeltaEventSchema>;

export const ThinkingCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.THINKING_COMPLETE),
  text: z.string(),
});
export type ThinkingCompleteEvent = z.infer<typeof ThinkingCompleteEventSchema>;

export const PermissionRequestEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.PERMISSION_REQUEST),
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
  requestId: z.string(),
});
export type PermissionRequestEvent = z.infer<typeof PermissionRequestEventSchema>;

export const FileEditEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.FILE_EDIT),
  path: z.string(),
  edits: z.array(
    z.object({
      oldString: z.string(),
      newString: z.string(),
    })
  ),
});
export type FileEditEvent = z.infer<typeof FileEditEventSchema>;

export const ErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.ERROR),
  message: z.string(),
  code: z.string().optional(),
});
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export const ResultEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.RESULT),
  text: z.string(),
  durationMs: z.number().optional(),
  success: z.boolean(),
});
export type ResultEvent = z.infer<typeof ResultEventSchema>;

export const StreamEventSchema = z.discriminatedUnion("type", [
  SessionInitEventSchema,
  TextDeltaEventSchema,
  TextCompleteEventSchema,
  ToolStartEventSchema,
  ToolCompleteEventSchema,
  ToolErrorEventSchema,
  ThinkingDeltaEventSchema,
  ThinkingCompleteEventSchema,
  PermissionRequestEventSchema,
  FileEditEventSchema,
  ErrorEventSchema,
  ResultEventSchema,
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;

// ── Prompt Result ────────────────────────────────────────────

export const CliAgentPromptResultSchema = z.object({
  text: z.string(),
  sessionId: z.string(),
  durationMs: z.number().optional(),
  toolCallCount: z.number().default(0),
  model: z.string().optional(),
});
export type CliAgentPromptResult = z.infer<typeof CliAgentPromptResultSchema>;

// ── Capabilities ─────────────────────────────────────────────

export const CliAgentCapabilitiesSchema = z.object({
  supportsStreaming: z.boolean(),
  supportsResume: z.boolean(),
  supportsModes: z.boolean(),
  supportsModelSelection: z.boolean(),
  supportsHooks: z.boolean(),
  supportsCloudAgents: z.boolean(),
  supportsMcp: z.boolean(),
  supportsBrowser: z.boolean(),
  supportsSandbox: z.boolean(),
  supportsThinking: z.boolean(),
  supportsForce: z.boolean(),
  supportsSessionListing: z.boolean(),
  supportsSessionCreation: z.boolean(),
});
export type CliAgentCapabilities = z.infer<typeof CliAgentCapabilitiesSchema>;

// ── Agent Management Commands ────────────────────────────────

export const CliAgentLoginResultSchema = z.object({
  success: z.boolean(),
  email: z.string().optional(),
  method: z.enum(["browser", "api_key", "token", "env_var"]).optional(),
  message: z.string().optional(),
  requiresManualAction: z.boolean().default(false),
  manualInstructions: z.string().optional(),
});
export type CliAgentLoginResult = z.infer<typeof CliAgentLoginResultSchema>;

export const CliAgentLogoutResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  supported: z.boolean().default(true),
});
export type CliAgentLogoutResult = z.infer<typeof CliAgentLogoutResultSchema>;

export const CliAgentStatusResultSchema = z.object({
  agent: z.string(),
  version: z.string(),
  authenticated: z.boolean(),
  email: z.string().optional(),
  defaultModel: z.string().optional(),
  currentModel: z.string().optional(),
  os: z.string().optional(),
  shell: z.string().optional(),
  sessionId: z.string().optional(),
  sessionTurnCount: z.number().optional(),
});
export type CliAgentStatusResult = z.infer<typeof CliAgentStatusResultSchema>;

export const CliAgentAboutResultSchema = z.object({
  version: z.string(),
  model: z.string().optional(),
  os: z.string().optional(),
  shell: z.string().optional(),
  email: z.string().optional(),
  extra: z.record(z.string()).optional(),
});
export type CliAgentAboutResult = z.infer<typeof CliAgentAboutResultSchema>;

export const CliAgentMcpServerSchema = z.object({
  name: z.string(),
  status: z.string(),
  reason: z.string().optional(),
});
export type CliAgentMcpServer = z.infer<typeof CliAgentMcpServerSchema>;

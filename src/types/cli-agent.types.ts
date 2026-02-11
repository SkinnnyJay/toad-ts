import { z } from "zod";

export const CLI_AGENT_AUTH_METHOD = {
  API_KEY: "api_key",
  BROWSER_LOGIN: "browser_login",
  OAUTH: "oauth",
  NONE: "none",
} as const;

export type CliAgentAuthMethod = (typeof CLI_AGENT_AUTH_METHOD)[keyof typeof CLI_AGENT_AUTH_METHOD];

export const CLI_AGENT_PROMPT_MODE = {
  AGENT: "agent",
  PLAN: "plan",
  ASK: "ask",
} as const;

export type CliAgentPromptMode = (typeof CLI_AGENT_PROMPT_MODE)[keyof typeof CLI_AGENT_PROMPT_MODE];

export const CliAgentInstallInfoSchema = z
  .object({
    binaryName: z.string().min(1),
    binaryPath: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    installed: z.boolean(),
    installCommand: z.string().min(1).optional(),
  })
  .strict();

export type CliAgentInstallInfo = z.infer<typeof CliAgentInstallInfoSchema>;

export const CliAgentAuthStatusSchema = z
  .object({
    authenticated: z.boolean(),
    method: z
      .enum([
        CLI_AGENT_AUTH_METHOD.API_KEY,
        CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN,
        CLI_AGENT_AUTH_METHOD.OAUTH,
        CLI_AGENT_AUTH_METHOD.NONE,
      ])
      .optional(),
    email: z.string().email().optional(),
    expiresAt: z.number().nonnegative().optional(),
  })
  .strict();

export type CliAgentAuthStatus = z.infer<typeof CliAgentAuthStatusSchema>;

export const CliAgentModelSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    provider: z.string().min(1).optional(),
    isDefault: z.boolean().default(false),
    supportsThinking: z.boolean().default(false),
    maxContextTokens: z.number().int().positive().optional(),
  })
  .strict();

export type CliAgentModel = z.infer<typeof CliAgentModelSchema>;

export const CliAgentModelsResponseSchema = z
  .object({
    models: z.array(CliAgentModelSchema),
    defaultModel: z.string().min(1).optional(),
  })
  .strict();

export type CliAgentModelsResponse = z.infer<typeof CliAgentModelsResponseSchema>;

export const CliAgentSessionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    createdAt: z.string().datetime().optional(),
    model: z.string().min(1).optional(),
    messageCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export type CliAgentSession = z.infer<typeof CliAgentSessionSchema>;

export const CliAgentPromptInputSchema = z
  .object({
    message: z.string().min(1),
    sessionId: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    mode: z
      .enum([CLI_AGENT_PROMPT_MODE.AGENT, CLI_AGENT_PROMPT_MODE.PLAN, CLI_AGENT_PROMPT_MODE.ASK])
      .optional(),
    workspacePath: z.string().min(1).optional(),
    force: z.boolean().default(false),
    streaming: z.boolean().default(true),
    additionalFlags: z.record(z.string()).optional(),
  })
  .strict();

export type CliAgentPromptInput = z.infer<typeof CliAgentPromptInputSchema>;

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
  ERROR: "error",
  RESULT: "result",
} as const;

export type StreamEventType = (typeof STREAM_EVENT_TYPE)[keyof typeof STREAM_EVENT_TYPE];

const StreamEventBaseSchema = z
  .object({
    type: z.string().min(1),
    sessionId: z.string().min(1).optional(),
    timestamp: z.number().nonnegative().optional(),
  })
  .strict();

export const SessionInitEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.SESSION_INIT),
  model: z.string().min(1),
  mode: z.string().min(1).optional(),
});

export const TextDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_DELTA),
  text: z.string(),
});

export const TextCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_COMPLETE),
  text: z.string(),
});

export const ToolStartEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_START),
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.record(z.unknown()).default({}),
});

export const ToolCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_COMPLETE),
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.record(z.unknown()).optional(),
  success: z.boolean(),
  result: z.unknown().optional(),
});

export const ToolErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_ERROR),
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: z.record(z.unknown()).optional(),
  message: z.string().min(1),
});

export const ThinkingDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.THINKING_DELTA),
  text: z.string(),
});

export const ThinkingCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.THINKING_COMPLETE),
  text: z.string(),
});

export const PermissionRequestEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.PERMISSION_REQUEST),
  toolName: z.string().min(1),
  toolInput: z.record(z.unknown()).default({}),
  requestId: z.string().min(1),
});

export const ErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.ERROR),
  message: z.string().min(1),
  code: z.string().min(1).optional(),
});

export const ResultEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.RESULT),
  text: z.string(),
  durationMs: z.number().nonnegative().optional(),
  success: z.boolean(),
});

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
  ErrorEventSchema,
  ResultEventSchema,
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export const CliAgentPromptResultSchema = z
  .object({
    text: z.string(),
    sessionId: z.string().min(1),
    durationMs: z.number().nonnegative().optional(),
    toolCallCount: z.number().int().nonnegative().default(0),
    model: z.string().min(1).optional(),
  })
  .strict();

export type CliAgentPromptResult = z.infer<typeof CliAgentPromptResultSchema>;

export const CliAgentCapabilitiesSchema = z
  .object({
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
  })
  .strict();

export type CliAgentCapabilities = z.infer<typeof CliAgentCapabilitiesSchema>;

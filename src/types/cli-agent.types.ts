import { CONNECTION_STATUS } from "@/constants/connection-status";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { z } from "zod";

export const CLI_AGENT_AUTH_METHOD = {
  API_KEY: "api_key",
  BROWSER_LOGIN: "browser_login",
  OAUTH: "oauth",
  NONE: "none",
} as const;

export const CLI_AGENT_MODE = {
  AGENT: "agent",
  PLAN: "plan",
  ASK: "ask",
} as const;

export const CLI_AGENT_SANDBOX_MODE = {
  ENABLED: "enabled",
  DISABLED: "disabled",
} as const;

export const STREAM_EVENT_TYPE = {
  TEXT_DELTA: "text_delta",
  THINKING_DELTA: "thinking_delta",
  TOOL_START: "tool_start",
  TOOL_COMPLETE: "tool_complete",
  PERMISSION_REQUEST: "permission_request",
  STATE: "state",
  RESULT: "result",
  ERROR: "error",
} as const;

export type CliAgentAuthMethod = (typeof CLI_AGENT_AUTH_METHOD)[keyof typeof CLI_AGENT_AUTH_METHOD];
export type CliAgentMode = (typeof CLI_AGENT_MODE)[keyof typeof CLI_AGENT_MODE];
export type CliAgentSandboxMode =
  (typeof CLI_AGENT_SANDBOX_MODE)[keyof typeof CLI_AGENT_SANDBOX_MODE];
export type StreamEventType = (typeof STREAM_EVENT_TYPE)[keyof typeof STREAM_EVENT_TYPE];

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
    expiresAt: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CliAgentAuthStatus = z.infer<typeof CliAgentAuthStatusSchema>;

export const CliAgentModelSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    provider: z.string().min(1).optional(),
    isDefault: z.boolean().default(false),
    isCurrent: z.boolean().optional(),
    supportsThinking: z.boolean().default(false),
    maxContextTokens: z.number().int().positive().optional(),
  })
  .strict();
export type CliAgentModel = z.infer<typeof CliAgentModelSchema>;

export const CliAgentModelsResponseSchema = z
  .object({
    models: z.array(CliAgentModelSchema),
    defaultModel: z.string().min(1).optional(),
    currentModel: z.string().min(1).optional(),
  })
  .strict();
export type CliAgentModelsResponse = z.infer<typeof CliAgentModelsResponseSchema>;

export const CliAgentSessionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    createdAt: z.string().optional(),
    model: z.string().min(1).optional(),
    messageCount: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CliAgentSession = z.infer<typeof CliAgentSessionSchema>;

export const CliAgentPromptInputSchema = z
  .object({
    message: z.string(),
    sessionId: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    mode: z.enum([CLI_AGENT_MODE.AGENT, CLI_AGENT_MODE.PLAN, CLI_AGENT_MODE.ASK]).optional(),
    sandbox: z.enum([CLI_AGENT_SANDBOX_MODE.ENABLED, CLI_AGENT_SANDBOX_MODE.DISABLED]).optional(),
    browser: z.boolean().optional(),
    approveMcps: z.boolean().optional(),
    workspacePath: z.string().min(1).optional(),
    force: z.boolean().default(false),
    streaming: z.boolean().default(true),
  })
  .strict();
export type CliAgentPromptInput = z.infer<typeof CliAgentPromptInputSchema>;

export const CliAgentPromptResultSchema = z
  .object({
    text: z.string(),
    sessionId: z.string().min(1),
    durationMs: z.number().int().nonnegative().optional(),
    toolCallCount: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CliAgentPromptResult = z.infer<typeof CliAgentPromptResultSchema>;

export const CliAgentCapabilitiesSchema = z
  .object({
    streaming: z.boolean().default(false),
    resume: z.boolean().default(false),
    modes: z.boolean().default(false),
    hooks: z.boolean().default(false),
    cloud: z.boolean().default(false),
    modelListing: z.boolean().default(false),
    sessionListing: z.boolean().default(false),
    authCommand: z.boolean().default(false),
    mcpManagement: z.boolean().default(false),
  })
  .strict();
export type CliAgentCapabilities = z.infer<typeof CliAgentCapabilitiesSchema>;

export const CliAgentLoginResultSchema = z
  .object({
    supported: z.boolean().default(true),
    authenticated: z.boolean().optional(),
    requiresBrowser: z.boolean().optional(),
    requiredEnvVar: z.string().min(1).optional(),
    command: z.string().min(1).optional(),
    message: z.string().optional(),
  })
  .strict();
export type CliAgentLoginResult = z.infer<typeof CliAgentLoginResultSchema>;

export const CliAgentLogoutResultSchema = z
  .object({
    supported: z.boolean().default(true),
    loggedOut: z.boolean().optional(),
    command: z.string().min(1).optional(),
    message: z.string().optional(),
  })
  .strict();
export type CliAgentLogoutResult = z.infer<typeof CliAgentLogoutResultSchema>;

export const CliAgentStatusResultSchema = z
  .object({
    supported: z.boolean().default(true),
    authenticated: z.boolean().optional(),
    method: z
      .enum([
        CLI_AGENT_AUTH_METHOD.API_KEY,
        CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN,
        CLI_AGENT_AUTH_METHOD.OAUTH,
        CLI_AGENT_AUTH_METHOD.NONE,
      ])
      .optional(),
    email: z.string().email().optional(),
    version: z.string().optional(),
    model: z.string().optional(),
    details: z.record(z.string()).optional(),
    message: z.string().optional(),
  })
  .strict();
export type CliAgentStatusResult = z.infer<typeof CliAgentStatusResultSchema>;

export const CliAgentAboutResultSchema = z
  .object({
    supported: z.boolean().default(true),
    version: z.string().optional(),
    model: z.string().optional(),
    os: z.string().optional(),
    shell: z.string().optional(),
    userEmail: z.string().email().optional(),
    details: z.record(z.string()).optional(),
    message: z.string().optional(),
  })
  .strict();
export type CliAgentAboutResult = z.infer<typeof CliAgentAboutResultSchema>;

export const CliAgentMcpServerSchema = z
  .object({
    name: z.string().min(1),
    status: z.string().min(1),
    reason: z.string().optional(),
  })
  .strict();
export type CliAgentMcpServer = z.infer<typeof CliAgentMcpServerSchema>;

export const CliAgentMcpListResultSchema = z
  .object({
    supported: z.boolean().default(true),
    servers: z.array(CliAgentMcpServerSchema).default([]),
    message: z.string().optional(),
  })
  .strict();
export type CliAgentMcpListResult = z.infer<typeof CliAgentMcpListResultSchema>;

const StreamEventBaseSchema = z
  .object({
    sessionId: z.string().min(1).optional(),
    timestampMs: z.number().int().nonnegative().optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .strict();

export const StreamTextDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TEXT_DELTA),
  delta: z.string(),
});
export type StreamTextDeltaEvent = z.infer<typeof StreamTextDeltaEventSchema>;

export const StreamThinkingDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.THINKING_DELTA),
  delta: z.string(),
});
export type StreamThinkingDeltaEvent = z.infer<typeof StreamThinkingDeltaEventSchema>;

export const StreamToolStartEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_START),
  toolCallId: z.string().min(1),
  name: z.string().min(1),
  arguments: z.record(z.unknown()).default({}),
});
export type StreamToolStartEvent = z.infer<typeof StreamToolStartEventSchema>;

export const StreamToolCompleteEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.TOOL_COMPLETE),
  toolCallId: z.string().min(1),
  status: z.enum([
    TOOL_CALL_STATUS.PENDING,
    TOOL_CALL_STATUS.RUNNING,
    TOOL_CALL_STATUS.SUCCEEDED,
    TOOL_CALL_STATUS.FAILED,
  ]),
  result: z.unknown().optional(),
  error: z.string().optional(),
});
export type StreamToolCompleteEvent = z.infer<typeof StreamToolCompleteEventSchema>;

export const StreamPermissionRequestEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.PERMISSION_REQUEST),
  requestId: z.string().min(1),
  toolCallId: z.string().min(1).optional(),
  toolName: z.string().min(1).optional(),
  payload: z.record(z.unknown()).optional(),
});
export type StreamPermissionRequestEvent = z.infer<typeof StreamPermissionRequestEventSchema>;

export const StreamStateEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.STATE),
  status: z.enum([
    CONNECTION_STATUS.DISCONNECTED,
    CONNECTION_STATUS.CONNECTING,
    CONNECTION_STATUS.CONNECTED,
    CONNECTION_STATUS.ERROR,
  ]),
  details: z.string().optional(),
});
export type StreamStateEvent = z.infer<typeof StreamStateEventSchema>;

export const StreamResultEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.RESULT),
  text: z.string(),
  durationMs: z.number().int().nonnegative().optional(),
  isError: z.boolean().optional(),
});
export type StreamResultEvent = z.infer<typeof StreamResultEventSchema>;

export const StreamErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal(STREAM_EVENT_TYPE.ERROR),
  message: z.string().min(1),
  code: z.string().optional(),
});
export type StreamErrorEvent = z.infer<typeof StreamErrorEventSchema>;

export const StreamEventSchema = z.discriminatedUnion("type", [
  StreamTextDeltaEventSchema,
  StreamThinkingDeltaEventSchema,
  StreamToolStartEventSchema,
  StreamToolCompleteEventSchema,
  StreamPermissionRequestEventSchema,
  StreamStateEventSchema,
  StreamResultEventSchema,
  StreamErrorEventSchema,
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;

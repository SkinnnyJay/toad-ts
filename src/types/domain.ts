import { z } from "zod";

export const SessionIdSchema = z.string().min(1).brand<"SessionId">();
export type SessionId = z.infer<typeof SessionIdSchema>;

export const AgentIdSchema = z.string().min(1).brand<"AgentId">();
export type AgentId = z.infer<typeof AgentIdSchema>;

export const MessageIdSchema = z.string().min(1).brand<"MessageId">();
export type MessageId = z.infer<typeof MessageIdSchema>;

export const ToolCallIdSchema = z.string().min(1).brand<"ToolCallId">();
export type ToolCallId = z.infer<typeof ToolCallIdSchema>;

export const ConnectionStatusSchema = z.enum(["disconnected", "connecting", "connected", "error"]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

const TextContentBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const CodeContentBlockSchema = z.object({
  type: z.literal("code"),
  text: z.string(),
  language: z.string().optional(),
});

const ThinkingContentBlockSchema = z.object({
  type: z.literal("thinking"),
  text: z.string(),
});

const ToolCallContentBlockSchema = z.object({
  type: z.literal("tool_call"),
  toolCallId: ToolCallIdSchema,
  name: z.string().optional(),
  arguments: z.record(z.unknown()).optional().default({}),
  status: z.enum(["pending", "running", "succeeded", "failed"]),
  result: z.unknown().optional(),
});

const ResourceLinkContentBlockSchema = z.object({
  type: z.literal("resource_link"),
  uri: z.string(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

const ResourceContentBlockSchema = z.object({
  type: z.literal("resource"),
  resource: z.union([
    z.object({
      uri: z.string(),
      text: z.string(),
      mimeType: z.string().optional(),
    }),
    z.object({
      uri: z.string(),
      blob: z.string(),
      mimeType: z.string().optional(),
    }),
  ]),
});

export const ContentBlockSchema = z.discriminatedUnion("type", [
  TextContentBlockSchema,
  CodeContentBlockSchema,
  ThinkingContentBlockSchema,
  ToolCallContentBlockSchema,
  ResourceLinkContentBlockSchema,
  ResourceContentBlockSchema,
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: MessageIdSchema,
  sessionId: SessionIdSchema,
  role: MessageRoleSchema,
  content: z.array(ContentBlockSchema),
  createdAt: z.number().nonnegative(),
  isStreaming: z.boolean().optional().default(false),
});
export type Message = z.infer<typeof MessageSchema>;

export const McpHeaderSchema = z
  .object({
    name: z.string().min(1),
    value: z.string(),
  })
  .strict();
export type McpHeader = z.infer<typeof McpHeaderSchema>;

export const McpEnvVariableSchema = z
  .object({
    name: z.string().min(1),
    value: z.string(),
  })
  .strict();
export type McpEnvVariable = z.infer<typeof McpEnvVariableSchema>;

export const McpServerHttpSchema = z
  .object({
    type: z.literal("http"),
    name: z.string().min(1),
    url: z.string().min(1),
    headers: z.array(McpHeaderSchema).default([]),
  })
  .strict();
export type McpServerHttp = z.infer<typeof McpServerHttpSchema>;

export const McpServerSseSchema = z
  .object({
    type: z.literal("sse"),
    name: z.string().min(1),
    url: z.string().min(1),
    headers: z.array(McpHeaderSchema).default([]),
  })
  .strict();
export type McpServerSse = z.infer<typeof McpServerSseSchema>;

export const McpServerStdioSchema = z
  .object({
    name: z.string().min(1),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.array(McpEnvVariableSchema).default([]),
  })
  .strict();
export type McpServerStdio = z.infer<typeof McpServerStdioSchema>;

export const McpServerSchema = z.union([
  McpServerHttpSchema,
  McpServerSseSchema,
  McpServerStdioSchema,
]);
export type McpServer = z.infer<typeof McpServerSchema>;

export const SessionMetadataSchema = z
  .object({
    mcpServers: z.array(McpServerSchema).default([]),
  })
  .strict();
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

export const SessionSchema = z.object({
  id: SessionIdSchema,
  title: z.string().optional(),
  agentId: AgentIdSchema.optional(),
  messageIds: z.array(MessageIdSchema).default([]),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
  metadata: SessionMetadataSchema.optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const AppStateSchema = z.object({
  connectionStatus: ConnectionStatusSchema,
  currentSessionId: SessionIdSchema.optional(),
  sessions: z.record(SessionIdSchema, SessionSchema).default({}),
  messages: z.record(MessageIdSchema, MessageSchema).default({}),
});
export type AppState = z.infer<typeof AppStateSchema>;

export interface AppendMessageParams {
  sessionId: SessionId;
  message: Message;
}

export interface UpdateMessageParams {
  messageId: MessageId;
  patch: Partial<Omit<Message, "id">>;
}

export interface UpsertSessionParams {
  session: Session;
}

// Multi-Agent Orchestration Types
export const TaskIdSchema = z.string().min(1).brand<"TaskId">();
export type TaskId = z.infer<typeof TaskIdSchema>;

export const SubAgentIdSchema = z.string().min(1).brand<"SubAgentId">();
export type SubAgentId = z.infer<typeof SubAgentIdSchema>;

export const PlanIdSchema = z.string().min(1).brand<"PlanId">();
export type PlanId = z.infer<typeof PlanIdSchema>;

export const TaskStatusSchema = z.enum([
  "pending",
  "assigned",
  "running",
  "completed",
  "failed",
  "blocked",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: TaskIdSchema,
  planId: PlanIdSchema,
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  assignedAgentId: SubAgentIdSchema.optional(),
  dependencies: z.array(TaskIdSchema).default([]),
  result: z.unknown().optional(),
  error: z.string().optional(),
  createdAt: z.number().nonnegative(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const PlanSchema = z.object({
  id: PlanIdSchema,
  sessionId: SessionIdSchema,
  originalPrompt: z.string(),
  tasks: z.array(TaskSchema).default([]),
  status: z.enum(["planning", "executing", "completed", "failed"]),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const SubAgentSchema = z.object({
  id: SubAgentIdSchema,
  planId: PlanIdSchema,
  agentId: AgentIdSchema,
  sessionId: SessionIdSchema,
  currentTaskId: TaskIdSchema.optional(),
  status: z.enum(["idle", "working", "waiting", "completed", "error"]),
  connectionStatus: ConnectionStatusSchema,
  createdAt: z.number().nonnegative(),
  lastActivityAt: z.number().nonnegative(),
});
export type SubAgent = z.infer<typeof SubAgentSchema>;

export const AgentMessageSchema = z.object({
  from: SubAgentIdSchema,
  to: SubAgentIdSchema.optional(), // undefined = broadcast
  type: z.enum(["task_complete", "task_failed", "need_help", "share_result", "coordinate"]),
  payload: z.record(z.unknown()),
  timestamp: z.number().nonnegative(),
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

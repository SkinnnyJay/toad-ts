import { AGENT_STATUS } from "@/constants/agent-status";
import { z } from "zod";

import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MCP_SERVER_TYPE } from "@/constants/mcp-server-types";
import { PLAN_STATUS } from "@/constants/plan-status";
import { SESSION_MODE } from "@/constants/session-modes";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";

export const SessionIdSchema = z.string().min(1).brand<"SessionId">();
export type SessionId = z.infer<typeof SessionIdSchema>;

export const AgentIdSchema = z.string().min(1).brand<"AgentId">();
export type AgentId = z.infer<typeof AgentIdSchema>;

export const MessageIdSchema = z.string().min(1).brand<"MessageId">();
export type MessageId = z.infer<typeof MessageIdSchema>;

export const ToolCallIdSchema = z.string().min(1).brand<"ToolCallId">();
export type ToolCallId = z.infer<typeof ToolCallIdSchema>;

export const ConnectionStatusSchema = z.enum([
  CONNECTION_STATUS.DISCONNECTED,
  CONNECTION_STATUS.CONNECTING,
  CONNECTION_STATUS.CONNECTED,
  CONNECTION_STATUS.ERROR,
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

const TextContentBlockSchema = z.object({
  type: z.literal(CONTENT_BLOCK_TYPE.TEXT),
  text: z.string(),
});

const CodeContentBlockSchema = z.object({
  type: z.literal(CONTENT_BLOCK_TYPE.CODE),
  text: z.string(),
  language: z.string().optional(),
});

const ThinkingContentBlockSchema = z.object({
  type: z.literal(CONTENT_BLOCK_TYPE.THINKING),
  text: z.string(),
});

const ToolCallContentBlockSchema = z.object({
  type: z.literal(CONTENT_BLOCK_TYPE.TOOL_CALL),
  toolCallId: ToolCallIdSchema,
  name: z.string().optional(),
  arguments: z.record(z.unknown()).optional().default({}),
  status: z.enum([
    TOOL_CALL_STATUS.PENDING,
    TOOL_CALL_STATUS.RUNNING,
    TOOL_CALL_STATUS.SUCCEEDED,
    TOOL_CALL_STATUS.FAILED,
  ]),
  result: z.unknown().optional(),
});

const ResourceLinkContentBlockSchema = z.object({
  type: z.literal(CONTENT_BLOCK_TYPE.RESOURCE_LINK),
  uri: z.string(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

const ResourceContentBlockSchema = z.object({
  type: z.literal(CONTENT_BLOCK_TYPE.RESOURCE),
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
    type: z.literal(MCP_SERVER_TYPE.SSE),
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

export const SessionModeSchema = z.enum(["read-only", "auto", "full-access"]);
export type SessionMode = z.infer<typeof SessionModeSchema>;

export const SessionSchema = z.object({
  id: SessionIdSchema,
  title: z.string().optional(),
  agentId: AgentIdSchema.optional(),
  messageIds: z.array(MessageIdSchema).default([]),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
  metadata: SessionMetadataSchema.optional(),
  mode: SessionModeSchema.default(SESSION_MODE.AUTO),
});
export type Session = z.infer<typeof SessionSchema>;

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
  status: z.enum([
    PLAN_STATUS.PLANNING,
    PLAN_STATUS.EXECUTING,
    PLAN_STATUS.COMPLETED,
    PLAN_STATUS.FAILED,
  ]),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const AppStateSchema = z.object({
  connectionStatus: ConnectionStatusSchema,
  currentSessionId: SessionIdSchema.optional(),
  sessions: z.record(SessionIdSchema, SessionSchema).default({}),
  messages: z.record(MessageIdSchema, MessageSchema).default({}),
  plans: z.record(PlanIdSchema, PlanSchema).default({}),
  contextAttachments: z.record(SessionIdSchema, z.array(z.string()).default([])).default({}),
  uiState: z
    .object({
      sidebarTab: z.enum(["files", "plan", "context", "sessions", "agent"]).default("files"),
      accordionCollapsed: z
        .record(z.enum(["files", "plan", "context", "sessions", "agent"]), z.boolean())
        .default({}),
    })
    .default({}),
});
export type AppState = z.infer<typeof AppStateSchema>;

export const SubAgentSchema = z.object({
  id: SubAgentIdSchema,
  planId: PlanIdSchema,
  agentId: AgentIdSchema,
  sessionId: SessionIdSchema,
  currentTaskId: TaskIdSchema.optional(),
  status: z.enum([
    AGENT_STATUS.IDLE,
    AGENT_STATUS.WORKING,
    AGENT_STATUS.WAITING,
    AGENT_STATUS.COMPLETED,
    AGENT_STATUS.ERROR,
  ]),
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

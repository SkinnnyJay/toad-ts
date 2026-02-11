import { CURSOR_CLOUD_AGENT_STATUS } from "@/constants/cursor-cloud-api";
import { z } from "zod";

export const CursorCloudAgentSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1),
    prompt: z.string().optional(),
    model: z.string().optional(),
    repository: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export type CursorCloudAgent = z.infer<typeof CursorCloudAgentSchema>;

const CursorCloudAgentListEnvelopeSchema = z.union([
  z
    .object({
      agents: z.array(CursorCloudAgentSchema),
      next_cursor: z.string().nullable().optional(),
    })
    .passthrough(),
  z
    .object({
      data: z.array(CursorCloudAgentSchema),
      next_cursor: z.string().nullable().optional(),
      cursor: z.string().nullable().optional(),
    })
    .passthrough(),
]);

export const CursorCloudAgentListResponseSchema = CursorCloudAgentListEnvelopeSchema.transform(
  (payload) => {
    const agents = "agents" in payload ? payload.agents : payload.data;
    const nextCursor = payload.next_cursor ?? ("cursor" in payload ? payload.cursor : undefined);
    return {
      agents,
      nextCursor: nextCursor ?? undefined,
    };
  }
);

export type CursorCloudAgentListResponse = z.infer<typeof CursorCloudAgentListResponseSchema>;

export const CursorCloudAgentResponseSchema = z
  .object({
    agent: CursorCloudAgentSchema.optional(),
  })
  .passthrough()
  .transform((payload) => {
    if (payload.agent) {
      return payload.agent;
    }
    return CursorCloudAgentSchema.parse(payload);
  });

export type CursorCloudAgentResponse = z.infer<typeof CursorCloudAgentResponseSchema>;

export const CursorCloudLaunchAgentRequestSchema = z
  .object({
    prompt: z.string().min(1),
    repository: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    mode: z.enum(["ask", "plan", "agent"]).optional(),
    autoCreatePr: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export type CursorCloudLaunchAgentRequest = z.infer<typeof CursorCloudLaunchAgentRequestSchema>;

export const CursorCloudFollowupRequestSchema = z
  .object({
    prompt: z.string().min(1),
  })
  .strict();

export type CursorCloudFollowupRequest = z.infer<typeof CursorCloudFollowupRequestSchema>;

export const CursorCloudIdResponseSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough();

export type CursorCloudIdResponse = z.infer<typeof CursorCloudIdResponseSchema>;

export const CursorCloudConversationMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.string().min(1),
    content: z.string().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

const CursorCloudConversationEnvelopeSchema = z.union([
  z
    .object({
      messages: z.array(CursorCloudConversationMessageSchema),
    })
    .passthrough(),
  z
    .object({
      conversation: z.array(CursorCloudConversationMessageSchema),
    })
    .passthrough(),
]);

export const CursorCloudConversationResponseSchema =
  CursorCloudConversationEnvelopeSchema.transform((payload) => ({
    messages: "messages" in payload ? payload.messages : payload.conversation,
  }));

export type CursorCloudConversationResponse = z.infer<typeof CursorCloudConversationResponseSchema>;

const CursorCloudModelSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    default: z.boolean().optional(),
  })
  .passthrough();

const CursorCloudModelsEnvelopeSchema = z.union([
  z
    .object({
      models: z.array(CursorCloudModelSchema),
    })
    .passthrough(),
  z.array(CursorCloudModelSchema),
]);

export const CursorCloudModelsResponseSchema = CursorCloudModelsEnvelopeSchema.transform(
  (payload) => ({
    models: Array.isArray(payload) ? payload : payload.models,
  })
);

export type CursorCloudModelsResponse = z.infer<typeof CursorCloudModelsResponseSchema>;

const CursorCloudRepositorySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    full_name: z.string().optional(),
    default_branch: z.string().optional(),
    private: z.boolean().optional(),
  })
  .passthrough();

const CursorCloudRepositoriesEnvelopeSchema = z.union([
  z
    .object({
      repositories: z.array(CursorCloudRepositorySchema),
    })
    .passthrough(),
  z.array(CursorCloudRepositorySchema),
]);

export const CursorCloudRepositoriesResponseSchema =
  CursorCloudRepositoriesEnvelopeSchema.transform((payload) => ({
    repositories: Array.isArray(payload) ? payload : payload.repositories,
  }));

export type CursorCloudRepositoriesResponse = z.infer<typeof CursorCloudRepositoriesResponseSchema>;

export const CursorCloudApiKeyInfoResponseSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    plan: z.string().optional(),
    organization: z.string().optional(),
  })
  .passthrough();

export type CursorCloudApiKeyInfoResponse = z.infer<typeof CursorCloudApiKeyInfoResponseSchema>;

export const CursorCloudListAgentsParamsSchema = z
  .object({
    limit: z.number().int().positive().optional(),
    cursor: z.string().min(1).optional(),
  })
  .strict();

export type CursorCloudListAgentsParams = z.infer<typeof CursorCloudListAgentsParamsSchema>;

export const CURSOR_CLOUD_AGENT_TERMINAL_STATUSES = [
  CURSOR_CLOUD_AGENT_STATUS.COMPLETED,
  CURSOR_CLOUD_AGENT_STATUS.FAILED,
  CURSOR_CLOUD_AGENT_STATUS.STOPPED,
  CURSOR_CLOUD_AGENT_STATUS.CANCELED,
] as const;

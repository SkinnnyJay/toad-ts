import { z } from "zod";

export const CursorCloudAgentSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();
export type CursorCloudAgent = z.infer<typeof CursorCloudAgentSchema>;

export const CursorCloudPaginationSchema = z
  .object({
    nextCursor: z.string().optional(),
  })
  .strict();
export type CursorCloudPagination = z.infer<typeof CursorCloudPaginationSchema>;

export const CursorCloudAgentsListSchema = z
  .object({
    items: z.array(CursorCloudAgentSchema),
    nextCursor: z.string().optional(),
  })
  .strict();
export type CursorCloudAgentsList = z.infer<typeof CursorCloudAgentsListSchema>;

export const CursorCloudLaunchRequestSchema = z
  .object({
    prompt: z.string().min(1),
    model: z.string().optional(),
    repo: z.string().optional(),
  })
  .strict();
export type CursorCloudLaunchRequest = z.infer<typeof CursorCloudLaunchRequestSchema>;

export const CursorCloudLaunchResponseSchema = z
  .object({
    agent: CursorCloudAgentSchema,
  })
  .strict();
export type CursorCloudLaunchResponse = z.infer<typeof CursorCloudLaunchResponseSchema>;

export const CursorCloudFollowupRequestSchema = z
  .object({
    prompt: z.string().min(1),
  })
  .strict();
export type CursorCloudFollowupRequest = z.infer<typeof CursorCloudFollowupRequestSchema>;

export const CursorCloudFollowupResponseSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().optional(),
  })
  .passthrough();
export type CursorCloudFollowupResponse = z.infer<typeof CursorCloudFollowupResponseSchema>;

export const CursorCloudStopResponseSchema = z
  .object({
    stopped: z.boolean().optional(),
  })
  .passthrough();
export type CursorCloudStopResponse = z.infer<typeof CursorCloudStopResponseSchema>;

export const CursorCloudDeleteResponseSchema = z
  .object({
    deleted: z.boolean().optional(),
  })
  .passthrough();
export type CursorCloudDeleteResponse = z.infer<typeof CursorCloudDeleteResponseSchema>;

export const CursorCloudConversationSchema = z
  .object({
    id: z.string().min(1),
    messages: z.array(z.unknown()),
  })
  .passthrough();
export type CursorCloudConversation = z.infer<typeof CursorCloudConversationSchema>;

export const CursorCloudModelSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
  })
  .passthrough();
export type CursorCloudModel = z.infer<typeof CursorCloudModelSchema>;

export const CursorCloudModelsSchema = z
  .object({
    models: z.array(CursorCloudModelSchema),
  })
  .strict();
export type CursorCloudModels = z.infer<typeof CursorCloudModelsSchema>;

export const CursorCloudRepoSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
  })
  .passthrough();
export type CursorCloudRepo = z.infer<typeof CursorCloudRepoSchema>;

export const CursorCloudReposSchema = z
  .object({
    repos: z.array(CursorCloudRepoSchema),
  })
  .strict();
export type CursorCloudRepos = z.infer<typeof CursorCloudReposSchema>;

export const CursorCloudKeyInfoSchema = z
  .object({
    valid: z.boolean().optional(),
    email: z.string().optional(),
    plan: z.string().optional(),
  })
  .passthrough();
export type CursorCloudKeyInfo = z.infer<typeof CursorCloudKeyInfoSchema>;

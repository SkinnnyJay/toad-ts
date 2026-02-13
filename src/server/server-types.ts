import { SERVER_EVENT } from "@/constants/server-events";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { z } from "zod";

export const createSessionRequestSchema = z
  .object({
    harnessId: z.string().min(1).optional(),
    agentId: AgentIdSchema.optional(),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
  })
  .strict();

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export const createSessionResponseSchema = z
  .object({
    sessionId: SessionIdSchema,
  })
  .strict();

export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;

export const promptSessionRequestSchema = z
  .object({
    prompt: z.string().min(1),
  })
  .strict();

export type PromptSessionRequest = z.infer<typeof promptSessionRequestSchema>;

export const sessionMessagesRequestSchema = z
  .object({
    sessionId: SessionIdSchema,
  })
  .strict();

export type SessionMessagesRequest = z.infer<typeof sessionMessagesRequestSchema>;

export const serverEventSchema = z.object({
  type: z.enum([
    SERVER_EVENT.SESSION_CREATED,
    SERVER_EVENT.SESSION_UPDATE,
    SERVER_EVENT.SESSION_CLOSED,
    SERVER_EVENT.STATE_UPDATE,
  ]),
  timestamp: z.number(),
  payload: z.record(z.unknown()),
});

export type ServerEventPayload = z.infer<typeof serverEventSchema>;

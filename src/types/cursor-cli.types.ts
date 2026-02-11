import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_STREAM_SUBTYPE, CURSOR_STREAM_TYPE } from "@/constants/cursor-event-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { z } from "zod";

const CursorTextContentSchema = z
  .object({
    // "text" is an ACP protocol content block type.
    type: z.literal(CONTENT_BLOCK_TYPE.TEXT),
    text: z.string(),
  })
  .strict();

const CursorMessageSchema = z
  .object({
    role: z.enum([MESSAGE_ROLE.USER, MESSAGE_ROLE.ASSISTANT]),
    content: z.array(CursorTextContentSchema),
  })
  .strict();

export const CursorSystemEventSchema = z
  .object({
    type: z.literal(CURSOR_STREAM_TYPE.SYSTEM),
    subtype: z.literal(CURSOR_STREAM_SUBTYPE.INIT),
    apiKeySource: z.string().optional(),
    cwd: z.string().min(1),
    session_id: z.string().uuid(),
    model: z.string().min(1),
    permissionMode: z.string().optional(),
  })
  .strict();

export type CursorSystemEvent = z.infer<typeof CursorSystemEventSchema>;

export const CursorUserEventSchema = z
  .object({
    type: z.literal(CURSOR_STREAM_TYPE.USER),
    message: CursorMessageSchema,
    session_id: z.string().uuid(),
  })
  .strict();

export type CursorUserEvent = z.infer<typeof CursorUserEventSchema>;

export const CursorAssistantEventSchema = z
  .object({
    type: z.literal(CURSOR_STREAM_TYPE.ASSISTANT),
    message: CursorMessageSchema,
    session_id: z.string().uuid(),
    timestamp_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

export type CursorAssistantEvent = z.infer<typeof CursorAssistantEventSchema>;

const CursorToolCallSchema = z.record(z.unknown());

export const CursorToolCallStartedEventSchema = z
  .object({
    type: z.literal(CURSOR_STREAM_TYPE.TOOL_CALL),
    subtype: z.literal(CURSOR_STREAM_SUBTYPE.STARTED),
    call_id: z.string().min(1),
    tool_call: CursorToolCallSchema,
    model_call_id: z.string().min(1).optional(),
    session_id: z.string().uuid(),
    timestamp_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

export type CursorToolCallStartedEvent = z.infer<typeof CursorToolCallStartedEventSchema>;

export const CursorToolCallCompletedEventSchema = z
  .object({
    type: z.literal(CURSOR_STREAM_TYPE.TOOL_CALL),
    subtype: z.literal(CURSOR_STREAM_SUBTYPE.COMPLETED),
    call_id: z.string().min(1),
    tool_call: CursorToolCallSchema,
    model_call_id: z.string().min(1).optional(),
    session_id: z.string().uuid(),
    timestamp_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

export type CursorToolCallCompletedEvent = z.infer<typeof CursorToolCallCompletedEventSchema>;

export const CursorResultEventSchema = z
  .object({
    type: z.literal(CURSOR_STREAM_TYPE.RESULT),
    subtype: z.literal(CURSOR_STREAM_SUBTYPE.SUCCESS),
    duration_ms: z.number().int().nonnegative(),
    duration_api_ms: z.number().int().nonnegative().optional(),
    is_error: z.boolean(),
    result: z.string(),
    session_id: z.string().uuid(),
    request_id: z.string().uuid().optional(),
  })
  .strict();

export type CursorResultEvent = z.infer<typeof CursorResultEventSchema>;

export const CursorStreamEventSchema = z.union([
  CursorSystemEventSchema,
  CursorUserEventSchema,
  CursorAssistantEventSchema,
  CursorToolCallStartedEventSchema,
  CursorToolCallCompletedEventSchema,
  CursorResultEventSchema,
]);

export type CursorStreamEvent = z.infer<typeof CursorStreamEventSchema>;

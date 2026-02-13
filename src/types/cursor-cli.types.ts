import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_EVENT_SUBTYPE, CURSOR_EVENT_TYPE } from "@/constants/cursor-event-types";
import { z } from "zod";

const cursorTextContentBlockSchema = z
  .object({
    // External Cursor protocol content block type.
    type: z.literal(CONTENT_BLOCK_TYPE.TEXT),
    text: z.string(),
  })
  .passthrough();

const cursorThinkingContentBlockSchema = z
  .object({
    // External Cursor protocol content block type.
    type: z.literal(CONTENT_BLOCK_TYPE.THINKING),
    text: z.string(),
  })
  .passthrough();

const cursorContentBlockSchema = z.union([
  cursorTextContentBlockSchema,
  cursorThinkingContentBlockSchema,
]);

const cursorMessageSchema = z
  .object({
    role: z.string().min(1),
    content: z.array(cursorContentBlockSchema),
  })
  .passthrough();

export const cursorSystemEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.SYSTEM),
    subtype: z.literal(CURSOR_EVENT_SUBTYPE.INIT),
    apiKeySource: z.string().optional(),
    cwd: z.string(),
    session_id: z.string().min(1),
    model: z.string().min(1),
    permissionMode: z.string().optional(),
  })
  .passthrough();
export type CursorSystemEvent = z.infer<typeof cursorSystemEvent>;

export const cursorUserEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.USER),
    message: cursorMessageSchema,
    session_id: z.string().min(1),
  })
  .passthrough();
export type CursorUserEvent = z.infer<typeof cursorUserEvent>;

export const cursorAssistantEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.ASSISTANT),
    message: cursorMessageSchema,
    session_id: z.string().min(1),
    timestamp_ms: z.number().int().nonnegative().optional(),
  })
  .passthrough();
export type CursorAssistantEvent = z.infer<typeof cursorAssistantEvent>;

const cursorToolCallPayloadSchema = z.record(z.unknown());

export const cursorToolCallStartedEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.TOOL_CALL),
    subtype: z.literal(CURSOR_EVENT_SUBTYPE.STARTED),
    call_id: z.string().min(1),
    tool_call: cursorToolCallPayloadSchema,
    model_call_id: z.string().optional(),
    session_id: z.string().min(1),
    timestamp_ms: z.number().int().nonnegative().optional(),
  })
  .passthrough();
export type CursorToolCallStartedEvent = z.infer<typeof cursorToolCallStartedEvent>;

export const cursorToolCallCompletedEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.TOOL_CALL),
    subtype: z.literal(CURSOR_EVENT_SUBTYPE.COMPLETED),
    call_id: z.string().min(1),
    tool_call: cursorToolCallPayloadSchema,
    model_call_id: z.string().optional(),
    session_id: z.string().min(1),
    timestamp_ms: z.number().int().nonnegative().optional(),
  })
  .passthrough();
export type CursorToolCallCompletedEvent = z.infer<typeof cursorToolCallCompletedEvent>;

export const cursorResultSuccessEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.RESULT),
    subtype: z.literal(CURSOR_EVENT_SUBTYPE.SUCCESS),
    duration_ms: z.number().int().nonnegative(),
    duration_api_ms: z.number().int().nonnegative().optional(),
    is_error: z.boolean().optional(),
    result: z.string(),
    session_id: z.string().min(1),
    request_id: z.string().optional(),
  })
  .passthrough();
export type CursorResultSuccessEvent = z.infer<typeof cursorResultSuccessEvent>;

export const cursorResultErrorEvent = z
  .object({
    type: z.literal(CURSOR_EVENT_TYPE.RESULT),
    subtype: z.literal(CURSOR_EVENT_SUBTYPE.ERROR),
    duration_ms: z.number().int().nonnegative().optional(),
    duration_api_ms: z.number().int().nonnegative().optional(),
    is_error: z.boolean().optional(),
    result: z.string().optional(),
    error: z.string().optional(),
    session_id: z.string().min(1),
    request_id: z.string().optional(),
  })
  .passthrough();
export type CursorResultErrorEvent = z.infer<typeof cursorResultErrorEvent>;

export const cursorResultEvent = z.union([cursorResultSuccessEvent, cursorResultErrorEvent]);
export type CursorResultEvent = z.infer<typeof cursorResultEvent>;

export const cursorStreamEvent = z.union([
  cursorSystemEvent,
  cursorUserEvent,
  cursorAssistantEvent,
  cursorToolCallStartedEvent,
  cursorToolCallCompletedEvent,
  cursorResultEvent,
]);
export type CursorStreamEvent = z.infer<typeof cursorStreamEvent>;

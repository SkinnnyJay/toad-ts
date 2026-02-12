/**
 * Cursor CLI NDJSON stream event Zod schemas.
 *
 * These validate the raw JSON objects emitted by
 * `cursor-agent -p --output-format stream-json --stream-partial-output`.
 *
 * @see PLAN2.md — "NDJSON Stream Protocol (Channel 1)"
 * @see __tests__/fixtures/cursor/ndjson/ for real captured output
 */

import { z } from "zod";
import {
  CURSOR_EVENT_SUBTYPE,
  CURSOR_EVENT_TYPE,
} from "@/constants/cursor-event-types";

// ── Content Block (shared by user/assistant messages) ────────

const CursorTextContentBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const CursorContentBlockSchema = z.discriminatedUnion("type", [
  CursorTextContentBlockSchema,
]);

const CursorMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.array(CursorContentBlockSchema),
});

// ── system.init ──────────────────────────────────────────────

export const CursorSystemEventSchema = z.object({
  type: z.literal(CURSOR_EVENT_TYPE.SYSTEM),
  subtype: z.literal(CURSOR_EVENT_SUBTYPE.INIT),
  apiKeySource: z.string(),
  cwd: z.string(),
  session_id: z.string(),
  model: z.string(),
  permissionMode: z.string(),
});
export type CursorSystemEvent = z.infer<typeof CursorSystemEventSchema>;

// ── user ─────────────────────────────────────────────────────

export const CursorUserEventSchema = z.object({
  type: z.literal(CURSOR_EVENT_TYPE.USER),
  message: CursorMessageSchema,
  session_id: z.string(),
});
export type CursorUserEvent = z.infer<typeof CursorUserEventSchema>;

// ── assistant ────────────────────────────────────────────────
// Emitted as streaming deltas (with timestamp_ms) and as a final
// complete message (without timestamp_ms).

export const CursorAssistantEventSchema = z.object({
  type: z.literal(CURSOR_EVENT_TYPE.ASSISTANT),
  message: CursorMessageSchema,
  session_id: z.string(),
  /** Present on streaming deltas; absent on the final complete message */
  timestamp_ms: z.number().optional(),
});
export type CursorAssistantEvent = z.infer<typeof CursorAssistantEventSchema>;

// ── tool_call ────────────────────────────────────────────────

/**
 * Tool call payloads use a dynamic key for the tool type.
 * Examples: readToolCall, writeToolCall, editToolCall, shellToolCall, etc.
 * We validate the outer structure and use passthrough for the tool-specific payload.
 */

export const CursorToolCallStartedEventSchema = z.object({
  type: z.literal(CURSOR_EVENT_TYPE.TOOL_CALL),
  subtype: z.literal(CURSOR_EVENT_SUBTYPE.STARTED),
  call_id: z.string(),
  tool_call: z.record(z.unknown()),
  model_call_id: z.string().optional(),
  session_id: z.string(),
  timestamp_ms: z.number().optional(),
});
export type CursorToolCallStartedEvent = z.infer<typeof CursorToolCallStartedEventSchema>;

export const CursorToolCallCompletedEventSchema = z.object({
  type: z.literal(CURSOR_EVENT_TYPE.TOOL_CALL),
  subtype: z.literal(CURSOR_EVENT_SUBTYPE.COMPLETED),
  call_id: z.string(),
  tool_call: z.record(z.unknown()),
  model_call_id: z.string().optional(),
  session_id: z.string(),
  timestamp_ms: z.number().optional(),
});
export type CursorToolCallCompletedEvent = z.infer<typeof CursorToolCallCompletedEventSchema>;

// ── result ───────────────────────────────────────────────────

export const CursorResultEventSchema = z.object({
  type: z.literal(CURSOR_EVENT_TYPE.RESULT),
  subtype: z.literal(CURSOR_EVENT_SUBTYPE.SUCCESS),
  duration_ms: z.number(),
  duration_api_ms: z.number().optional(),
  is_error: z.boolean(),
  result: z.string(),
  session_id: z.string(),
  request_id: z.string().optional(),
});
export type CursorResultEvent = z.infer<typeof CursorResultEventSchema>;

// ── Discriminated union ──────────────────────────────────────

/**
 * All possible raw Cursor NDJSON event types.
 *
 * We use a manual union rather than z.discriminatedUnion because tool_call
 * events share the same `type` but differ on `subtype`, which requires
 * two-level discrimination.
 */
export const CursorStreamEventSchema = z.union([
  CursorSystemEventSchema,
  CursorUserEventSchema,
  CursorAssistantEventSchema,
  CursorToolCallStartedEventSchema,
  CursorToolCallCompletedEventSchema,
  CursorResultEventSchema,
]);
export type CursorStreamEvent = z.infer<typeof CursorStreamEventSchema>;

// ── Tool call payload helpers ────────────────────────────────

/**
 * Extract the tool type key from a tool_call payload.
 * Returns the first key that ends with "ToolCall" or "function", or undefined.
 */
export function extractToolTypeKey(
  toolCall: Record<string, unknown>,
): string | undefined {
  return Object.keys(toolCall).find(
    (key) => key.endsWith("ToolCall") || key === "function",
  );
}

/**
 * Extract the tool name from a tool type key.
 * "readToolCall" → "read_file"
 * "writeToolCall" → "write_file"
 * "editToolCall" → "edit_file"
 * "shellToolCall" → "shell"
 * "grepToolCall" → "grep"
 * "lsToolCall" → "ls"
 * "globToolCall" → "glob"
 * "deleteToolCall" → "delete_file"
 * "todoToolCall" → "todo"
 * "function" → uses function.name
 */
export function normalizeToolName(
  toolTypeKey: string,
  toolCall: Record<string, unknown>,
): string {
  const TOOL_NAME_MAP: Record<string, string> = {
    readToolCall: "read_file",
    writeToolCall: "write_file",
    editToolCall: "edit_file",
    shellToolCall: "shell",
    grepToolCall: "grep",
    lsToolCall: "ls",
    globToolCall: "glob",
    deleteToolCall: "delete_file",
    todoToolCall: "todo",
  };

  if (toolTypeKey === "function") {
    const fn = toolCall["function"];
    if (fn && typeof fn === "object" && "name" in fn) {
      return String((fn as Record<string, unknown>)["name"]);
    }
    return "unknown_function";
  }

  return TOOL_NAME_MAP[toolTypeKey] ?? toolTypeKey;
}

/**
 * Extract tool input args from a tool_call payload.
 */
export function extractToolInput(
  toolTypeKey: string,
  toolCall: Record<string, unknown>,
): Record<string, unknown> {
  const payload = toolCall[toolTypeKey];
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const typed = payload as Record<string, unknown>;
  if ("args" in typed && typeof typed["args"] === "object" && typed["args"] !== null) {
    return typed["args"] as Record<string, unknown>;
  }
  if (toolTypeKey === "function" && "arguments" in typed) {
    const rawArgs = typed["arguments"];
    if (typeof rawArgs === "string") {
      try {
        return JSON.parse(rawArgs) as Record<string, unknown>;
      } catch {
        return { raw: rawArgs };
      }
    }
    if (typeof rawArgs === "object" && rawArgs !== null) {
      return rawArgs as Record<string, unknown>;
    }
  }
  return {};
}

/**
 * Extract tool result from a completed tool_call payload.
 */
export function extractToolResult(
  toolTypeKey: string,
  toolCall: Record<string, unknown>,
): { success: boolean; result: Record<string, unknown> } {
  const payload = toolCall[toolTypeKey];
  if (!payload || typeof payload !== "object") {
    return { success: false, result: {} };
  }
  const typed = payload as Record<string, unknown>;
  if ("result" in typed && typeof typed["result"] === "object" && typed["result"] !== null) {
    const resultObj = typed["result"] as Record<string, unknown>;
    if ("success" in resultObj) {
      return {
        success: true,
        result: (resultObj["success"] as Record<string, unknown>) ?? {},
      };
    }
    if ("rejected" in resultObj || "error" in resultObj) {
      return { success: false, result: resultObj };
    }
    return { success: true, result: resultObj };
  }
  return { success: true, result: {} };
}

// ── Model parsing helpers ────────────────────────────────────

/**
 * Parse `cursor-agent models` output into structured data.
 * Format: `<model-id> - <display-name>  (<tag>)`
 * Where tag is `(default)`, `(current)`, or `(current, default)`.
 */
export function parseCursorModelsOutput(stdout: string): {
  models: Array<{
    id: string;
    name: string;
    isDefault: boolean;
    isCurrent: boolean;
  }>;
  defaultModel: string | undefined;
  currentModel: string | undefined;
} {
  const lines = stdout.split("\n");
  const models: Array<{
    id: string;
    name: string;
    isDefault: boolean;
    isCurrent: boolean;
  }> = [];
  let defaultModel: string | undefined;
  let currentModel: string | undefined;

  const modelLineRegex = /^(\S+)\s+-\s+(.+?)(?:\s+\(([^)]+)\))?$/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = modelLineRegex.exec(trimmed);
    if (match) {
      const id = match[1] ?? "";
      const name = match[2]?.trim() ?? "";
      const tag = match[3] ?? "";
      const isDefault = tag.includes("default");
      const isCurrent = tag.includes("current");

      models.push({ id, name, isDefault, isCurrent });
      if (isDefault) defaultModel = id;
      if (isCurrent) currentModel = id;
    }
  }

  return { models, defaultModel, currentModel };
}

/**
 * Parse `cursor-agent status` output.
 * Format: " ✓ Logged in as email@example.com"
 */
export function parseCursorStatusOutput(stdout: string): {
  authenticated: boolean;
  email: string | undefined;
} {
  const loggedInRegex = /Logged in as\s+(\S+)/;
  const match = loggedInRegex.exec(stdout);
  if (match) {
    return { authenticated: true, email: match[1] };
  }
  return { authenticated: false, email: undefined };
}

/**
 * Parse `cursor-agent about` output.
 * Key-value format: "CLI Version         2026.01.28-fd13201"
 */
export function parseCursorAboutOutput(stdout: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = stdout.split("\n");
  const kvRegex = /^(.+?)\s{2,}(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = kvRegex.exec(trimmed);
    if (match) {
      const key = match[1]?.trim() ?? "";
      const value = match[2]?.trim() ?? "";
      if (key && value) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Parse `cursor-agent mcp list` output.
 * Format: "github: not loaded (needs approval)"
 */
export function parseCursorMcpListOutput(stdout: string): Array<{
  name: string;
  status: string;
  reason: string | undefined;
}> {
  const results: Array<{
    name: string;
    status: string;
    reason: string | undefined;
  }> = [];

  const lines = stdout.split("\n");
  const mcpLineRegex = /^(\S+):\s+(.+?)(?:\s+\(([^)]+)\))?$/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = mcpLineRegex.exec(trimmed);
    if (match) {
      results.push({
        name: match[1] ?? "",
        status: match[2]?.trim() ?? "",
        reason: match[3]?.trim(),
      });
    }
  }

  return results;
}

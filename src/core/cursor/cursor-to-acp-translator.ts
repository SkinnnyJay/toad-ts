import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { CURSOR_EVENT_SUBTYPE, CURSOR_EVENT_TYPE } from "@/constants/cursor-event-types";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import type { CursorStreamEvent } from "@/types/cursor-cli.types";
import { createClassLogger } from "@/utils/logging/logger.utils";
import type { SessionNotification, ToolCallStatus } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

const TOOL_CALL_KEY_SUFFIX = "ToolCall";
const TOOL_NAME_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;

export interface CursorTranslatorResult {
  sessionId: string;
  text: string;
  durationMs?: number;
  isError: boolean;
}

export interface CursorTranslatorInitialized {
  sessionId: string;
  model: string;
  cwd: string;
  permissionMode?: string;
}

export interface CursorToolResultTruncated {
  callId: string;
  originalBytes: number;
  maxBytes: number;
}

export interface CursorToAcpTranslatorEvents {
  sessionUpdate: (update: SessionNotification) => void;
  result: (result: CursorTranslatorResult) => void;
  initialized: (payload: CursorTranslatorInitialized) => void;
  toolResultTruncated: (payload: CursorToolResultTruncated) => void;
  error: (error: Error) => void;
}

export interface CursorToAcpTranslatorOptions {
  maxToolResultBytes?: number;
}

const toUtf8Bytes = (value: string): number => Buffer.byteLength(value, "utf8");

const truncateToBytes = (value: string, maxBytes: number): string => {
  if (maxBytes <= 0) {
    return "";
  }
  return Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8");
};

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    record[key] = entryValue;
  }
  return record;
};

const getToolCallEntry = (
  toolCallPayload: Record<string, unknown>
): { toolCallName: string; payload: Record<string, unknown> } | null => {
  const entries = Object.entries(toolCallPayload);
  const [first] = entries;
  if (!first) {
    return null;
  }
  const [toolCallName, payload] = first;
  const payloadRecord = parseRecord(payload);
  if (!payloadRecord) {
    return null;
  }
  return { toolCallName, payload: payloadRecord };
};

const getToolName = (toolCallName: string): string => {
  if (!toolCallName.endsWith(TOOL_CALL_KEY_SUFFIX)) {
    return toolCallName;
  }
  const withoutSuffix = toolCallName.slice(0, toolCallName.length - TOOL_CALL_KEY_SUFFIX.length);
  return withoutSuffix.replace(TOOL_NAME_CASE_BOUNDARY, "$1_$2").toLowerCase();
};

const getToolCallStatusFromCompletedPayload = (
  payload: Record<string, unknown>
): ToolCallStatus => {
  // ACP ToolCallStatus values from external ACP protocol.
  if ("result" in payload) {
    const result = parseRecord(payload.result);
    if (result && ("error" in result || "rejected" in result || "failure" in result)) {
      return "failed";
    }
  }
  return "completed";
};

export class CursorToAcpTranslator extends EventEmitter<CursorToAcpTranslatorEvents> {
  private readonly logger = createClassLogger("CursorToAcpTranslator");
  private readonly maxToolResultBytes: number;

  public constructor(options: CursorToAcpTranslatorOptions = {}) {
    super();
    this.maxToolResultBytes =
      options.maxToolResultBytes ?? CURSOR_LIMIT.MAX_ACCUMULATED_OUTPUT_BYTES;
  }

  public handleEvent(event: CursorStreamEvent): void {
    try {
      switch (event.type) {
        case CURSOR_EVENT_TYPE.SYSTEM: {
          if (event.subtype === CURSOR_EVENT_SUBTYPE.INIT) {
            this.emit("initialized", {
              sessionId: event.session_id,
              model: event.model,
              cwd: event.cwd,
              permissionMode: event.permissionMode,
            });
          }
          break;
        }
        case CURSOR_EVENT_TYPE.USER: {
          this.emitMessageChunks(
            event.session_id,
            event.message.content,
            SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK
          );
          break;
        }
        case CURSOR_EVENT_TYPE.ASSISTANT: {
          this.emitMessageChunks(
            event.session_id,
            event.message.content,
            SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK
          );
          break;
        }
        case CURSOR_EVENT_TYPE.TOOL_CALL: {
          if (event.subtype === CURSOR_EVENT_SUBTYPE.STARTED) {
            this.emitToolCallStart(event);
          } else if (event.subtype === CURSOR_EVENT_SUBTYPE.COMPLETED) {
            this.emitToolCallCompletion(event);
          }
          break;
        }
        case CURSOR_EVENT_TYPE.RESULT: {
          this.emit("result", {
            sessionId: event.session_id,
            text: event.result ?? "",
            durationMs: event.duration_ms,
            isError: event.subtype === CURSOR_EVENT_SUBTYPE.ERROR || event.is_error === true,
          });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.emit(
        "error",
        error instanceof Error ? error : new Error(`Cursor translation failed: ${String(error)}`)
      );
    }
  }

  public handleProcessError(error: unknown): void {
    const resolved = error instanceof Error ? error : new Error(String(error));
    this.emit("error", resolved);
  }

  private emitMessageChunks(
    sessionId: string,
    contentBlocks: Array<{ type: string; text: string }>,
    sessionUpdateType:
      | typeof SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK
      | typeof SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK
  ): void {
    for (const block of contentBlocks) {
      if (block.type !== CONTENT_BLOCK_TYPE.TEXT) {
        continue;
      }
      const update: SessionNotification = {
        sessionId,
        update: {
          sessionUpdate: sessionUpdateType,
          content: {
            // ACP external content block type.
            type: CONTENT_BLOCK_TYPE.TEXT,
            text: block.text,
          },
        },
      };
      this.emit("sessionUpdate", update);
    }
  }

  private emitToolCallStart(
    event: Extract<CursorStreamEvent, { type: "tool_call"; subtype: "started" }>
  ): void {
    const toolCallRecord = parseRecord(event.tool_call);
    if (!toolCallRecord) {
      return;
    }
    const toolEntry = getToolCallEntry(toolCallRecord);
    if (!toolEntry) {
      return;
    }

    const update: SessionNotification = {
      sessionId: event.session_id,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
        toolCallId: event.call_id,
        title: getToolName(toolEntry.toolCallName),
        rawInput: parseRecord(toolEntry.payload.args) ?? {},
        // ACP external tool call status.
        status: "in_progress",
      },
    };
    this.emit("sessionUpdate", update);
  }

  private emitToolCallCompletion(
    event: Extract<CursorStreamEvent, { type: "tool_call"; subtype: "completed" }>
  ): void {
    const toolCallRecord = parseRecord(event.tool_call);
    if (!toolCallRecord) {
      return;
    }
    const toolEntry = getToolCallEntry(toolCallRecord);
    if (!toolEntry) {
      return;
    }

    const rawResult = toolEntry.payload.result;
    const truncatedResult = this.truncateToolResult(event.call_id, rawResult);
    const status = getToolCallStatusFromCompletedPayload(toolEntry.payload);

    const update: SessionNotification = {
      sessionId: event.session_id,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
        toolCallId: event.call_id,
        rawOutput: truncatedResult,
        status,
      },
    };
    this.emit("sessionUpdate", update);
  }

  private truncateToolResult(callId: string, result: unknown): unknown {
    if (result === undefined || result === null) {
      return result;
    }

    const serialized =
      typeof result === "string"
        ? result
        : (() => {
            try {
              return JSON.stringify(result);
            } catch (_error) {
              return String(result);
            }
          })();

    const byteLength = toUtf8Bytes(serialized);
    if (byteLength <= this.maxToolResultBytes) {
      return result;
    }

    this.logger.warn("Truncated Cursor tool result during translation", {
      callId,
      originalBytes: byteLength,
      maxBytes: this.maxToolResultBytes,
    });
    this.emit("toolResultTruncated", {
      callId,
      originalBytes: byteLength,
      maxBytes: this.maxToolResultBytes,
    });

    return {
      truncated: true,
      originalBytes: byteLength,
      maxBytes: this.maxToolResultBytes,
      preview: truncateToBytes(serialized, this.maxToolResultBytes),
    };
  }
}

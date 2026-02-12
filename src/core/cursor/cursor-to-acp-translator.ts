/**
 * Cursor-to-ACP protocol translator.
 *
 * Bridges Cursor CLI NDJSON stream events to the AgentPort event interface
 * (SessionNotification, ConnectionStatus, permissionRequest, error).
 *
 * This allows the existing TOADSTOOL TUI (SessionStream, store, UI) to consume
 * Cursor CLI output as if it were an ACP agent.
 *
 * @see PLAN2.md — "Milestone 4: Protocol Translator (Channel 1 → AgentPort)"
 */

import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import type { AgentPortEvents } from "@/core/agent-port";
import type { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import type { StreamEvent } from "@/types/cli-agent.types";
import { STREAM_EVENT_TYPE } from "@/types/cli-agent.types";
import type {
  CursorAssistantEvent,
  CursorResultEvent,
  CursorSystemEvent,
  CursorToolCallCompletedEvent,
  CursorToolCallStartedEvent,
} from "@/types/cursor-cli.types";
import {
  extractToolInput,
  extractToolResult,
  extractToolTypeKey,
  normalizeToolName,
} from "@/types/cursor-cli.types";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";

const logger = createClassLogger("CursorToAcpTranslator");

/** Default max tool result size in bytes before truncation (50KB) */
const DEFAULT_MAX_TOOL_RESULT_SIZE = 50 * 1024;

// ── Configuration ────────────────────────────────────────────

export interface CursorToAcpTranslatorOptions {
  /** Maximum tool result size in bytes before truncation (default 50KB) */
  maxToolResultSize?: number;
}

// ── Events ───────────────────────────────────────────────────

export interface CursorToAcpTranslatorEvents {
  /** AgentPort-compatible session update events */
  sessionUpdate: AgentPortEvents["sessionUpdate"];
  /** Connection state changes */
  state: AgentPortEvents["state"];
  /** Error events */
  error: AgentPortEvents["error"];
  /** Generic stream events (protocol-agnostic) */
  streamEvent: (event: StreamEvent) => void;
  /** Result event — terminal signal for prompt resolution */
  promptResult: (result: {
    text: string;
    sessionId: string;
    durationMs: number;
    isError: boolean;
  }) => void;
}

// ── Translator ───────────────────────────────────────────────

export class CursorToAcpTranslator extends EventEmitter<CursorToAcpTranslatorEvents> {
  private readonly maxToolResultSize: number;
  private currentSessionId: string | null = null;
  private toolCallCount = 0;

  constructor(options?: CursorToAcpTranslatorOptions) {
    super();
    this.maxToolResultSize = options?.maxToolResultSize ?? DEFAULT_MAX_TOOL_RESULT_SIZE;
  }

  /**
   * Attach to a CursorStreamParser and translate all events.
   * Returns a cleanup function.
   */
  attach(parser: CursorStreamParser): () => void {
    const onSystemInit = (event: CursorSystemEvent) => this.handleSystemInit(event);
    const onAssistantDelta = (event: CursorAssistantEvent) => this.handleAssistantDelta(event);
    const onAssistantComplete = (event: CursorAssistantEvent) =>
      this.handleAssistantComplete(event);
    const onToolCallStarted = (event: CursorToolCallStartedEvent) =>
      this.handleToolCallStarted(event);
    const onToolCallCompleted = (event: CursorToolCallCompletedEvent) =>
      this.handleToolCallCompleted(event);
    const onResult = (event: CursorResultEvent) => this.handleResult(event);
    const onParseError = (error: Error) => this.handleParseError(error);

    parser.on("systemInit", onSystemInit);
    parser.on("assistantDelta", onAssistantDelta);
    parser.on("assistantComplete", onAssistantComplete);
    parser.on("toolCallStarted", onToolCallStarted);
    parser.on("toolCallCompleted", onToolCallCompleted);
    parser.on("result", onResult);
    parser.on("parseError", onParseError);

    return () => {
      parser.off("systemInit", onSystemInit);
      parser.off("assistantDelta", onAssistantDelta);
      parser.off("assistantComplete", onAssistantComplete);
      parser.off("toolCallStarted", onToolCallStarted);
      parser.off("toolCallCompleted", onToolCallCompleted);
      parser.off("result", onResult);
      parser.off("parseError", onParseError);
    };
  }

  /** Get the current session ID (from system.init) */
  get sessionId(): string | null {
    return this.currentSessionId;
  }

  /** Get the number of tool calls processed */
  get totalToolCalls(): number {
    return this.toolCallCount;
  }

  /** Reset the translator state */
  reset(): void {
    this.currentSessionId = null;
    this.toolCallCount = 0;
  }

  // ── Event handlers ─────────────────────────────────────────

  private handleSystemInit(event: CursorSystemEvent): void {
    this.currentSessionId = event.session_id;

    logger.debug("System init received", {
      sessionId: event.session_id,
      model: event.model,
    });

    this.emit("state", CONNECTION_STATUS.CONNECTED);

    // Emit generic stream event
    this.emit("streamEvent", {
      type: STREAM_EVENT_TYPE.SESSION_INIT,
      sessionId: event.session_id,
      model: event.model,
      timestamp: Date.now(),
    });
  }

  private handleAssistantDelta(event: CursorAssistantEvent): void {
    const text = this.extractText(event);
    if (!text) return;

    const sessionId = event.session_id;

    // Emit as ACP SessionNotification (agent_message_chunk)
    this.emit("sessionUpdate", {
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
        contentBlock: {
          blockType: CONTENT_BLOCK_TYPE.TEXT,
          text,
        },
        metadata: {},
      },
    } as never);

    // Emit generic stream event
    this.emit("streamEvent", {
      type: STREAM_EVENT_TYPE.TEXT_DELTA,
      text,
      sessionId,
      timestamp: event.timestamp_ms,
    });
  }

  private handleAssistantComplete(event: CursorAssistantEvent): void {
    const text = this.extractText(event);
    if (!text) return;

    const sessionId = event.session_id;

    // Emit the final complete message with isFinal metadata
    this.emit("sessionUpdate", {
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
        contentBlock: {
          blockType: CONTENT_BLOCK_TYPE.TEXT,
          text,
        },
        metadata: { isFinal: true },
      },
    } as never);

    // Emit generic stream event
    this.emit("streamEvent", {
      type: STREAM_EVENT_TYPE.TEXT_COMPLETE,
      text,
      sessionId,
    });
  }

  private handleToolCallStarted(event: CursorToolCallStartedEvent): void {
    this.toolCallCount++;
    const toolTypeKey = extractToolTypeKey(event.tool_call);
    const toolName = toolTypeKey ? normalizeToolName(toolTypeKey, event.tool_call) : "unknown";
    const toolInput = toolTypeKey ? extractToolInput(toolTypeKey, event.tool_call) : {};

    const sessionId = event.session_id;

    // Emit as ACP tool_call notification
    this.emit("sessionUpdate", {
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL,
        toolCall: {
          callId: event.call_id,
          toolName,
          input: toolInput,
          status: "in_progress",
        },
        metadata: {},
      },
    } as never);

    // Emit generic stream event
    this.emit("streamEvent", {
      type: STREAM_EVENT_TYPE.TOOL_START,
      toolCallId: event.call_id,
      toolName,
      toolInput,
      sessionId,
      timestamp: event.timestamp_ms,
    });
  }

  private handleToolCallCompleted(event: CursorToolCallCompletedEvent): void {
    const toolTypeKey = extractToolTypeKey(event.tool_call);
    const toolName = toolTypeKey ? normalizeToolName(toolTypeKey, event.tool_call) : "unknown";
    const { success, result: toolResult } = toolTypeKey
      ? extractToolResult(toolTypeKey, event.tool_call)
      : { success: false, result: {} };

    // Truncate large tool results
    const truncatedResult = this.truncateResult(toolResult);

    const sessionId = event.session_id;

    // Emit as ACP tool_call_update notification
    this.emit("sessionUpdate", {
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE,
        toolCallUpdate: {
          callId: event.call_id,
          toolName,
          output: truncatedResult,
          status: success ? "completed" : "failed",
        },
        metadata: {},
      },
    } as never);

    // Emit generic stream event
    this.emit("streamEvent", {
      type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
      toolCallId: event.call_id,
      toolName,
      success,
      result: truncatedResult,
      sessionId,
      timestamp: event.timestamp_ms,
    });
  }

  private handleResult(event: CursorResultEvent): void {
    // Emit prompt result for resolution
    this.emit("promptResult", {
      text: event.result,
      sessionId: event.session_id,
      durationMs: event.duration_ms,
      isError: event.is_error,
    });

    // Emit generic stream event
    this.emit("streamEvent", {
      type: STREAM_EVENT_TYPE.RESULT,
      text: event.result,
      success: !event.is_error,
      sessionId: event.session_id,
      durationMs: event.duration_ms,
    });
  }

  private handleParseError(error: Error): void {
    logger.warn("Stream parse error", { message: error.message });
    this.emit("error", error);
  }

  // ── Helpers ────────────────────────────────────────────────

  private extractText(event: CursorAssistantEvent): string | null {
    const textBlocks = event.message.content.filter(
      (block): block is { type: "text"; text: string } => block.type === "text"
    );
    if (textBlocks.length === 0) return null;
    return textBlocks.map((b) => b.text).join("");
  }

  private truncateResult(result: Record<string, unknown>): Record<string, unknown> {
    const serialized = JSON.stringify(result);
    const sizeBytes = Buffer.byteLength(serialized, "utf-8");

    if (sizeBytes <= this.maxToolResultSize) {
      return result;
    }

    logger.warn("Truncating large tool result", {
      originalSize: sizeBytes,
      limit: this.maxToolResultSize,
    });

    // Return a truncated version with metadata
    return {
      _truncated: true,
      _originalSizeBytes: sizeBytes,
      _limitBytes: this.maxToolResultSize,
      summary: serialized.slice(0, this.maxToolResultSize),
    };
  }
}

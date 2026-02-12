/**
 * Cursor CLI NDJSON stream parser.
 *
 * Parses raw NDJSON output from `cursor-agent -p --output-format stream-json
 * --stream-partial-output` into typed Cursor events with Zod validation.
 *
 * Features:
 * - Partial line buffering (handles lines split across stdout chunks)
 * - Streaming delta accumulation (--stream-partial-output)
 * - Error recovery for malformed JSON lines (log + skip)
 * - Configurable output size limit (default 50KB)
 * - Backpressure support (pause/resume)
 *
 * @see PLAN2.md — "Milestone 2: Cursor Stream Parser (Channel 1)"
 */

import { CURSOR_EVENT_SUBTYPE, CURSOR_EVENT_TYPE } from "@/constants/cursor-event-types";
import {
  type CursorAssistantEvent,
  CursorAssistantEventSchema,
  type CursorResultEvent,
  CursorResultEventSchema,
  type CursorStreamEvent,
  type CursorSystemEvent,
  CursorSystemEventSchema,
  type CursorToolCallCompletedEvent,
  CursorToolCallCompletedEventSchema,
  type CursorToolCallStartedEvent,
  CursorToolCallStartedEventSchema,
  type CursorUserEvent,
  CursorUserEventSchema,
} from "@/types/cursor-cli.types";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";

const logger = createClassLogger("CursorStreamParser");

// ── Configuration ────────────────────────────────────────────

/** Default max accumulated text size in bytes (50KB) */
const DEFAULT_MAX_OUTPUT_SIZE = 50 * 1024;

export interface CursorStreamParserOptions {
  /** Maximum accumulated text size in bytes before truncation (default 50KB) */
  maxOutputSize?: number;
}

// ── Events ───────────────────────────────────────────────────

export interface CursorStreamParserEvents {
  /** Emitted for each validated Cursor NDJSON event */
  event: (event: CursorStreamEvent) => void;
  /** Emitted specifically for system.init events */
  systemInit: (event: CursorSystemEvent) => void;
  /** Emitted for user echo events */
  userMessage: (event: CursorUserEvent) => void;
  /** Emitted for streaming assistant deltas (has timestamp_ms) */
  assistantDelta: (event: CursorAssistantEvent) => void;
  /** Emitted for complete assistant messages (no timestamp_ms) */
  assistantComplete: (event: CursorAssistantEvent) => void;
  /** Emitted when a tool call starts */
  toolCallStarted: (event: CursorToolCallStartedEvent) => void;
  /** Emitted when a tool call completes */
  toolCallCompleted: (event: CursorToolCallCompletedEvent) => void;
  /** Emitted for result events (terminal) */
  result: (event: CursorResultEvent) => void;
  /** Emitted when a malformed JSON line is encountered */
  parseError: (error: Error, rawLine: string) => void;
  /** Emitted when output size limit is reached */
  outputTruncated: (accumulatedSize: number, limit: number) => void;
}

// ── Parser ───────────────────────────────────────────────────

export class CursorStreamParser extends EventEmitter<CursorStreamParserEvents> {
  private buffer = "";
  private accumulatedTextSize = 0;
  private outputTruncated = false;
  private readonly maxOutputSize: number;
  private paused = false;
  private pauseBuffer: string[] = [];

  constructor(options?: CursorStreamParserOptions) {
    super();
    this.maxOutputSize = options?.maxOutputSize ?? DEFAULT_MAX_OUTPUT_SIZE;
  }

  /**
   * Feed raw data from stdout into the parser.
   * Handles partial lines by buffering incomplete lines across calls.
   */
  public feed(chunk: string | Buffer): void {
    const data = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
    this.buffer += data;

    const lines = this.buffer.split("\n");
    // Keep the last element as it may be a partial line
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;

      if (this.paused) {
        this.pauseBuffer.push(trimmed);
        continue;
      }

      this.parseLine(trimmed);
    }
  }

  /**
   * Flush any remaining buffered data.
   * Call this when the stream ends to process any final partial line.
   */
  public flush(): void {
    if (this.buffer.trim().length > 0) {
      this.parseLine(this.buffer.trim());
      this.buffer = "";
    }

    // Process any paused lines
    if (this.pauseBuffer.length > 0) {
      const lines = [...this.pauseBuffer];
      this.pauseBuffer = [];
      for (const line of lines) {
        this.parseLine(line);
      }
    }
  }

  /**
   * Pause event emission for backpressure.
   * Lines are buffered internally until resume() is called.
   */
  public pause(): void {
    this.paused = true;
  }

  /**
   * Resume event emission, processing any buffered lines.
   */
  public resume(): void {
    this.paused = false;
    if (this.pauseBuffer.length > 0) {
      const lines = [...this.pauseBuffer];
      this.pauseBuffer = [];
      for (const line of lines) {
        this.parseLine(line);
      }
    }
  }

  /** Whether the parser is currently paused */
  public get isPaused(): boolean {
    return this.paused;
  }

  /** Number of lines buffered during pause */
  public get pausedLineCount(): number {
    return this.pauseBuffer.length;
  }

  /** Current accumulated text size in bytes */
  public get currentOutputSize(): number {
    return this.accumulatedTextSize;
  }

  /** Whether the output has been truncated due to size limits */
  public get isOutputTruncated(): boolean {
    return this.outputTruncated;
  }

  /** Reset the parser state */
  public reset(): void {
    this.buffer = "";
    this.accumulatedTextSize = 0;
    this.outputTruncated = false;
    this.paused = false;
    this.pauseBuffer = [];
  }

  // ── Internal ─────────────────────────────────────────────

  private parseLine(line: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      const parseError = new Error(
        `Malformed JSON line: ${error instanceof Error ? error.message : String(error)}`
      );
      logger.warn("Skipping malformed NDJSON line", { line: line.slice(0, 200) });
      this.emit("parseError", parseError, line);
      return;
    }

    if (typeof parsed !== "object" || parsed === null) {
      const parseError = new Error("NDJSON line is not an object");
      this.emit("parseError", parseError, line);
      return;
    }

    const obj = parsed as Record<string, unknown>;
    const type = obj.type;

    switch (type) {
      case CURSOR_EVENT_TYPE.SYSTEM:
        this.handleSystemEvent(obj);
        break;
      case CURSOR_EVENT_TYPE.USER:
        this.handleUserEvent(obj);
        break;
      case CURSOR_EVENT_TYPE.ASSISTANT:
        this.handleAssistantEvent(obj);
        break;
      case CURSOR_EVENT_TYPE.TOOL_CALL:
        this.handleToolCallEvent(obj);
        break;
      case CURSOR_EVENT_TYPE.RESULT:
        this.handleResultEvent(obj);
        break;
      default:
        // Unknown event type — log and skip (forward compatibility)
        logger.debug("Unknown NDJSON event type, skipping", { type });
        break;
    }
  }

  private handleSystemEvent(obj: Record<string, unknown>): void {
    const result = CursorSystemEventSchema.safeParse(obj);
    if (!result.success) {
      logger.warn("Invalid system event", { errors: result.error.issues });
      this.emit("parseError", new Error("Invalid system event"), JSON.stringify(obj));
      return;
    }
    this.emit("event", result.data);
    this.emit("systemInit", result.data);
  }

  private handleUserEvent(obj: Record<string, unknown>): void {
    const result = CursorUserEventSchema.safeParse(obj);
    if (!result.success) {
      logger.warn("Invalid user event", { errors: result.error.issues });
      this.emit("parseError", new Error("Invalid user event"), JSON.stringify(obj));
      return;
    }
    this.emit("event", result.data);
    this.emit("userMessage", result.data);
  }

  private handleAssistantEvent(obj: Record<string, unknown>): void {
    const result = CursorAssistantEventSchema.safeParse(obj);
    if (!result.success) {
      logger.warn("Invalid assistant event", { errors: result.error.issues });
      this.emit("parseError", new Error("Invalid assistant event"), JSON.stringify(obj));
      return;
    }

    // Track accumulated text size for output limit enforcement
    const textContent = result.data.message.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");

    this.accumulatedTextSize += Buffer.byteLength(textContent, "utf-8");

    if (this.accumulatedTextSize > this.maxOutputSize && !this.outputTruncated) {
      this.outputTruncated = true;
      logger.warn("Output size limit reached", {
        accumulatedSize: this.accumulatedTextSize,
        limit: this.maxOutputSize,
      });
      this.emit("outputTruncated", this.accumulatedTextSize, this.maxOutputSize);
    }

    this.emit("event", result.data);

    // Distinguish streaming deltas from complete messages
    if (result.data.timestamp_ms !== undefined) {
      this.emit("assistantDelta", result.data);
    } else {
      this.emit("assistantComplete", result.data);
    }
  }

  private handleToolCallEvent(obj: Record<string, unknown>): void {
    const subtype = obj.subtype;

    if (subtype === CURSOR_EVENT_SUBTYPE.STARTED) {
      const result = CursorToolCallStartedEventSchema.safeParse(obj);
      if (!result.success) {
        logger.warn("Invalid tool_call.started event", { errors: result.error.issues });
        this.emit("parseError", new Error("Invalid tool_call.started event"), JSON.stringify(obj));
        return;
      }
      this.emit("event", result.data);
      this.emit("toolCallStarted", result.data);
    } else if (subtype === CURSOR_EVENT_SUBTYPE.COMPLETED) {
      const result = CursorToolCallCompletedEventSchema.safeParse(obj);
      if (!result.success) {
        logger.warn("Invalid tool_call.completed event", { errors: result.error.issues });
        this.emit(
          "parseError",
          new Error("Invalid tool_call.completed event"),
          JSON.stringify(obj)
        );
        return;
      }
      this.emit("event", result.data);
      this.emit("toolCallCompleted", result.data);
    } else {
      logger.debug("Unknown tool_call subtype, skipping", { subtype });
    }
  }

  private handleResultEvent(obj: Record<string, unknown>): void {
    const result = CursorResultEventSchema.safeParse(obj);
    if (!result.success) {
      logger.warn("Invalid result event", { errors: result.error.issues });
      this.emit("parseError", new Error("Invalid result event"), JSON.stringify(obj));
      return;
    }
    this.emit("event", result.data);
    this.emit("result", result.data);
  }
}

/**
 * Create a stdout data handler that feeds chunks into a CursorStreamParser.
 * Useful for piping directly from child_process.stdout.
 */
export function createStdoutHandler(parser: CursorStreamParser): (chunk: Buffer) => void {
  return (chunk: Buffer) => {
    parser.feed(chunk);
  };
}

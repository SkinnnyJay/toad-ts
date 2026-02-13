import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { StreamLineParser } from "@/core/cli-agent/stream-line-parser";
import type { CursorStreamEvent } from "@/types/cursor-cli.types";
import { cursorStreamEvent } from "@/types/cursor-cli.types";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { EventEmitter } from "eventemitter3";

interface AssistantOutputState {
  text: string;
  bytes: number;
  truncated: boolean;
}

export interface CursorStreamParserEvents {
  event: (event: CursorStreamEvent) => void;
  parseError: (payload: { line: string; reason: string }) => void;
  truncated: (payload: {
    sessionId: string;
    originalBytes: number;
    maxBytes: number;
  }) => void;
  paused: (payload: { pendingEvents: number }) => void;
  resumed: (payload: { pendingEvents: number }) => void;
}

export interface CursorStreamParserOptions {
  maxAccumulatedOutputBytes?: number;
  maxPendingEvents?: number;
  resumePendingEvents?: number;
}

const getAssistantTextChunks = (event: CursorStreamEvent): string[] => {
  // External Cursor NDJSON protocol event type.
  if (event.type !== "assistant") {
    return [];
  }

  return event.message.content
    .map((block) => block.text)
    .filter((text): text is string => text.length > 0);
};

const toUtf8Bytes = (value: string): number => Buffer.byteLength(value, "utf8");

const truncateToBytes = (value: string, maxBytes: number): string => {
  if (maxBytes <= 0) {
    return "";
  }
  return Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8");
};

export class CursorStreamParser extends EventEmitter<CursorStreamParserEvents> {
  private readonly logger = createClassLogger("CursorStreamParser");
  private readonly lineParser = new StreamLineParser();
  private readonly pendingEvents: CursorStreamEvent[] = [];
  private readonly assistantOutputBySession = new Map<string, AssistantOutputState>();
  private readonly maxAccumulatedOutputBytes: number;
  private readonly maxPendingEvents: number;
  private readonly resumePendingEvents: number;

  public constructor(options: CursorStreamParserOptions = {}) {
    super();
    this.maxAccumulatedOutputBytes =
      options.maxAccumulatedOutputBytes ?? CURSOR_LIMIT.MAX_ACCUMULATED_OUTPUT_BYTES;
    this.maxPendingEvents = options.maxPendingEvents ?? CURSOR_LIMIT.MAX_PENDING_EVENTS;
    this.resumePendingEvents = options.resumePendingEvents ?? CURSOR_LIMIT.RESUME_PENDING_EVENTS;
    this.lineParser.on("line", (line) => this.parseLine(line));
  }

  public write(chunk: Buffer | string): void {
    this.lineParser.write(chunk);
  }

  public flush(): void {
    this.lineParser.flush();
  }

  public drain(maxCount = this.pendingEvents.length): CursorStreamEvent[] {
    if (maxCount <= 0) {
      return [];
    }

    const drained = this.pendingEvents.splice(0, maxCount);
    this.maybeResume();
    return drained;
  }

  public getPendingCount(): number {
    return this.pendingEvents.length;
  }

  public isPaused(): boolean {
    return this.lineParser.isPaused();
  }

  public getAccumulatedAssistantText(sessionId: string): string {
    return this.assistantOutputBySession.get(sessionId)?.text ?? "";
  }

  public hasTruncatedAssistantText(sessionId: string): boolean {
    return this.assistantOutputBySession.get(sessionId)?.truncated ?? false;
  }

  private maybeResume(): void {
    if (!this.lineParser.isPaused()) {
      return;
    }
    if (this.pendingEvents.length > this.resumePendingEvents) {
      return;
    }
    this.lineParser.resume();
    this.emit("resumed", { pendingEvents: this.pendingEvents.length });
  }

  private parseLine(line: string): void {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(line);
    } catch (error) {
      this.handleParseError(line, error);
      return;
    }

    const parsedEvent = cursorStreamEvent.safeParse(parsedJson);
    if (!parsedEvent.success) {
      this.handleParseError(line, parsedEvent.error);
      return;
    }

    const event = parsedEvent.data;
    this.accumulateAssistantOutput(event);

    this.pendingEvents.push(event);
    this.emit("event", event);

    if (this.pendingEvents.length >= this.maxPendingEvents) {
      this.lineParser.pause();
      this.emit("paused", { pendingEvents: this.pendingEvents.length });
    }
  }

  private accumulateAssistantOutput(event: CursorStreamEvent): void {
    // External Cursor NDJSON protocol event type.
    if (event.type !== "assistant") {
      return;
    }

    const sessionId = event.session_id;
    const current =
      this.assistantOutputBySession.get(sessionId) ??
      ({
        text: "",
        bytes: 0,
        truncated: false,
      } satisfies AssistantOutputState);

    const chunks = getAssistantTextChunks(event);
    let nextText = current.text;
    let nextBytes = current.bytes;
    let nextTruncated = current.truncated;

    for (const chunk of chunks) {
      const chunkBytes = toUtf8Bytes(chunk);
      const spaceLeft = this.maxAccumulatedOutputBytes - nextBytes;
      const hasCapacity = spaceLeft > 0;

      if (!hasCapacity) {
        nextTruncated = true;
        this.emitTruncated(sessionId, chunkBytes);
        continue;
      }

      if (chunkBytes <= spaceLeft) {
        nextText += chunk;
        nextBytes += chunkBytes;
        continue;
      }

      const truncatedChunk = truncateToBytes(chunk, spaceLeft);
      nextText += truncatedChunk;
      nextBytes = this.maxAccumulatedOutputBytes;
      nextTruncated = true;
      this.emitTruncated(sessionId, chunkBytes);
    }

    this.assistantOutputBySession.set(sessionId, {
      text: nextText,
      bytes: nextBytes,
      truncated: nextTruncated,
    });
  }

  private emitTruncated(sessionId: string, originalBytes: number): void {
    this.logger.warn("Truncated assistant output while accumulating stream", {
      sessionId,
      originalBytes,
      maxBytes: this.maxAccumulatedOutputBytes,
    });
    this.emit("truncated", {
      sessionId,
      originalBytes,
      maxBytes: this.maxAccumulatedOutputBytes,
    });
  }

  private handleParseError(line: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : String(error);
    this.logger.warn("Failed to parse Cursor NDJSON line", { reason, line });
    this.emit("parseError", { line, reason });
  }
}

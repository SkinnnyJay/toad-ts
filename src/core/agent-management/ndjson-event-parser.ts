import type { z } from "zod";

export const NDJSON_EVENT_PARSER_DEFAULT = {
  BACKPRESSURE_HIGH_WATERMARK: 128,
} as const;

export interface NdjsonParserIssue {
  line: string;
  error: string;
}

export interface NdjsonParseResult {
  parsedCount: number;
  malformedLineCount: number;
  invalidEventCount: number;
  shouldPause: boolean;
}

export interface NdjsonEventParserOptions<TEvent> {
  schema: z.ZodType<TEvent>;
  backpressureHighWatermark?: number;
  onMalformedLine?: (issue: NdjsonParserIssue) => void;
  onInvalidEvent?: (issue: NdjsonParserIssue) => void;
  onEventParsed?: (event: TEvent) => void;
}

export class NdjsonEventParser<TEvent> {
  private lineBuffer = "";
  private readonly pendingEvents: TEvent[] = [];
  private readonly schema: z.ZodType<TEvent>;
  private readonly backpressureHighWatermark: number;
  private readonly onMalformedLine?: (issue: NdjsonParserIssue) => void;
  private readonly onInvalidEvent?: (issue: NdjsonParserIssue) => void;
  private readonly onEventParsed?: (event: TEvent) => void;

  constructor(options: NdjsonEventParserOptions<TEvent>) {
    this.schema = options.schema;
    this.backpressureHighWatermark =
      options.backpressureHighWatermark ?? NDJSON_EVENT_PARSER_DEFAULT.BACKPRESSURE_HIGH_WATERMARK;
    this.onMalformedLine = options.onMalformedLine;
    this.onInvalidEvent = options.onInvalidEvent;
    this.onEventParsed = options.onEventParsed;
  }

  pushChunk(chunk: Buffer | string): NdjsonParseResult {
    const textChunk = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    this.lineBuffer += textChunk;
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() ?? "";

    return this.parseLines(lines);
  }

  end(): NdjsonParseResult {
    if (this.lineBuffer.trim().length === 0) {
      this.lineBuffer = "";
      return this.emptyResult();
    }

    const trailingLine = this.lineBuffer;
    this.lineBuffer = "";
    return this.parseLines([trailingLine]);
  }

  readEvent(): TEvent | null {
    return this.pendingEvents.shift() ?? null;
  }

  drainEvents(): TEvent[] {
    const drained = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return drained;
  }

  clear(): void {
    this.lineBuffer = "";
    this.pendingEvents.length = 0;
  }

  getPendingEventCount(): number {
    return this.pendingEvents.length;
  }

  isBackpressured(): boolean {
    return this.pendingEvents.length >= this.backpressureHighWatermark;
  }

  private parseLines(lines: string[]): NdjsonParseResult {
    let parsedCount = 0;
    let malformedLineCount = 0;
    let invalidEventCount = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length === 0) {
        continue;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(line);
      } catch (error) {
        malformedLineCount += 1;
        this.onMalformedLine?.({
          line,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      const parsedEvent = this.schema.safeParse(parsedJson);
      if (!parsedEvent.success) {
        invalidEventCount += 1;
        this.onInvalidEvent?.({
          line,
          error: parsedEvent.error.message,
        });
        continue;
      }

      const event = parsedEvent.data;
      this.pendingEvents.push(event);
      this.onEventParsed?.(event);
      parsedCount += 1;
    }

    return {
      parsedCount,
      malformedLineCount,
      invalidEventCount,
      shouldPause: this.isBackpressured(),
    };
  }

  private emptyResult(): NdjsonParseResult {
    return {
      parsedCount: 0,
      malformedLineCount: 0,
      invalidEventCount: 0,
      shouldPause: this.isBackpressured(),
    };
  }
}

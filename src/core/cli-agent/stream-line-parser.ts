import type { z } from "zod";

export const STREAM_LINE_PARSER_DEFAULT = {
  BACKPRESSURE_HIGH_WATERMARK: 128,
} as const;

export interface StreamLineParserIssue {
  line: string;
  error: string;
}

export interface StreamLineParseResult {
  parsedCount: number;
  malformedLineCount: number;
  invalidEventCount: number;
  shouldPause: boolean;
}

export interface StreamLineParserOptions<TEvent> {
  schema: z.ZodType<TEvent>;
  backpressureHighWatermark?: number;
  onMalformedLine?: (issue: StreamLineParserIssue) => void;
  onInvalidEvent?: (issue: StreamLineParserIssue) => void;
  onEventParsed?: (event: TEvent) => void;
}

export class StreamLineParser<TEvent> {
  private lineBuffer = "";
  private readonly pendingEvents: TEvent[] = [];
  private readonly schema: z.ZodType<TEvent>;
  private readonly backpressureHighWatermark: number;
  private readonly onMalformedLine?: (issue: StreamLineParserIssue) => void;
  private readonly onInvalidEvent?: (issue: StreamLineParserIssue) => void;
  private readonly onEventParsed?: (event: TEvent) => void;

  constructor(options: StreamLineParserOptions<TEvent>) {
    this.schema = options.schema;
    this.backpressureHighWatermark =
      options.backpressureHighWatermark ?? STREAM_LINE_PARSER_DEFAULT.BACKPRESSURE_HIGH_WATERMARK;
    this.onMalformedLine = options.onMalformedLine;
    this.onInvalidEvent = options.onInvalidEvent;
    this.onEventParsed = options.onEventParsed;
  }

  pushChunk(chunk: Buffer | string): StreamLineParseResult {
    const textChunk = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    this.lineBuffer += textChunk;
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() ?? "";
    return this.parseLines(lines);
  }

  end(): StreamLineParseResult {
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

  private parseLines(lines: string[]): StreamLineParseResult {
    let parsedCount = 0;
    let malformedLineCount = 0;
    let invalidEventCount = 0;

    for (const [index, rawLine] of lines.entries()) {
      if (this.isBackpressured()) {
        this.rebufferLines(lines.slice(index));
        break;
      }
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

  private rebufferLines(lines: string[]): void {
    if (lines.length === 0) {
      return;
    }
    const remaining = lines.join("\n");
    if (remaining.length === 0) {
      return;
    }
    this.lineBuffer = this.lineBuffer.length > 0 ? `${remaining}\n${this.lineBuffer}` : remaining;
  }

  private emptyResult(): StreamLineParseResult {
    return {
      parsedCount: 0,
      malformedLineCount: 0,
      invalidEventCount: 0,
      shouldPause: this.isBackpressured(),
    };
  }
}

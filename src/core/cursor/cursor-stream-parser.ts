import { CURSOR_STREAM_TYPE } from "@/constants/cursor-event-types";
import { type CursorStreamEvent, CursorStreamEventSchema } from "@/types/cursor-cli.types";

export const CURSOR_STREAM_PARSER_DEFAULT = {
  MAX_ACCUMULATED_TEXT_BYTES: 50 * 1024,
  BACKPRESSURE_HIGH_WATERMARK: 128,
} as const;

export interface CursorStreamParserIssue {
  line: string;
  error: string;
}

export interface CursorStreamParserOptions {
  maxAccumulatedTextBytes?: number;
  backpressureHighWatermark?: number;
  onMalformedLine?: (issue: CursorStreamParserIssue) => void;
  onInvalidEvent?: (issue: CursorStreamParserIssue) => void;
  onTruncation?: (sessionId: string, originalBytes: number, limitBytes: number) => void;
}

export interface CursorParseResult {
  parsedCount: number;
  malformedLineCount: number;
  invalidEventCount: number;
  shouldPause: boolean;
}

export interface CursorAccumulatedText {
  text: string;
  truncated: boolean;
}

export class CursorStreamParser {
  private lineBuffer = "";
  private readonly pendingEvents: CursorStreamEvent[] = [];
  private readonly accumulatedTextBySession = new Map<string, CursorAccumulatedText>();
  private readonly maxAccumulatedTextBytes: number;
  private readonly backpressureHighWatermark: number;
  private readonly onMalformedLine?: (issue: CursorStreamParserIssue) => void;
  private readonly onInvalidEvent?: (issue: CursorStreamParserIssue) => void;
  private readonly onTruncation?: (
    sessionId: string,
    originalBytes: number,
    limitBytes: number
  ) => void;

  constructor(options: CursorStreamParserOptions = {}) {
    this.maxAccumulatedTextBytes =
      options.maxAccumulatedTextBytes ?? CURSOR_STREAM_PARSER_DEFAULT.MAX_ACCUMULATED_TEXT_BYTES;
    this.backpressureHighWatermark =
      options.backpressureHighWatermark ?? CURSOR_STREAM_PARSER_DEFAULT.BACKPRESSURE_HIGH_WATERMARK;
    this.onMalformedLine = options.onMalformedLine;
    this.onInvalidEvent = options.onInvalidEvent;
    this.onTruncation = options.onTruncation;
  }

  pushChunk(chunk: Buffer | string): CursorParseResult {
    const textChunk = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    this.lineBuffer += textChunk;
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() ?? "";

    return this.parseLines(lines);
  }

  end(): CursorParseResult {
    if (this.lineBuffer.trim().length === 0) {
      this.lineBuffer = "";
      return this.emptyResult();
    }

    const trailingLine = this.lineBuffer;
    this.lineBuffer = "";
    return this.parseLines([trailingLine]);
  }

  readEvent(): CursorStreamEvent | null {
    return this.pendingEvents.shift() ?? null;
  }

  drainEvents(): CursorStreamEvent[] {
    const drained = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return drained;
  }

  clear(): void {
    this.lineBuffer = "";
    this.pendingEvents.length = 0;
    this.accumulatedTextBySession.clear();
  }

  getPendingEventCount(): number {
    return this.pendingEvents.length;
  }

  isBackpressured(): boolean {
    return this.pendingEvents.length >= this.backpressureHighWatermark;
  }

  getAccumulatedText(sessionId: string): CursorAccumulatedText {
    return this.accumulatedTextBySession.get(sessionId) ?? { text: "", truncated: false };
  }

  private parseLines(lines: string[]): CursorParseResult {
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

      const parsedEvent = CursorStreamEventSchema.safeParse(parsedJson);
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
      this.updateAccumulatedText(event);
      parsedCount += 1;
    }

    return {
      parsedCount,
      malformedLineCount,
      invalidEventCount,
      shouldPause: this.isBackpressured(),
    };
  }

  private updateAccumulatedText(event: CursorStreamEvent): void {
    if (event.type !== CURSOR_STREAM_TYPE.ASSISTANT) {
      return;
    }

    const text = event.message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    if (text.length === 0) {
      return;
    }

    const existing = this.accumulatedTextBySession.get(event.session_id) ?? {
      text: "",
      truncated: false,
    };

    let mergedText = existing.text;
    if (existing.text.length === 0) {
      mergedText = text;
    } else if (text.startsWith(existing.text)) {
      mergedText = text;
    } else if (existing.text.endsWith(text)) {
      mergedText = existing.text;
    } else {
      mergedText = `${existing.text}${text}`;
    }

    const mergedBytes = this.byteLength(mergedText);
    if (mergedBytes <= this.maxAccumulatedTextBytes) {
      this.accumulatedTextBySession.set(event.session_id, {
        text: mergedText,
        truncated: existing.truncated,
      });
      return;
    }

    const truncatedText = this.truncateToByteLength(mergedText, this.maxAccumulatedTextBytes);
    const wasAlreadyTruncated = existing.truncated;
    this.accumulatedTextBySession.set(event.session_id, {
      text: truncatedText,
      truncated: true,
    });

    if (!wasAlreadyTruncated) {
      this.onTruncation?.(event.session_id, mergedBytes, this.maxAccumulatedTextBytes);
    }
  }

  private truncateToByteLength(text: string, limitBytes: number): string {
    if (this.byteLength(text) <= limitBytes) {
      return text;
    }

    let result = "";
    for (const character of text) {
      const candidate = `${result}${character}`;
      if (this.byteLength(candidate) > limitBytes) {
        break;
      }
      result = candidate;
    }
    return result;
  }

  private byteLength(text: string): number {
    return Buffer.byteLength(text, "utf8");
  }

  private emptyResult(): CursorParseResult {
    return {
      parsedCount: 0,
      malformedLineCount: 0,
      invalidEventCount: 0,
      shouldPause: this.isBackpressured(),
    };
  }
}

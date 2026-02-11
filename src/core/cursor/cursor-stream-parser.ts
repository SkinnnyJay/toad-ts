import { CURSOR_STREAM_TYPE } from "@/constants/cursor-event-types";
import {
  NdjsonEventParser,
  type NdjsonParseResult,
  type NdjsonParserIssue,
} from "@/core/agent-management/ndjson-event-parser";
import { type CursorStreamEvent, CursorStreamEventSchema } from "@/types/cursor-cli.types";

export const CURSOR_STREAM_PARSER_DEFAULT = {
  MAX_ACCUMULATED_TEXT_BYTES: 50 * 1024,
  BACKPRESSURE_HIGH_WATERMARK: 128,
} as const;

export type CursorStreamParserIssue = NdjsonParserIssue;

export interface CursorStreamParserOptions {
  maxAccumulatedTextBytes?: number;
  backpressureHighWatermark?: number;
  onMalformedLine?: (issue: CursorStreamParserIssue) => void;
  onInvalidEvent?: (issue: CursorStreamParserIssue) => void;
  onTruncation?: (sessionId: string, originalBytes: number, limitBytes: number) => void;
}

export type CursorParseResult = NdjsonParseResult;

export interface CursorAccumulatedText {
  text: string;
  truncated: boolean;
}

export class CursorStreamParser {
  private readonly parser: NdjsonEventParser<CursorStreamEvent>;
  private readonly accumulatedTextBySession = new Map<string, CursorAccumulatedText>();
  private readonly maxAccumulatedTextBytes: number;
  private readonly onTruncation?: (
    sessionId: string,
    originalBytes: number,
    limitBytes: number
  ) => void;

  constructor(options: CursorStreamParserOptions = {}) {
    this.maxAccumulatedTextBytes =
      options.maxAccumulatedTextBytes ?? CURSOR_STREAM_PARSER_DEFAULT.MAX_ACCUMULATED_TEXT_BYTES;
    this.onTruncation = options.onTruncation;
    this.parser = new NdjsonEventParser<CursorStreamEvent>({
      schema: CursorStreamEventSchema,
      backpressureHighWatermark:
        options.backpressureHighWatermark ??
        CURSOR_STREAM_PARSER_DEFAULT.BACKPRESSURE_HIGH_WATERMARK,
      onMalformedLine: options.onMalformedLine,
      onInvalidEvent: options.onInvalidEvent,
      onEventParsed: (event) => this.updateAccumulatedText(event),
    });
  }

  pushChunk(chunk: Buffer | string): CursorParseResult {
    return this.parser.pushChunk(chunk);
  }

  end(): CursorParseResult {
    return this.parser.end();
  }

  readEvent(): CursorStreamEvent | null {
    return this.parser.readEvent();
  }

  drainEvents(): CursorStreamEvent[] {
    return this.parser.drainEvents();
  }

  clear(): void {
    this.parser.clear();
    this.accumulatedTextBySession.clear();
  }

  getPendingEventCount(): number {
    return this.parser.getPendingEventCount();
  }

  isBackpressured(): boolean {
    return this.parser.isBackpressured();
  }

  getAccumulatedText(sessionId: string): CursorAccumulatedText {
    return this.accumulatedTextBySession.get(sessionId) ?? { text: "", truncated: false };
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
}

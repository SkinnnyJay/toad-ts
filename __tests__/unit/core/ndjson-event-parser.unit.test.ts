import { NdjsonEventParser } from "@/core/agent-management/ndjson-event-parser";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const TestEventSchema = z.object({
  type: z.enum(["message"]),
  text: z.string(),
});

describe("NdjsonEventParser", () => {
  it("parses valid lines and drains events", () => {
    const parser = new NdjsonEventParser({
      schema: TestEventSchema,
    });

    const result = parser.pushChunk(
      '{"type":"message","text":"a"}\n{"type":"message","text":"b"}\n'
    );

    expect(result.parsedCount).toBe(2);
    expect(result.invalidEventCount).toBe(0);
    expect(parser.drainEvents()).toEqual([
      { type: "message", text: "a" },
      { type: "message", text: "b" },
    ]);
  });

  it("tracks malformed and invalid lines", () => {
    const malformed: string[] = [];
    const invalid: string[] = [];
    const parser = new NdjsonEventParser({
      schema: TestEventSchema,
      onMalformedLine: (issue) => malformed.push(issue.line),
      onInvalidEvent: (issue) => invalid.push(issue.line),
    });

    const result = parser.pushChunk('{"type":"message","text":"ok"}\nnot-json\n{"type":"other"}\n');

    expect(result.parsedCount).toBe(1);
    expect(result.malformedLineCount).toBe(1);
    expect(result.invalidEventCount).toBe(1);
    expect(malformed).toHaveLength(1);
    expect(invalid).toHaveLength(1);
  });

  it("handles trailing partial lines on end()", () => {
    const parser = new NdjsonEventParser({
      schema: TestEventSchema,
    });

    parser.pushChunk('{"type":"message","text":"he');
    const result = parser.pushChunk('llo"}');
    expect(result.parsedCount).toBe(0);

    const endResult = parser.end();
    expect(endResult.parsedCount).toBe(1);
    expect(parser.readEvent()).toEqual({ type: "message", text: "hello" });
  });

  it("signals backpressure above configured watermark", () => {
    const parser = new NdjsonEventParser({
      schema: TestEventSchema,
      backpressureHighWatermark: 1,
    });

    const result = parser.pushChunk('{"type":"message","text":"a"}\n');
    expect(result.shouldPause).toBe(true);
    expect(parser.isBackpressured()).toBe(true);
  });
});

import { StreamLineParser } from "@/core/cli-agent/stream-line-parser";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const TestEventSchema = z.object({
  type: z.enum(["message"]),
  text: z.string(),
});

describe("StreamLineParser", () => {
  it("parses valid lines and drains events", () => {
    const parser = new StreamLineParser({
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
    const parser = new StreamLineParser({
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

  it("pauses parsing at backpressure limit and resumes later", () => {
    const parser = new StreamLineParser({
      schema: TestEventSchema,
      backpressureHighWatermark: 1,
    });

    const firstPass = parser.pushChunk(
      '{"type":"message","text":"a"}\n{"type":"message","text":"b"}\n'
    );

    expect(firstPass.parsedCount).toBe(1);
    expect(firstPass.shouldPause).toBe(true);
    expect(parser.drainEvents()).toEqual([{ type: "message", text: "a" }]);

    const secondPass = parser.end();

    expect(secondPass.parsedCount).toBe(1);
    expect(parser.drainEvents()).toEqual([{ type: "message", text: "b" }]);
  });

  it("parses all rebuffered lines when ending after backpressure pause", () => {
    const parser = new StreamLineParser({
      schema: TestEventSchema,
      backpressureHighWatermark: 1,
    });

    const firstPass = parser.pushChunk(
      `${[
        '{"type":"message","text":"a"}',
        '{"type":"message","text":"b"}',
        '{"type":"message","text":"c"}',
      ].join("\n")}\n`
    );

    expect(firstPass.parsedCount).toBe(1);
    expect(firstPass.shouldPause).toBe(true);
    expect(parser.drainEvents()).toEqual([{ type: "message", text: "a" }]);

    const secondPass = parser.end();

    expect(secondPass.parsedCount).toBe(2);
    expect(parser.drainEvents()).toEqual([
      { type: "message", text: "b" },
      { type: "message", text: "c" },
    ]);
  });
});

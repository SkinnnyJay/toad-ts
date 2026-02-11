import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURSOR_STREAM_SUBTYPE,
  CURSOR_STREAM_TYPE,
} from "../../../src/constants/cursor-event-types";
import { ENCODING } from "../../../src/constants/encodings";
import {
  CURSOR_STREAM_PARSER_DEFAULT,
  CursorStreamParser,
} from "../../../src/core/cursor/cursor-stream-parser";

const fixturesDir = path.join(process.cwd(), "__tests__", "fixtures", "cursor", "ndjson");
const sessionId = "14855632-18d5-44a3-ab27-5c93e95a8011";

const fixturePath = (fileName: string): string => path.join(fixturesDir, fileName);

describe("CursorStreamParser", () => {
  it("parses NDJSON fixtures and accumulates assistant text", async () => {
    const raw = await readFile(fixturePath("hello-response.ndjson"), ENCODING.UTF8);
    const parser = new CursorStreamParser();

    const result = parser.pushChunk(raw);
    const events = parser.drainEvents();
    const accumulated = parser.getAccumulatedText("b423b428-a576-4c0c-ae1a-ef80457ba379");

    expect(result.parsedCount).toBeGreaterThan(5);
    expect(events.some((event) => event.type === CURSOR_STREAM_TYPE.SYSTEM)).toBe(true);
    expect(events.some((event) => event.type === CURSOR_STREAM_TYPE.RESULT)).toBe(true);
    expect(accumulated.text).toContain("Hello, welcome to the toad-ts project");
    expect(accumulated.truncated).toBe(false);
  });

  it("handles partial line buffering across chunks", () => {
    const parser = new CursorStreamParser();
    const lineOne = `{"type":"system","subtype":"init","cwd":"/workspace","session_id":"${sessionId}","model":"opus-4.6-thinking"}\n`;
    const lineTwo = `{"type":"result","subtype":"success","duration_ms":1,"is_error":false,"result":"ok","session_id":"${sessionId}"}\n`;
    const splitIndex = 25;

    const firstResult = parser.pushChunk(`${lineOne}${lineTwo.slice(0, splitIndex)}`);
    const secondResult = parser.pushChunk(lineTwo.slice(splitIndex));
    const events = parser.drainEvents();

    expect(firstResult.parsedCount).toBe(1);
    expect(secondResult.parsedCount).toBe(1);
    expect(events).toHaveLength(2);
  });

  it("skips malformed JSON and invalid schema lines", () => {
    const malformed: string[] = [];
    const invalid: string[] = [];
    const parser = new CursorStreamParser({
      onMalformedLine: (issue) => malformed.push(issue.line),
      onInvalidEvent: (issue) => invalid.push(issue.line),
    });
    const payload = [
      `{"type":"system","subtype":"init","cwd":"/workspace","session_id":"${sessionId}","model":"opus-4.6-thinking"}`,
      "{not-json",
      '{"type":"unknown","session_id":"14855632-18d5-44a3-ab27-5c93e95a8011"}',
      `{"type":"result","subtype":"success","duration_ms":1,"is_error":false,"result":"ok","session_id":"${sessionId}"}`,
    ].join("\n");

    const pushResult = parser.pushChunk(payload);
    const endResult = parser.end();
    const events = parser.drainEvents();

    expect(pushResult.parsedCount + endResult.parsedCount).toBe(2);
    expect(pushResult.malformedLineCount + endResult.malformedLineCount).toBe(1);
    expect(pushResult.invalidEventCount + endResult.invalidEventCount).toBe(1);
    expect(malformed).toHaveLength(1);
    expect(invalid).toHaveLength(1);
    expect(events).toHaveLength(2);
  });

  it("signals backpressure when queue reaches high watermark", async () => {
    const raw = await readFile(fixturePath("tool-use-response.ndjson"), ENCODING.UTF8);
    const parser = new CursorStreamParser({
      backpressureHighWatermark: 2,
    });

    const result = parser.pushChunk(raw);
    const pending = parser.getPendingEventCount();

    expect(result.shouldPause).toBe(true);
    expect(pending).toBeGreaterThanOrEqual(2);
    expect(parser.isBackpressured()).toBe(true);
  });

  it("truncates accumulated output when byte limit is exceeded", () => {
    let truncationCallCount = 0;
    const parser = new CursorStreamParser({
      maxAccumulatedTextBytes: 10,
      onTruncation: () => {
        truncationCallCount += 1;
      },
    });
    const events = [
      {
        type: CURSOR_STREAM_TYPE.ASSISTANT,
        session_id: sessionId,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "123456" }],
        },
      },
      {
        type: CURSOR_STREAM_TYPE.ASSISTANT,
        session_id: sessionId,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "789012345" }],
        },
      },
      {
        type: CURSOR_STREAM_TYPE.RESULT,
        subtype: CURSOR_STREAM_SUBTYPE.SUCCESS,
        duration_ms: 1,
        is_error: false,
        result: "done",
        session_id: sessionId,
      },
    ]
      .map((event) => JSON.stringify(event))
      .join("\n");

    const pushResult = parser.pushChunk(events);
    const endResult = parser.end();
    const accumulated = parser.getAccumulatedText(sessionId);
    const byteLength = Buffer.byteLength(accumulated.text, ENCODING.UTF8);

    expect(pushResult.parsedCount + endResult.parsedCount).toBe(3);
    expect(byteLength).toBeLessThanOrEqual(10);
    expect(accumulated.truncated).toBe(true);
    expect(truncationCallCount).toBe(1);
    expect(CURSOR_STREAM_PARSER_DEFAULT.MAX_ACCUMULATED_TEXT_BYTES).toBe(50 * 1024);
  });
});

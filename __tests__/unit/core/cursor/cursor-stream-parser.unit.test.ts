import { readFileSync } from "node:fs";
import path from "node:path";
import { CURSOR_EVENT_SUBTYPE, CURSOR_EVENT_TYPE } from "@/constants/cursor-event-types";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import { describe, expect, it } from "vitest";

const readFixture = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

const splitIntoChunks = (value: string, chunkSize: number): string[] => {
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    chunks.push(value.slice(cursor, cursor + chunkSize));
    cursor += chunkSize;
  }
  return chunks;
};

const createSystemInitLine = (sessionId: string): string =>
  `${JSON.stringify({
    type: CURSOR_EVENT_TYPE.SYSTEM,
    subtype: CURSOR_EVENT_SUBTYPE.INIT,
    cwd: "/workspace",
    session_id: sessionId,
    model: "Claude 4.6 Opus (Thinking)",
  })}\n`;

const createAssistantLine = (sessionId: string, text: string): string =>
  `${JSON.stringify({
    type: CURSOR_EVENT_TYPE.ASSISTANT,
    message: {
      role: "assistant",
      content: [{ type: "text", text }],
    },
    session_id: sessionId,
  })}\n`;

describe("CursorStreamParser", () => {
  it("parses fixture events across arbitrary chunk boundaries", () => {
    const fixture = readFixture("__tests__/fixtures/cursor/ndjson/hello-response.ndjson");
    const expectedLineCount = fixture
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length;

    const parser = new CursorStreamParser();
    const chunks = splitIntoChunks(fixture, 11);
    for (const chunk of chunks) {
      parser.write(chunk);
    }
    parser.flush();

    const events = parser.drain();
    expect(events).toHaveLength(expectedLineCount);
    expect(events[0]?.type).toBe(CURSOR_EVENT_TYPE.SYSTEM);
    expect(events[events.length - 1]?.type).toBe(CURSOR_EVENT_TYPE.RESULT);
  });

  it("recovers from malformed json lines and continues parsing", () => {
    const parser = new CursorStreamParser();
    const parseErrors: Array<{ line: string; reason: string }> = [];
    parser.on("parseError", (payload) => parseErrors.push(payload));

    parser.write(createSystemInitLine("session-1"));
    parser.write("{not-json}\n");
    parser.write(createAssistantLine("session-1", "hello"));
    parser.flush();

    const events = parser.drain();
    expect(events).toHaveLength(2);
    expect(parseErrors).toHaveLength(1);
  });

  it("accumulates assistant text and emits truncation warnings when limit reached", () => {
    const parser = new CursorStreamParser({ maxAccumulatedOutputBytes: 10 });
    const truncatedEvents: Array<{ sessionId: string; originalBytes: number; maxBytes: number }> =
      [];
    parser.on("truncated", (payload) => truncatedEvents.push(payload));

    parser.write(createAssistantLine("session-1", "hello"));
    parser.write(createAssistantLine("session-1", " world"));
    parser.flush();

    const accumulated = parser.getAccumulatedAssistantText("session-1");
    expect(Buffer.byteLength(accumulated, "utf8")).toBeLessThanOrEqual(10);
    expect(parser.hasTruncatedAssistantText("session-1")).toBe(true);
    expect(truncatedEvents.length).toBeGreaterThan(0);
  });

  it("pauses when pending queue reaches max and resumes after draining", () => {
    const parser = new CursorStreamParser({
      maxPendingEvents: 2,
      resumePendingEvents: 0,
    });

    parser.write(createSystemInitLine("session-1"));
    parser.write(createAssistantLine("session-1", "a"));
    parser.write(createAssistantLine("session-1", "b"));
    parser.flush();

    expect(parser.isPaused()).toBe(true);
    expect(parser.getPendingCount()).toBe(2);

    const firstDrain = parser.drain(2);
    expect(firstDrain).toHaveLength(2);
    expect(parser.isPaused()).toBe(false);
    expect(parser.getPendingCount()).toBe(1);
  });
});

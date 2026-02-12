import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CursorStreamParser, createStdoutHandler } from "@/core/cursor/cursor-stream-parser";
import type {
  CursorSystemEvent,
  CursorAssistantEvent,
  CursorToolCallStartedEvent,
  CursorToolCallCompletedEvent,
  CursorResultEvent,
} from "@/types/cursor-cli.types";

function loadNdjsonFixture(name: string): string {
  const path = resolve(__dirname, "../../../fixtures/cursor/ndjson", name);
  return readFileSync(path, "utf-8");
}

describe("CursorStreamParser", () => {
  let parser: CursorStreamParser;

  beforeEach(() => {
    parser = new CursorStreamParser();
  });

  describe("basic parsing", () => {
    it("parses a simple system.init event", () => {
      const events: CursorSystemEvent[] = [];
      parser.on("systemInit", (e) => events.push(e));

      parser.feed('{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"abc","model":"gpt-5.2","permissionMode":"default"}\n');

      expect(events).toHaveLength(1);
      expect(events[0]!.session_id).toBe("abc");
      expect(events[0]!.model).toBe("gpt-5.2");
    });

    it("parses a result event", () => {
      const events: CursorResultEvent[] = [];
      parser.on("result", (e) => events.push(e));

      parser.feed('{"type":"result","subtype":"success","duration_ms":5000,"is_error":false,"result":"Hello","session_id":"abc"}\n');

      expect(events).toHaveLength(1);
      expect(events[0]!.result).toBe("Hello");
      expect(events[0]!.duration_ms).toBe(5000);
    });
  });

  describe("real fixture parsing — hello-response.ndjson", () => {
    it("emits correct event sequence", () => {
      const allEvents: unknown[] = [];
      const systemEvents: CursorSystemEvent[] = [];
      const deltaEvents: CursorAssistantEvent[] = [];
      const completeEvents: CursorAssistantEvent[] = [];
      const resultEvents: CursorResultEvent[] = [];

      parser.on("event", (e) => allEvents.push(e));
      parser.on("systemInit", (e) => systemEvents.push(e));
      parser.on("assistantDelta", (e) => deltaEvents.push(e));
      parser.on("assistantComplete", (e) => completeEvents.push(e));
      parser.on("result", (e) => resultEvents.push(e));

      const fixture = loadNdjsonFixture("hello-response.ndjson");
      parser.feed(fixture);
      parser.flush();

      expect(systemEvents).toHaveLength(1);
      expect(systemEvents[0]!.model).toBe("Claude 4.6 Opus (Thinking)");
      expect(deltaEvents.length).toBeGreaterThan(0);
      expect(completeEvents).toHaveLength(1);
      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0]!.is_error).toBe(false);

      // Total events: 1 system + 1 user + N delta + 1 complete + 1 result
      expect(allEvents.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("real fixture parsing — tool-use-response.ndjson", () => {
    it("emits tool call events", () => {
      const startedEvents: CursorToolCallStartedEvent[] = [];
      const completedEvents: CursorToolCallCompletedEvent[] = [];
      const resultEvents: CursorResultEvent[] = [];

      parser.on("toolCallStarted", (e) => startedEvents.push(e));
      parser.on("toolCallCompleted", (e) => completedEvents.push(e));
      parser.on("result", (e) => resultEvents.push(e));

      const fixture = loadNdjsonFixture("tool-use-response.ndjson");
      parser.feed(fixture);
      parser.flush();

      expect(startedEvents.length).toBeGreaterThan(0);
      expect(completedEvents.length).toBeGreaterThan(0);
      expect(startedEvents.length).toBe(completedEvents.length);
      expect(resultEvents).toHaveLength(1);
    });

    it("tool call events have matching call_ids", () => {
      const startedEvents: CursorToolCallStartedEvent[] = [];
      const completedEvents: CursorToolCallCompletedEvent[] = [];

      parser.on("toolCallStarted", (e) => startedEvents.push(e));
      parser.on("toolCallCompleted", (e) => completedEvents.push(e));

      const fixture = loadNdjsonFixture("tool-use-response.ndjson");
      parser.feed(fixture);
      parser.flush();

      for (const started of startedEvents) {
        const matching = completedEvents.find((c) => c.call_id === started.call_id);
        expect(matching).toBeDefined();
      }
    });
  });

  describe("partial line buffering", () => {
    it("handles lines split across chunks", () => {
      const events: CursorSystemEvent[] = [];
      parser.on("systemInit", (e) => events.push(e));

      const fullLine = '{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"abc","model":"gpt-5","permissionMode":"default"}\n';
      const splitPoint = Math.floor(fullLine.length / 2);

      parser.feed(fullLine.slice(0, splitPoint));
      expect(events).toHaveLength(0);

      parser.feed(fullLine.slice(splitPoint));
      expect(events).toHaveLength(1);
    });

    it("handles multiple lines in one chunk", () => {
      const allEvents: unknown[] = [];
      parser.on("event", (e) => allEvents.push(e));

      const twoLines =
        '{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"abc","model":"gpt-5","permissionMode":"default"}\n' +
        '{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}\n';

      parser.feed(twoLines);
      expect(allEvents).toHaveLength(2);
    });

    it("flush() processes remaining buffered data", () => {
      const events: CursorResultEvent[] = [];
      parser.on("result", (e) => events.push(e));

      // Feed without trailing newline
      parser.feed('{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}');
      expect(events).toHaveLength(0);

      parser.flush();
      expect(events).toHaveLength(1);
    });
  });

  describe("error recovery", () => {
    it("skips malformed JSON and continues", () => {
      const events: unknown[] = [];
      const errors: Error[] = [];

      parser.on("event", (e) => events.push(e));
      parser.on("parseError", (e) => errors.push(e));

      parser.feed('not valid json\n{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}\n');

      expect(errors).toHaveLength(1);
      expect(events).toHaveLength(1);
    });

    it("skips non-object JSON values", () => {
      const errors: Error[] = [];
      parser.on("parseError", (e) => errors.push(e));

      parser.feed('"just a string"\n42\nnull\n');
      expect(errors).toHaveLength(3);
    });

    it("skips empty lines", () => {
      const events: unknown[] = [];
      parser.on("event", (e) => events.push(e));

      parser.feed('\n\n  \n{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}\n\n');
      expect(events).toHaveLength(1);
    });

    it("skips unknown event types without error", () => {
      const events: unknown[] = [];
      const errors: Error[] = [];

      parser.on("event", (e) => events.push(e));
      parser.on("parseError", (e) => errors.push(e));

      parser.feed('{"type":"unknown_type","data":"some data"}\n');
      expect(events).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });
  });

  describe("backpressure", () => {
    it("pause() buffers incoming lines", () => {
      const events: unknown[] = [];
      parser.on("event", (e) => events.push(e));

      parser.pause();
      expect(parser.isPaused).toBe(true);

      parser.feed('{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}\n');
      expect(events).toHaveLength(0);
      expect(parser.pausedLineCount).toBe(1);
    });

    it("resume() processes paused lines", () => {
      const events: unknown[] = [];
      parser.on("event", (e) => events.push(e));

      parser.pause();
      parser.feed('{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}\n');
      expect(events).toHaveLength(0);

      parser.resume();
      expect(parser.isPaused).toBe(false);
      expect(events).toHaveLength(1);
      expect(parser.pausedLineCount).toBe(0);
    });
  });

  describe("output size limit", () => {
    it("emits outputTruncated when limit exceeded", () => {
      const truncatedEvents: Array<{ size: number; limit: number }> = [];
      const smallParser = new CursorStreamParser({ maxOutputSize: 50 });

      smallParser.on("outputTruncated", (size, limit) => {
        truncatedEvents.push({ size, limit });
      });

      // Feed enough assistant text to exceed 50 bytes
      const longText = "A".repeat(60);
      smallParser.feed(`{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"${longText}"}]},"session_id":"abc","timestamp_ms":1000}\n`);

      expect(truncatedEvents).toHaveLength(1);
      expect(truncatedEvents[0]!.limit).toBe(50);
      expect(smallParser.isOutputTruncated).toBe(true);
    });

    it("only emits truncation once", () => {
      let truncateCount = 0;
      const smallParser = new CursorStreamParser({ maxOutputSize: 10 });
      smallParser.on("outputTruncated", () => truncateCount++);

      smallParser.feed(`{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello World"}]},"session_id":"abc","timestamp_ms":1}\n`);
      smallParser.feed(`{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"More text here"}]},"session_id":"abc","timestamp_ms":2}\n`);

      expect(truncateCount).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      const smallParser = new CursorStreamParser({ maxOutputSize: 10 });

      smallParser.feed(`{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello World"}]},"session_id":"abc","timestamp_ms":1}\n`);
      expect(smallParser.isOutputTruncated).toBe(true);

      smallParser.reset();
      expect(smallParser.isOutputTruncated).toBe(false);
      expect(smallParser.currentOutputSize).toBe(0);
      expect(smallParser.isPaused).toBe(false);
    });
  });

  describe("createStdoutHandler", () => {
    it("creates a handler that feeds parser", () => {
      const events: CursorResultEvent[] = [];
      parser.on("result", (e) => events.push(e));

      const handler = createStdoutHandler(parser);
      handler(Buffer.from('{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"abc"}\n'));

      expect(events).toHaveLength(1);
    });
  });

  describe("streaming delta accumulation", () => {
    it("distinguishes deltas (with timestamp_ms) from complete (without)", () => {
      const deltas: CursorAssistantEvent[] = [];
      const completes: CursorAssistantEvent[] = [];

      parser.on("assistantDelta", (e) => deltas.push(e));
      parser.on("assistantComplete", (e) => completes.push(e));

      parser.feed('{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi"}]},"session_id":"s1","timestamp_ms":1000}\n');
      parser.feed('{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi there"}]},"session_id":"s1"}\n');

      expect(deltas).toHaveLength(1);
      expect(completes).toHaveLength(1);
    });
  });
});

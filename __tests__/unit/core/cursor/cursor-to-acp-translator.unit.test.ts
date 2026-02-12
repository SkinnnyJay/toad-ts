import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { CursorStreamParser } from "@/core/cursor/cursor-stream-parser";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import { STREAM_EVENT_TYPE } from "@/types/cli-agent.types";
import { beforeEach, describe, expect, it } from "vitest";

function loadNdjsonFixture(name: string): string {
  const path = resolve(__dirname, "../../../fixtures/cursor/ndjson", name);
  return readFileSync(path, "utf-8");
}

describe("CursorToAcpTranslator", () => {
  let parser: CursorStreamParser;
  let translator: CursorToAcpTranslator;

  beforeEach(() => {
    parser = new CursorStreamParser();
    translator = new CursorToAcpTranslator();
    translator.attach(parser);
  });

  describe("system.init → state + sessionId", () => {
    it("emits CONNECTED state on system.init", () => {
      const states: string[] = [];
      translator.on("state", (s) => states.push(s));

      parser.feed(
        '{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"abc","model":"gpt-5","permissionMode":"default"}\n'
      );

      expect(states).toEqual([CONNECTION_STATUS.CONNECTED]);
      expect(translator.sessionId).toBe("abc");
    });

    it("emits SESSION_INIT stream event", () => {
      const events: unknown[] = [];
      translator.on("streamEvent", (e) => events.push(e));

      parser.feed(
        '{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"abc","model":"gpt-5","permissionMode":"default"}\n'
      );

      expect(events).toHaveLength(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe(STREAM_EVENT_TYPE.SESSION_INIT);
      expect(event.sessionId).toBe("abc");
      expect(event.model).toBe("gpt-5");
    });
  });

  describe("assistant deltas → sessionUpdate", () => {
    it("emits AGENT_MESSAGE_CHUNK for streaming deltas", () => {
      const updates: unknown[] = [];
      translator.on("sessionUpdate", (u) => updates.push(u));

      parser.feed(
        '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello"}]},"session_id":"s1","timestamp_ms":1000}\n'
      );

      expect(updates).toHaveLength(1);
      const update = updates[0] as Record<string, unknown>;
      const inner = (update as Record<string, Record<string, unknown>>).update;
      expect(inner.sessionUpdate).toBe(SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    });

    it("emits TEXT_DELTA stream event for deltas", () => {
      const events: unknown[] = [];
      translator.on("streamEvent", (e) => events.push(e));

      parser.feed(
        '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi"}]},"session_id":"s1","timestamp_ms":1000}\n'
      );

      expect(events).toHaveLength(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe(STREAM_EVENT_TYPE.TEXT_DELTA);
      expect(event.text).toBe("Hi");
    });
  });

  describe("assistant complete → sessionUpdate with isFinal", () => {
    it("emits final message with isFinal metadata", () => {
      const updates: unknown[] = [];
      translator.on("sessionUpdate", (u) => updates.push(u));

      parser.feed(
        '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Full message"}]},"session_id":"s1"}\n'
      );

      expect(updates).toHaveLength(1);
      const update = updates[0] as Record<string, Record<string, Record<string, unknown>>>;
      expect(update.update.metadata.isFinal).toBe(true);
    });

    it("emits TEXT_COMPLETE stream event", () => {
      const events: unknown[] = [];
      translator.on("streamEvent", (e) => events.push(e));

      parser.feed(
        '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Full"}]},"session_id":"s1"}\n'
      );

      expect(events).toHaveLength(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe(STREAM_EVENT_TYPE.TEXT_COMPLETE);
    });
  });

  describe("tool_call.started → sessionUpdate", () => {
    it("emits TOOL_CALL notification", () => {
      const updates: unknown[] = [];
      translator.on("sessionUpdate", (u) => updates.push(u));

      parser.feed(
        '{"type":"tool_call","subtype":"started","call_id":"t1","tool_call":{"readToolCall":{"args":{"path":"/file.txt"}}},"session_id":"s1"}\n'
      );

      expect(updates).toHaveLength(1);
      const update = updates[0] as Record<string, Record<string, Record<string, unknown>>>;
      expect(update.update.sessionUpdate).toBe(SESSION_UPDATE_TYPE.TOOL_CALL);
      expect(update.update.toolCall.toolName).toBe("read_file");
      expect(translator.totalToolCalls).toBe(1);
    });

    it("emits TOOL_START stream event", () => {
      const events: unknown[] = [];
      translator.on("streamEvent", (e) => events.push(e));

      parser.feed(
        '{"type":"tool_call","subtype":"started","call_id":"t1","tool_call":{"shellToolCall":{"args":{"command":"ls -la"}}},"session_id":"s1"}\n'
      );

      expect(events).toHaveLength(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe(STREAM_EVENT_TYPE.TOOL_START);
      expect(event.toolName).toBe("shell");
      expect(event.toolCallId).toBe("t1");
    });
  });

  describe("tool_call.completed → sessionUpdate", () => {
    it("emits TOOL_CALL_UPDATE notification", () => {
      const updates: unknown[] = [];
      translator.on("sessionUpdate", (u) => updates.push(u));

      parser.feed(
        '{"type":"tool_call","subtype":"completed","call_id":"t1","tool_call":{"readToolCall":{"args":{"path":"/file.txt"},"result":{"success":{"content":"file content"}}}},"session_id":"s1"}\n'
      );

      expect(updates).toHaveLength(1);
      const update = updates[0] as Record<string, Record<string, Record<string, unknown>>>;
      expect(update.update.sessionUpdate).toBe(SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE);
      expect(update.update.toolCallUpdate.status).toBe("completed");
    });

    it("emits TOOL_COMPLETE stream event", () => {
      const events: unknown[] = [];
      translator.on("streamEvent", (e) => events.push(e));

      parser.feed(
        '{"type":"tool_call","subtype":"completed","call_id":"t1","tool_call":{"readToolCall":{"args":{"path":"/f.txt"},"result":{"success":{"content":"data"}}}},"session_id":"s1"}\n'
      );

      expect(events).toHaveLength(1);
      const event = events[0] as Record<string, unknown>;
      expect(event.type).toBe(STREAM_EVENT_TYPE.TOOL_COMPLETE);
      expect(event.success).toBe(true);
    });
  });

  describe("result → promptResult", () => {
    it("emits promptResult on result event", () => {
      const results: unknown[] = [];
      translator.on("promptResult", (r) => results.push(r));

      parser.feed(
        '{"type":"result","subtype":"success","duration_ms":5000,"is_error":false,"result":"Done!","session_id":"s1"}\n'
      );

      expect(results).toHaveLength(1);
      const result = results[0] as Record<string, unknown>;
      expect(result.text).toBe("Done!");
      expect(result.durationMs).toBe(5000);
      expect(result.isError).toBe(false);
    });
  });

  describe("error handling", () => {
    it("emits error on parse errors", () => {
      const errors: Error[] = [];
      translator.on("error", (e) => errors.push(e));

      parser.feed("not json\n");
      expect(errors).toHaveLength(1);
    });
  });

  describe("tool result truncation", () => {
    it("truncates large tool results", () => {
      const events: unknown[] = [];
      const smallTranslator = new CursorToAcpTranslator({ maxToolResultSize: 50 });
      smallTranslator.attach(parser);
      smallTranslator.on("streamEvent", (e) => events.push(e));

      const largeContent = "A".repeat(200);
      parser.feed(
        `{"type":"tool_call","subtype":"completed","call_id":"t1","tool_call":{"readToolCall":{"args":{"path":"/f.txt"},"result":{"success":{"content":"${largeContent}"}}}},"session_id":"s1"}\n`
      );

      expect(events).toHaveLength(1);
      const event = events[0] as Record<string, Record<string, unknown>>;
      const result = event.result as Record<string, unknown>;
      expect(result._truncated).toBe(true);
    });
  });

  describe("full fixture integration", () => {
    it("processes hello-response.ndjson end-to-end", () => {
      const states: string[] = [];
      const updates: unknown[] = [];
      const results: unknown[] = [];

      translator.on("state", (s) => states.push(s));
      translator.on("sessionUpdate", (u) => updates.push(u));
      translator.on("promptResult", (r) => results.push(r));

      const fixture = loadNdjsonFixture("hello-response.ndjson");
      parser.feed(fixture);
      parser.flush();

      expect(states).toContain(CONNECTION_STATUS.CONNECTED);
      expect(updates.length).toBeGreaterThan(0);
      expect(results).toHaveLength(1);
      expect(translator.sessionId).toBeDefined();
    });

    it("processes tool-use-response.ndjson end-to-end", () => {
      const updates: unknown[] = [];
      const results: unknown[] = [];
      const streamEvents: unknown[] = [];

      translator.on("sessionUpdate", (u) => updates.push(u));
      translator.on("promptResult", (r) => results.push(r));
      translator.on("streamEvent", (e) => streamEvents.push(e));

      const fixture = loadNdjsonFixture("tool-use-response.ndjson");
      parser.feed(fixture);
      parser.flush();

      expect(updates.length).toBeGreaterThan(0);
      expect(results).toHaveLength(1);
      expect(translator.totalToolCalls).toBeGreaterThan(0);

      // Check that we got tool events
      const toolStarts = streamEvents.filter(
        (e) => (e as Record<string, unknown>).type === STREAM_EVENT_TYPE.TOOL_START
      );
      const toolCompletes = streamEvents.filter(
        (e) => (e as Record<string, unknown>).type === STREAM_EVENT_TYPE.TOOL_COMPLETE
      );
      expect(toolStarts.length).toBeGreaterThan(0);
      expect(toolCompletes.length).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears state", () => {
      parser.feed(
        '{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/test","session_id":"abc","model":"gpt-5","permissionMode":"default"}\n'
      );
      expect(translator.sessionId).toBe("abc");

      translator.reset();
      expect(translator.sessionId).toBeNull();
      expect(translator.totalToolCalls).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("attach returns cleanup function", () => {
      const newParser = new CursorStreamParser();
      const newTranslator = new CursorToAcpTranslator();
      const cleanup = newTranslator.attach(newParser);

      const events: unknown[] = [];
      newTranslator.on("streamEvent", (e) => events.push(e));

      newParser.feed(
        '{"type":"result","subtype":"success","duration_ms":100,"is_error":false,"result":"ok","session_id":"s1"}\n'
      );
      expect(events).toHaveLength(1);

      cleanup();

      newParser.feed(
        '{"type":"result","subtype":"success","duration_ms":200,"is_error":false,"result":"ok2","session_id":"s1"}\n'
      );
      // After cleanup, no new events should be emitted
      expect(events).toHaveLength(1);
    });
  });
});

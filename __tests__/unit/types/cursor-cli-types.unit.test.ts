import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURSOR_STREAM_SUBTYPE,
  CURSOR_STREAM_TYPE,
} from "../../../src/constants/cursor-event-types";
import { ENCODING } from "../../../src/constants/encodings";
import {
  CursorAssistantEventSchema,
  CursorResultEventSchema,
  CursorStreamEventSchema,
  CursorSystemEventSchema,
  CursorToolCallCompletedEventSchema,
  CursorToolCallStartedEventSchema,
  CursorUserEventSchema,
} from "../../../src/types/cursor-cli.types";

const fixturesDir = path.join(process.cwd(), "__tests__", "fixtures", "cursor", "ndjson");

const readFixtureLines = async (fileName: string): Promise<string[]> => {
  const fixturePath = path.join(fixturesDir, fileName);
  const raw = await readFile(fixturePath, ENCODING.UTF8);
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

describe("cursor-cli.types schemas", () => {
  it("parses hello-response NDJSON fixture lines", async () => {
    const lines = await readFixtureLines("hello-response.ndjson");
    const parsed = lines.map((line) => CursorStreamEventSchema.parse(JSON.parse(line)));

    expect(parsed.length).toBeGreaterThan(5);
    expect(parsed.some((entry) => entry.type === CURSOR_STREAM_TYPE.SYSTEM)).toBe(true);
    expect(parsed.some((entry) => entry.type === CURSOR_STREAM_TYPE.RESULT)).toBe(true);
  });

  it("parses tool-use NDJSON fixture lines", async () => {
    const lines = await readFixtureLines("tool-use-response.ndjson");
    const parsed = lines.map((line) => CursorStreamEventSchema.parse(JSON.parse(line)));

    const startedCount = parsed.filter(
      (entry) =>
        entry.type === CURSOR_STREAM_TYPE.TOOL_CALL &&
        entry.subtype === CURSOR_STREAM_SUBTYPE.STARTED
    ).length;
    const completedCount = parsed.filter(
      (entry) =>
        entry.type === CURSOR_STREAM_TYPE.TOOL_CALL &&
        entry.subtype === CURSOR_STREAM_SUBTYPE.COMPLETED
    ).length;

    expect(startedCount).toBeGreaterThanOrEqual(1);
    expect(completedCount).toBeGreaterThanOrEqual(1);
  });

  it("validates specific event schemas", () => {
    const sessionId = "14855632-18d5-44a3-ab27-5c93e95a8011";
    const system = CursorSystemEventSchema.parse({
      type: CURSOR_STREAM_TYPE.SYSTEM,
      subtype: CURSOR_STREAM_SUBTYPE.INIT,
      cwd: "/workspace",
      session_id: sessionId,
      model: "opus-4.6-thinking",
    });
    const user = CursorUserEventSchema.parse({
      type: CURSOR_STREAM_TYPE.USER,
      session_id: sessionId,
      message: {
        role: "user",
        content: [{ type: "text", text: "hello" }],
      },
    });
    const assistant = CursorAssistantEventSchema.parse({
      type: CURSOR_STREAM_TYPE.ASSISTANT,
      session_id: sessionId,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "world" }],
      },
      timestamp_ms: 1,
    });
    const started = CursorToolCallStartedEventSchema.parse({
      type: CURSOR_STREAM_TYPE.TOOL_CALL,
      subtype: CURSOR_STREAM_SUBTYPE.STARTED,
      call_id: "call-1",
      tool_call: { readToolCall: { args: { path: "/tmp/a.txt" } } },
      session_id: sessionId,
    });
    const completed = CursorToolCallCompletedEventSchema.parse({
      type: CURSOR_STREAM_TYPE.TOOL_CALL,
      subtype: CURSOR_STREAM_SUBTYPE.COMPLETED,
      call_id: "call-1",
      tool_call: { readToolCall: { result: { success: { content: "a" } } } },
      session_id: sessionId,
    });
    const result = CursorResultEventSchema.parse({
      type: CURSOR_STREAM_TYPE.RESULT,
      subtype: CURSOR_STREAM_SUBTYPE.SUCCESS,
      duration_ms: 1,
      is_error: false,
      result: "done",
      session_id: sessionId,
    });

    expect(system.model).toBe("opus-4.6-thinking");
    expect(user.message.role).toBe("user");
    expect(assistant.message.role).toBe("assistant");
    expect(started.call_id).toBe("call-1");
    expect(completed.call_id).toBe("call-1");
    expect(result.result).toBe("done");
  });
});

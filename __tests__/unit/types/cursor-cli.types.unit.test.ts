import { readFileSync } from "node:fs";
import path from "node:path";
import { CURSOR_EVENT_TYPE } from "@/constants/cursor-event-types";
import {
  cursorAssistantEvent,
  cursorResultErrorEvent,
  cursorStreamEvent,
  cursorSystemEvent,
  cursorToolCallCompletedEvent,
  cursorToolCallStartedEvent,
  cursorUserEvent,
} from "@/types/cursor-cli.types";
import { describe, expect, it } from "vitest";

const readFixtureLines = (fixturePath: string): string[] => {
  const absolutePath = path.join(process.cwd(), fixturePath);
  const raw = readFileSync(absolutePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

describe("cursor-cli types", () => {
  it("parses all events from hello fixture", () => {
    const lines = readFixtureLines("__tests__/fixtures/cursor/ndjson/hello-response.ndjson");
    const events = lines.map((line) => cursorStreamEvent.parse(JSON.parse(line)));

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((event) => event.type === CURSOR_EVENT_TYPE.SYSTEM)).toBe(true);
    expect(events.some((event) => event.type === CURSOR_EVENT_TYPE.USER)).toBe(true);
    expect(events.some((event) => event.type === CURSOR_EVENT_TYPE.ASSISTANT)).toBe(true);
    expect(events.some((event) => event.type === CURSOR_EVENT_TYPE.RESULT)).toBe(true);
  });

  it("parses all events from tool-use fixture", () => {
    const lines = readFixtureLines("__tests__/fixtures/cursor/ndjson/tool-use-response.ndjson");
    const events = lines.map((line) => cursorStreamEvent.parse(JSON.parse(line)));

    expect(events.length).toBeGreaterThan(0);
    expect(
      events.filter((event) => event.type === CURSOR_EVENT_TYPE.TOOL_CALL).length
    ).toBeGreaterThan(0);
  });

  it("exposes specific event schemas", () => {
    expect(cursorSystemEvent.safeParse({ type: "system", subtype: "init" }).success).toBe(false);
    expect(cursorUserEvent.safeParse({ type: "user" }).success).toBe(false);
    expect(cursorAssistantEvent.safeParse({ type: "assistant" }).success).toBe(false);
    expect(cursorToolCallStartedEvent.safeParse({ type: "tool_call" }).success).toBe(false);
    expect(cursorToolCallCompletedEvent.safeParse({ type: "tool_call" }).success).toBe(false);
  });

  it("parses result.error events", () => {
    const event = cursorResultErrorEvent.parse({
      type: "result",
      subtype: "error",
      session_id: "session-1",
      error: "Something failed",
      is_error: true,
    });

    expect(event.subtype).toBe("error");
    expect(event.session_id).toBe("session-1");
  });

  it("rejects malformed stream events", () => {
    const parsed = cursorStreamEvent.safeParse({
      type: "not-an-event",
      foo: "bar",
    });
    expect(parsed.success).toBe(false);
  });
});

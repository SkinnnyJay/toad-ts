import { describe, expect, it } from "vitest";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import {
  CURSOR_STREAM_SUBTYPE,
  CURSOR_STREAM_TYPE,
} from "../../../src/constants/cursor-event-types";
import { SESSION_UPDATE_TYPE } from "../../../src/constants/session-update-types";
import {
  CURSOR_TRANSLATOR_DEFAULT,
  CursorToAcpTranslator,
} from "../../../src/core/cursor/cursor-to-acp-translator";
import type { CursorStreamEvent } from "../../../src/types/cursor-cli.types";

const sessionId = "14855632-18d5-44a3-ab27-5c93e95a8011";

describe("CursorToAcpTranslator", () => {
  it("maps system/user/assistant/result events", () => {
    const translator = new CursorToAcpTranslator();
    const initialized: Array<{ sessionId: string; model: string }> = [];
    const updates: Array<{ sessionUpdate: string; text?: string }> = [];
    const results: string[] = [];

    translator.on("initialized", (event) => {
      initialized.push({ sessionId: event.sessionId, model: event.model });
    });
    translator.on("sessionUpdate", (event) => {
      if ("content" in event.update) {
        updates.push({
          sessionUpdate: event.update.sessionUpdate,
          text:
            event.update.content.type === CONTENT_BLOCK_TYPE.TEXT
              ? event.update.content.text
              : undefined,
        });
      }
    });
    translator.on("result", (result) => {
      results.push(result.text);
    });

    const events: CursorStreamEvent[] = [
      {
        type: CURSOR_STREAM_TYPE.SYSTEM,
        subtype: CURSOR_STREAM_SUBTYPE.INIT,
        cwd: "/workspace",
        session_id: sessionId,
        model: "opus-4.6-thinking",
      },
      {
        type: CURSOR_STREAM_TYPE.USER,
        session_id: sessionId,
        message: {
          role: "user",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" }],
        },
      },
      {
        type: CURSOR_STREAM_TYPE.ASSISTANT,
        session_id: sessionId,
        message: {
          role: "assistant",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hi there" }],
        },
      },
      {
        type: CURSOR_STREAM_TYPE.RESULT,
        subtype: CURSOR_STREAM_SUBTYPE.SUCCESS,
        duration_ms: 11,
        is_error: false,
        result: "hi there",
        session_id: sessionId,
      },
    ];

    events.forEach((event) => translator.translate(event));

    expect(initialized).toEqual([{ sessionId, model: "opus-4.6-thinking" }]);
    expect(updates).toEqual([
      { sessionUpdate: SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK, text: "hello" },
      { sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK, text: "hi there" },
    ]);
    expect(results).toEqual(["hi there"]);
  });

  it("maps tool start and completion updates", () => {
    const translator = new CursorToAcpTranslator();
    const updates: Array<{ sessionUpdate: string; title?: string; status?: string }> = [];
    translator.on("sessionUpdate", (event) => {
      if ("toolCallId" in event.update) {
        updates.push({
          sessionUpdate: event.update.sessionUpdate,
          title: event.update.title,
          status: event.update.status,
        });
      }
    });

    translator.translate({
      type: CURSOR_STREAM_TYPE.TOOL_CALL,
      subtype: CURSOR_STREAM_SUBTYPE.STARTED,
      call_id: "call-1",
      session_id: sessionId,
      tool_call: {
        readToolCall: {
          args: { path: "/workspace/package.json" },
        },
      },
    });
    translator.translate({
      type: CURSOR_STREAM_TYPE.TOOL_CALL,
      subtype: CURSOR_STREAM_SUBTYPE.COMPLETED,
      call_id: "call-1",
      session_id: sessionId,
      tool_call: {
        readToolCall: {
          args: { path: "/workspace/package.json" },
          result: { success: { content: "ok" } },
        },
      },
    });

    expect(updates).toHaveLength(2);
    expect(updates[0]?.sessionUpdate).toBe(SESSION_UPDATE_TYPE.TOOL_CALL);
    expect(updates[0]?.title).toBe("read_file");
    expect(updates[0]?.status).toBe("in_progress");
    expect(updates[1]?.sessionUpdate).toBe(SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE);
    expect(updates[1]?.status).toBe("completed");
  });

  it("truncates oversized tool outputs and emits truncation metadata", () => {
    const translator = new CursorToAcpTranslator({ toolResultMaxBytes: 8 });
    const truncations: Array<{ toolCallId: string; originalBytes: number }> = [];
    const outputs: string[] = [];

    translator.on("toolResultTruncated", (event) => {
      truncations.push({ toolCallId: event.toolCallId, originalBytes: event.originalBytes });
    });
    translator.on("sessionUpdate", (event) => {
      if ("rawOutput" in event.update && typeof event.update.rawOutput === "string") {
        outputs.push(event.update.rawOutput);
      }
    });

    translator.translate({
      type: CURSOR_STREAM_TYPE.TOOL_CALL,
      subtype: CURSOR_STREAM_SUBTYPE.COMPLETED,
      call_id: "call-2",
      session_id: sessionId,
      tool_call: {
        shellToolCall: {
          args: { command: "echo hi" },
          result: {
            success: {
              output: "abcdefghijklmnopqrstuvwxyz",
            },
          },
        },
      },
    });

    expect(truncations).toHaveLength(1);
    expect(truncations[0]?.toolCallId).toBe("call-2");
    expect(outputs).toHaveLength(1);
    expect(outputs[0]?.length).toBeLessThanOrEqual(8);
    expect(CURSOR_TRANSLATOR_DEFAULT.TOOL_RESULT_MAX_BYTES).toBe(50 * 1024);
  });
});

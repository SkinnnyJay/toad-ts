import { readFileSync } from "node:fs";
import path from "node:path";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { CursorToAcpTranslator } from "@/core/cursor/cursor-to-acp-translator";
import { cursorStreamEvent } from "@/types/cursor-cli.types";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { describe, expect, it } from "vitest";

const readFixtureEvents = (relativePath: string) => {
  const raw = readFileSync(path.join(process.cwd(), relativePath), "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => cursorStreamEvent.parse(JSON.parse(line)));
};

describe("CursorToAcpTranslator", () => {
  it("translates NDJSON fixture sequence into ACP updates and result", () => {
    const events = readFixtureEvents("__tests__/fixtures/cursor/ndjson/tool-use-response.ndjson");
    const translator = new CursorToAcpTranslator();
    const updates: SessionNotification[] = [];
    const results: Array<{ sessionId: string; text: string; isError: boolean }> = [];
    const initialized: Array<{ sessionId: string; model: string; cwd: string }> = [];

    translator.on("sessionUpdate", (update) => updates.push(update));
    translator.on("result", (result) => results.push(result));
    translator.on("initialized", (payload) => initialized.push(payload));

    for (const event of events) {
      translator.handleEvent(event);
    }

    expect(initialized).toHaveLength(1);
    expect(initialized[0]?.sessionId).toBe("14855632-18d5-44a3-ab27-5c93e95a8011");
    expect(
      updates.some(
        (update) => update.update.sessionUpdate === SESSION_UPDATE_TYPE.USER_MESSAGE_CHUNK
      )
    ).toBe(true);
    expect(
      updates.some(
        (update) => update.update.sessionUpdate === SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK
      )
    ).toBe(true);
    expect(
      updates.some((update) => update.update.sessionUpdate === SESSION_UPDATE_TYPE.TOOL_CALL)
    ).toBe(true);
    expect(
      updates.some((update) => update.update.sessionUpdate === SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE)
    ).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0]?.text).toContain("one-line summary");
    expect(results[0]?.isError).toBe(false);
  });

  it("truncates large tool results and emits truncation event", () => {
    const translator = new CursorToAcpTranslator({ maxToolResultBytes: 30 });
    const updates: SessionNotification[] = [];
    const truncations: Array<{ callId: string; originalBytes: number; maxBytes: number }> = [];

    translator.on("sessionUpdate", (update) => updates.push(update));
    translator.on("toolResultTruncated", (payload) => truncations.push(payload));

    const event = cursorStreamEvent.parse({
      type: "tool_call",
      subtype: "completed",
      call_id: "tool-call-1",
      session_id: "session-1",
      tool_call: {
        readToolCall: {
          args: { path: "README.md" },
          result: {
            success: {
              content: "x".repeat(500),
            },
          },
        },
      },
    });

    translator.handleEvent(event);

    expect(truncations).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.update.sessionUpdate).toBe(SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE);
    expect(updates[0]?.update.rawOutput).toMatchObject({
      truncated: true,
    });
  });

  it("emits errors for process failures", () => {
    const translator = new CursorToAcpTranslator();
    const errors: Error[] = [];
    translator.on("error", (error) => errors.push(error));

    translator.handleProcessError(new Error("process crashed"));
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("process crashed");
  });
});

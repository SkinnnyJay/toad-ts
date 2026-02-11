import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { CliAgentBridge } from "@/core/cli-agent/cli-agent.bridge";
import { STREAM_EVENT_TYPE } from "@/types/cli-agent.types";
import { describe, expect, it } from "vitest";

describe("CliAgentBridge", () => {
  it("maps text delta events to agent message chunks", () => {
    const bridge = new CliAgentBridge();
    const sessionUpdates: string[] = [];
    const chunks: string[] = [];

    bridge.on("sessionUpdate", (update) => {
      sessionUpdates.push(update.update.sessionUpdate);
      if (update.update.content?.type === CONTENT_BLOCK_TYPE.TEXT) {
        chunks.push(update.update.content.text);
      }
    });

    bridge.translate({
      type: STREAM_EVENT_TYPE.TEXT_DELTA,
      sessionId: "session-1",
      text: "hello",
    });

    expect(sessionUpdates).toContain(SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    expect(chunks).toEqual(["hello"]);
  });

  it("truncates oversized tool completion output", () => {
    const bridge = new CliAgentBridge({ toolResultMaxBytes: 4 });
    const truncations: number[] = [];
    let rawOutput: unknown;

    bridge.on("toolResultTruncated", (event) => {
      truncations.push(event.originalBytes);
    });
    bridge.on("sessionUpdate", (update) => {
      if (update.update.sessionUpdate === SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE) {
        rawOutput = update.update.rawOutput;
      }
    });

    bridge.translate({
      type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
      sessionId: "session-1",
      toolCallId: "tool-1",
      toolName: "read_file",
      success: true,
      result: "abcdef",
    });

    expect(truncations).toEqual([6]);
    expect(rawOutput).toBe("abcd");
  });

  it("emits permission request events", () => {
    const bridge = new CliAgentBridge();
    const requests: string[] = [];

    bridge.on("permissionRequest", (request) => {
      requests.push(request.requestId);
    });

    bridge.translate({
      type: STREAM_EVENT_TYPE.PERMISSION_REQUEST,
      sessionId: "session-1",
      requestId: "req-1",
      toolName: "shell",
      toolInput: { command: "ls" },
    });

    expect(requests).toEqual(["req-1"]);
  });
});

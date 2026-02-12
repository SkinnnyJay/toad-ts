import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { CliAgentBridge } from "@/core/cli-agent/cli-agent.bridge";
import { STREAM_EVENT_TYPE } from "@/types/cli-agent.types";
import { describe, expect, it } from "vitest";

describe("CliAgentBridge", () => {
  it("maps text and thinking deltas to session updates", () => {
    const bridge = new CliAgentBridge();
    const updates: Array<{ sessionId: string; type: string; text?: string }> = [];
    bridge.on("sessionUpdate", (update) =>
      updates.push({
        sessionId: update.sessionId,
        type: update.update.sessionUpdate,
        text:
          "content" in update.update && update.update.content?.type === "text"
            ? update.update.content.text
            : undefined,
      })
    );

    bridge.handleEvent({
      type: STREAM_EVENT_TYPE.TEXT_DELTA,
      sessionId: "session-1",
      delta: "hello",
    });
    bridge.handleEvent({
      type: STREAM_EVENT_TYPE.THINKING_DELTA,
      sessionId: "session-1",
      delta: "analyzing",
    });

    expect(updates).toHaveLength(2);
    expect(updates[0]?.type).toBe(SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    expect(updates[1]?.type).toBe(SESSION_UPDATE_TYPE.AGENT_THOUGHT_CHUNK);
  });

  it("maps tool lifecycle events to tool call updates", () => {
    const bridge = new CliAgentBridge();
    const updates: string[] = [];
    bridge.on("sessionUpdate", (update) => updates.push(update.update.sessionUpdate));

    bridge.handleEvent({
      type: STREAM_EVENT_TYPE.TOOL_START,
      sessionId: "session-1",
      toolCallId: "tool-1",
      name: "read_file",
      arguments: { path: "README.md" },
    });
    bridge.handleEvent({
      type: STREAM_EVENT_TYPE.TOOL_COMPLETE,
      sessionId: "session-1",
      toolCallId: "tool-1",
      status: TOOL_CALL_STATUS.SUCCEEDED,
      result: { ok: true },
    });

    expect(updates).toEqual([SESSION_UPDATE_TYPE.TOOL_CALL, SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE]);
  });

  it("maps permission requests and errors to bridge events", () => {
    const bridge = new CliAgentBridge();
    const requests: string[] = [];
    const errors: string[] = [];

    bridge.on("permissionRequest", (request) => {
      requests.push(request.toolCall?.kind ?? "none");
    });
    bridge.on("error", (error) => {
      errors.push(error.message);
    });

    bridge.handleEvent({
      type: STREAM_EVENT_TYPE.PERMISSION_REQUEST,
      sessionId: "session-1",
      requestId: "perm-1",
      toolName: "exec_bash",
      payload: { command: "echo hi" },
    });
    bridge.handleEvent({
      type: STREAM_EVENT_TYPE.ERROR,
      sessionId: "session-1",
      message: "boom",
    });

    expect(requests[0]).toBe("execute");
    expect(errors).toEqual(["boom"]);
  });
});

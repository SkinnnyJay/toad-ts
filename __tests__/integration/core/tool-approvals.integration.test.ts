import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTENT_BLOCK_TYPE } from "../../../src/constants/content-block-types";
import { PERMISSION } from "../../../src/constants/permissions";
import { TOOL_CALL_STATUS } from "../../../src/constants/tool-call-status";
import { useAppStore } from "../../../src/store/app-store";
import { MessageIdSchema, ToolCallIdSchema } from "../../../src/types/domain";
import { ToolCallManager } from "../../../src/ui/components/ToolCallManager";
import { cleanup, renderInk, setupSession, waitFor } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Tool approvals integration", () => {
  it("auto-approves terminal and filesystem tools when profiles allow", async () => {
    const sessionId = setupSession();
    const store = useAppStore.getState();
    const toolCallId1 = ToolCallIdSchema.parse("tool-exec");
    const toolCallId2 = ToolCallIdSchema.parse("tool-write");

    store.appendMessage({
      id: MessageIdSchema.parse("msg-tools"),
      sessionId,
      role: "assistant",
      content: [
        {
          type: CONTENT_BLOCK_TYPE.TOOL_CALL,
          toolCallId: toolCallId1,
          name: "exec_shell",
          arguments: { command: "echo hi" },
          status: TOOL_CALL_STATUS.PENDING,
        },
        {
          type: CONTENT_BLOCK_TYPE.TOOL_CALL,
          toolCallId: toolCallId2,
          name: "write_file",
          arguments: { path: "output.txt", content: "hi" },
          status: TOOL_CALL_STATUS.PENDING,
        },
      ],
      createdAt: Date.now(),
      isStreaming: false,
    });

    const onToolApproved = vi.fn();
    const { lastFrame } = renderInk(
      React.createElement(ToolCallManager, {
        permissionProfiles: {
          "exec_*": PERMISSION.ALLOW,
          "write_*": PERMISSION.ALLOW,
        },
        defaultPermission: PERMISSION.ASK,
        autoApproveTimeout: 1,
        onToolApproved,
      })
    );

    await waitFor(() => onToolApproved.mock.calls.length === 2, 500, 25);

    const frame = lastFrame();
    expect(frame).toContain("Active Tools");
    expect(frame).toContain("exec_shell");
    expect(frame).toContain("write_file");
  });

  it("denies tools immediately when permission profile is deny", async () => {
    const sessionId = setupSession();
    const store = useAppStore.getState();
    const toolCallId = ToolCallIdSchema.parse("tool-deny");

    store.appendMessage({
      id: MessageIdSchema.parse("msg-deny"),
      sessionId,
      role: "assistant",
      content: [
        {
          type: CONTENT_BLOCK_TYPE.TOOL_CALL,
          toolCallId,
          name: "exec_shell",
          arguments: { command: "rm -rf /" },
          status: TOOL_CALL_STATUS.PENDING,
        },
      ],
      createdAt: Date.now(),
      isStreaming: false,
    });

    const onToolDenied = vi.fn();
    const { lastFrame } = renderInk(
      React.createElement(ToolCallManager, {
        permissionProfiles: {
          "exec_*": PERMISSION.DENY,
        },
        defaultPermission: PERMISSION.ASK,
        onToolDenied,
      })
    );

    await waitFor(() => onToolDenied.mock.calls.length === 1, 500, 25);

    const frame = lastFrame();
    expect(frame).toContain("⊘");
    expect(frame).toContain("exec_shell");
  });

  it("shows failed tool calls in recent list", async () => {
    const sessionId = setupSession();
    const store = useAppStore.getState();
    const toolCallId = ToolCallIdSchema.parse("tool-fail");

    store.appendMessage({
      id: MessageIdSchema.parse("msg-fail"),
      sessionId,
      role: "assistant",
      content: [
        {
          type: CONTENT_BLOCK_TYPE.TOOL_CALL,
          toolCallId,
          name: "write_file",
          arguments: { path: "out.txt" },
          status: TOOL_CALL_STATUS.FAILED,
          result: "permission denied",
        },
      ],
      createdAt: Date.now(),
      isStreaming: false,
    });

    const { lastFrame } = renderInk(React.createElement(ToolCallManager, {}));

    await waitFor(() => lastFrame().includes("✗"), 500, 25);

    const frame = lastFrame();
    expect(frame).toContain("✗");
    expect(frame).toContain("write_file");
    expect(frame).toContain("permission denied");
  });
});

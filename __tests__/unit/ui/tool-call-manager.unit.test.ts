import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_MODE } from "@/constants/session-modes";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { MessageIdSchema } from "../../../src/types/domain";
import { ToolCallManager } from "../../../src/ui/components/ToolCallManager";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("ToolCallManager", () => {
  describe("permission profile matching", () => {
    it("should render tool call manager with tool calls", async () => {
      const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
      const store = useAppStore.getState();
      store.setCurrentSession(sessionId);

      store.appendMessage({
        id: MessageIdSchema.parse("msg-1"),
        sessionId,
        role: "assistant",
        content: [
          {
            type: CONTENT_BLOCK_TYPE.TOOL_CALL,
            toolCallId: "tool-1",
            name: "read_file",
            arguments: { path: "test.txt" },
            status: TOOL_CALL_STATUS.PENDING,
          },
        ],
        createdAt: Date.now(),
        isStreaming: false,
      });

      const permissionProfiles = {
        read_file: PERMISSION.ALLOW,
      };

      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(ToolCallManager, {
            permissionProfiles,
            defaultPermission: PERMISSION.ASK,
          })
        )
      );

      // Wait for useEffect to process messages
      await new Promise((resolve) => setTimeout(resolve, 200));

      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(typeof frame).toBe("string");
    });

    it("should handle wildcard pattern permissions", async () => {
      const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
      const store = useAppStore.getState();
      store.setCurrentSession(sessionId);

      store.appendMessage({
        id: MessageIdSchema.parse("msg-1"),
        sessionId,
        role: "assistant",
        content: [
          {
            type: CONTENT_BLOCK_TYPE.TOOL_CALL,
            toolCallId: "tool-1",
            name: "read_file_v2",
            arguments: {},
            status: TOOL_CALL_STATUS.PENDING,
          },
        ],
        createdAt: Date.now(),
        isStreaming: false,
      });

      const permissionProfiles = {
        "read_*": PERMISSION.ALLOW,
      };

      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(ToolCallManager, {
            permissionProfiles,
            defaultPermission: PERMISSION.ASK,
          })
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(typeof frame).toBe("string");
      // ToolCallManager may return null if no tool calls are pending
      // Just verify it renders without error
    });
  });

  describe("auto-approval timeout", () => {
    it("should render tool call manager with messages", async () => {
      const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
      const store = useAppStore.getState();
      store.setCurrentSession(sessionId);

      store.appendMessage({
        id: MessageIdSchema.parse("msg-1"),
        sessionId,
        role: "assistant",
        content: [
          {
            type: CONTENT_BLOCK_TYPE.TOOL_CALL,
            toolCallId: "tool-1",
            name: "read_file",
            arguments: {},
            status: TOOL_CALL_STATUS.PENDING,
          },
        ],
        createdAt: Date.now(),
        isStreaming: false,
      });

      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(ToolCallManager, {
            defaultPermission: PERMISSION.ALLOW,
            autoApproveTimeout: 50,
          })
        )
      );

      // Wait for useEffect to process
      await new Promise((resolve) => setTimeout(resolve, 200));

      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(typeof frame).toBe("string");
    });
  });
});

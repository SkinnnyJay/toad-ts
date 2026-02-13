import { TIMEOUT } from "@/config/timeouts";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { type Message, MessageIdSchema, SessionIdSchema, ToolCallIdSchema } from "@/types/domain";
import { type UseToolCallsResult, useToolCalls } from "@/ui/hooks/useToolCalls";
import React, { useEffect } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storeContext = vi.hoisted(() => ({
  state: {
    currentSessionId: "session-1",
    getMessagesForSession: (_sessionId: string): Message[] => [],
  },
}));

vi.mock("@/store/app-store", () => ({
  useAppStore: <T>(selector: (state: typeof storeContext.state) => T): T =>
    selector(storeContext.state),
}));

interface ToolCallsProbeProps {
  onApi: (api: UseToolCallsResult) => void;
}

const ToolCallsProbe = ({ onApi }: ToolCallsProbeProps): React.JSX.Element => {
  const api = useToolCalls();
  useEffect(() => {
    onApi(api);
  }, [api, onApi]);
  return React.createElement(React.Fragment);
};

const createMessageWithToolStatus = (status: string): Message => ({
  id: MessageIdSchema.parse("msg-1"),
  sessionId: SessionIdSchema.parse("session-1"),
  role: "assistant",
  content: [
    {
      type: CONTENT_BLOCK_TYPE.TOOL_CALL,
      toolCallId: ToolCallIdSchema.parse("tool-1"),
      name: "exec_shell",
      arguments: { command: "echo hi" },
      status,
    },
  ],
  createdAt: 1,
  isStreaming: false,
});

const createHarness = (): {
  getApi: () => UseToolCallsResult;
  rerender: () => void;
  unmount: () => void;
} => {
  let api: UseToolCallsResult | undefined;
  let renderer: ReactTestRenderer;

  const onApi = (nextApi: UseToolCallsResult): void => {
    api = nextApi;
  };

  act(() => {
    renderer = create(React.createElement(ToolCallsProbe, { onApi }));
  });

  const getApi = (): UseToolCallsResult => {
    if (!api) {
      throw new Error("Expected useToolCalls api to be initialized.");
    }
    return api;
  };

  return {
    getApi,
    rerender: () => {
      act(() => {
        renderer.update(React.createElement(ToolCallsProbe, { onApi }));
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
};

describe("useToolCalls behavior", () => {
  beforeEach(() => {
    storeContext.state.currentSessionId = "session-1";
    storeContext.state.getMessagesForSession = (_sessionId: string): Message[] => [];
    vi.useFakeTimers();
  });

  it("hydrates tool calls after throttle interval elapses", () => {
    storeContext.state.getMessagesForSession = () =>
      [createMessageWithToolStatus(TOOL_CALL_STATUS.PENDING)] satisfies Message[];
    const harness = createHarness();
    try {
      expect(harness.getApi().toolCalls.size).toBe(0);

      act(() => {
        vi.advanceTimersByTime(TIMEOUT.THROTTLE_MS - 1);
      });
      expect(harness.getApi().toolCalls.size).toBe(0);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      const toolId = ToolCallIdSchema.parse("tool-1");
      const tool = harness.getApi().toolCalls.get(toolId);
      expect(tool?.status).toBe(TOOL_CALL_STATUS.AWAITING_APPROVAL);
      expect(harness.getApi().pendingApprovals.has(toolId)).toBe(true);
    } finally {
      harness.unmount();
      vi.useRealTimers();
    }
  });

  it("updates existing tool call status across rerenders", () => {
    storeContext.state.getMessagesForSession = () =>
      [createMessageWithToolStatus(TOOL_CALL_STATUS.RUNNING)] satisfies Message[];
    const harness = createHarness();

    try {
      act(() => {
        vi.advanceTimersByTime(TIMEOUT.THROTTLE_MS);
      });
      const toolId = ToolCallIdSchema.parse("tool-1");
      expect(harness.getApi().toolCalls.get(toolId)?.status).toBe(TOOL_CALL_STATUS.RUNNING);

      storeContext.state.getMessagesForSession = () =>
        [createMessageWithToolStatus(TOOL_CALL_STATUS.SUCCEEDED)] satisfies Message[];
      harness.rerender();
      act(() => {
        vi.advanceTimersByTime(TIMEOUT.THROTTLE_MS);
      });

      const tool = harness.getApi().toolCalls.get(toolId);
      expect(tool?.status).toBe(TOOL_CALL_STATUS.SUCCEEDED);
      expect(tool?.completedAt).toBeInstanceOf(Date);
    } finally {
      harness.unmount();
      vi.useRealTimers();
    }
  });

  it("clears scheduled timeout when hook unmounts", () => {
    const getMessagesForSession = vi.fn(
      () => [createMessageWithToolStatus(TOOL_CALL_STATUS.PENDING)] satisfies Message[]
    );
    storeContext.state.getMessagesForSession = getMessagesForSession;
    const harness = createHarness();
    harness.unmount();

    act(() => {
      vi.advanceTimersByTime(TIMEOUT.THROTTLE_MS * 2);
    });

    expect(getMessagesForSession).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

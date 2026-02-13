import { TOOL_APPROVAL_RECENT_CALLS_DISPLAY } from "@/config/limits";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { type ToolCallId, ToolCallIdSchema } from "@/types/domain";
import { useToolApprovals } from "@/ui/hooks/useToolApprovals";
import type { ToolCall } from "@/ui/hooks/useToolCalls";
import React, { useEffect, useState } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

interface HarnessSnapshot {
  toolCalls: Map<ToolCallId, ToolCall>;
  pendingApprovals: Set<ToolCallId>;
}

interface ToolApprovalsProbeProps {
  initialToolCalls: Map<ToolCallId, ToolCall>;
  initialPendingApprovals: Set<ToolCallId>;
  onApi: (api: ReturnType<typeof useToolApprovals>) => void;
  onSnapshot: (snapshot: HarnessSnapshot) => void;
  onToolApproved?: (id: ToolCallId) => void;
  onToolDenied?: (id: ToolCallId) => void;
}

const ToolApprovalsProbe = ({
  initialToolCalls,
  initialPendingApprovals,
  onApi,
  onSnapshot,
  onToolApproved,
  onToolDenied,
}: ToolApprovalsProbeProps): React.JSX.Element => {
  const [toolCalls, setToolCalls] = useState(initialToolCalls);
  const [pendingApprovals, setPendingApprovals] = useState(initialPendingApprovals);

  const api = useToolApprovals({
    toolCalls,
    pendingApprovals,
    setToolCalls,
    setPendingApprovals,
    onToolApproved,
    onToolDenied,
  });

  useEffect(() => {
    onApi(api);
  }, [api, onApi]);

  useEffect(() => {
    onSnapshot({
      toolCalls,
      pendingApprovals,
    });
  }, [toolCalls, pendingApprovals, onSnapshot]);

  return React.createElement(React.Fragment);
};

const createToolCall = (id: string, status: ToolCall["status"]): ToolCall => ({
  id: ToolCallIdSchema.parse(id),
  name: `tool-${id}`,
  arguments: {},
  status,
});

const createHarness = (params?: {
  initialToolCalls?: Map<ToolCallId, ToolCall>;
  initialPendingApprovals?: Set<ToolCallId>;
  onToolApproved?: (id: ToolCallId) => void;
  onToolDenied?: (id: ToolCallId) => void;
}): {
  getApi: () => ReturnType<typeof useToolApprovals>;
  getSnapshot: () => HarnessSnapshot;
  run: (action: (api: ReturnType<typeof useToolApprovals>) => void) => void;
  unmount: () => void;
} => {
  let api: ReturnType<typeof useToolApprovals> | undefined;
  let snapshot: HarnessSnapshot | undefined;
  let renderer: ReactTestRenderer;

  act(() => {
    renderer = create(
      React.createElement(ToolApprovalsProbe, {
        initialToolCalls: params?.initialToolCalls ?? new Map(),
        initialPendingApprovals: params?.initialPendingApprovals ?? new Set(),
        onApi: (nextApi) => {
          api = nextApi;
        },
        onSnapshot: (nextSnapshot) => {
          snapshot = nextSnapshot;
        },
        onToolApproved: params?.onToolApproved,
        onToolDenied: params?.onToolDenied,
      })
    );
  });

  const getApi = (): ReturnType<typeof useToolApprovals> => {
    if (!api) {
      throw new Error("Expected tool approvals api to be initialized.");
    }
    return api;
  };

  const getSnapshot = (): HarnessSnapshot => {
    if (!snapshot) {
      throw new Error("Expected harness snapshot to be initialized.");
    }
    return snapshot;
  };

  const run = (action: (nextApi: ReturnType<typeof useToolApprovals>) => void): void => {
    act(() => {
      action(getApi());
    });
  };

  return {
    getApi,
    getSnapshot,
    run,
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
};

describe("useToolApprovals behavior", () => {
  it("approves a pending tool and removes it from pending approvals", () => {
    const toolId = ToolCallIdSchema.parse("approve-1");
    const onToolApproved = vi.fn();
    const harness = createHarness({
      initialToolCalls: new Map([[toolId, createToolCall("approve-1", TOOL_CALL_STATUS.PENDING)]]),
      initialPendingApprovals: new Set([toolId]),
      onToolApproved,
    });

    try {
      harness.run((api) => api.handleApprove(toolId));

      const snapshot = harness.getSnapshot();
      const tool = snapshot.toolCalls.get(toolId);
      expect(tool?.status).toBe(TOOL_CALL_STATUS.APPROVED);
      expect(tool?.startedAt).toBeInstanceOf(Date);
      expect(snapshot.pendingApprovals.has(toolId)).toBe(false);
      expect(onToolApproved).toHaveBeenCalledWith(toolId);
    } finally {
      harness.unmount();
    }
  });

  it("denies a pending tool and removes it from pending approvals", () => {
    const toolId = ToolCallIdSchema.parse("deny-1");
    const onToolDenied = vi.fn();
    const harness = createHarness({
      initialToolCalls: new Map([[toolId, createToolCall("deny-1", TOOL_CALL_STATUS.PENDING)]]),
      initialPendingApprovals: new Set([toolId]),
      onToolDenied,
    });

    try {
      harness.run((api) => api.handleDeny(toolId));

      const snapshot = harness.getSnapshot();
      const tool = snapshot.toolCalls.get(toolId);
      expect(tool?.status).toBe(TOOL_CALL_STATUS.DENIED);
      expect(snapshot.pendingApprovals.has(toolId)).toBe(false);
      expect(onToolDenied).toHaveBeenCalledWith(toolId);
    } finally {
      harness.unmount();
    }
  });

  it("computes next approval, active calls, and recent completed calls", () => {
    const firstPending = ToolCallIdSchema.parse("pending-1");
    const secondPending = ToolCallIdSchema.parse("pending-2");
    const completedTools = Array.from(
      { length: TOOL_APPROVAL_RECENT_CALLS_DISPLAY + 2 },
      (_, index) =>
        createToolCall(
          `completed-${index}`,
          index % 2 === 0 ? TOOL_CALL_STATUS.SUCCEEDED : TOOL_CALL_STATUS.FAILED
        )
    );

    const toolCalls = new Map<ToolCallId, ToolCall>([
      [firstPending, createToolCall("pending-1", TOOL_CALL_STATUS.PENDING)],
      [secondPending, createToolCall("pending-2", TOOL_CALL_STATUS.PENDING)],
      [ToolCallIdSchema.parse("running-1"), createToolCall("running-1", TOOL_CALL_STATUS.RUNNING)],
      [
        ToolCallIdSchema.parse("approved-1"),
        createToolCall("approved-1", TOOL_CALL_STATUS.APPROVED),
      ],
      ...completedTools.map((tool) => [tool.id, tool] as const),
    ]);

    const harness = createHarness({
      initialToolCalls: toolCalls,
      initialPendingApprovals: new Set([firstPending, secondPending]),
    });

    try {
      const api = harness.getApi();
      expect(api.nextApproval).toBe(firstPending);
      expect(api.approvalTool?.id).toBe(firstPending);
      expect(api.activeCalls.map((call) => call.id)).toEqual([
        ToolCallIdSchema.parse("running-1"),
        ToolCallIdSchema.parse("approved-1"),
      ]);
      expect(api.recentCalls).toHaveLength(TOOL_APPROVAL_RECENT_CALLS_DISPLAY);
      expect(api.recentCalls.every((call) => call.status !== TOOL_CALL_STATUS.RUNNING)).toBe(true);
    } finally {
      harness.unmount();
    }
  });
});

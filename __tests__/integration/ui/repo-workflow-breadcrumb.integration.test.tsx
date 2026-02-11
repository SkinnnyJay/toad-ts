import { REPO_WORKFLOW_ACTION } from "@/constants/repo-workflow-actions";
import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import { BreadcrumbBar } from "@/ui/components/BreadcrumbBar";
import { useRepoWorkflow } from "@/ui/hooks/useRepoWorkflow";
import React, { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderInk, waitFor, waitForText } from "../../utils/ink-test-helpers";

const mockGetRepoWorkflowInfo = vi.hoisted(() => vi.fn());

vi.mock("@/core/repo-workflow", async () => {
  const actual =
    await vi.importActual<typeof import("@/core/repo-workflow")>("@/core/repo-workflow");
  return {
    ...actual,
    getRepoWorkflowInfo: (...args: unknown[]) => mockGetRepoWorkflowInfo(...args),
  };
});

const workflowInfo = (status: keyof typeof REPO_WORKFLOW_STATUS) => ({
  owner: "acme",
  repoName: "toadstool",
  branch: "feature/workflow",
  status: REPO_WORKFLOW_STATUS[status],
  prNumber: 7,
  prUrl: "https://example.com/pull/7",
  prTitle: "Workflow changes",
  isDirty: false,
  isAhead: true,
  isBehind: false,
  hasMergeConflicts: false,
  checksStatus: "pending" as const,
  action: REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS[status]],
});

function PipelineHarness({
  onAction,
  pollIntervalMs,
}: {
  onAction: (skill: string) => void;
  pollIntervalMs: number;
}) {
  const { info, loading } = useRepoWorkflow({ pollIntervalMs, enabled: true });

  useEffect(() => {
    if (info?.action?.skill) {
      onAction(info.action.skill);
    }
  }, [info, onAction]);

  return (
    <BreadcrumbBar
      info={info}
      loading={loading}
      showAction={true}
      onActionPress={onAction}
      compact={false}
    />
  );
}

function PollingHarness({ pollIntervalMs }: { pollIntervalMs: number }) {
  const { info, loading } = useRepoWorkflow({ pollIntervalMs, enabled: true });
  return (
    <BreadcrumbBar
      info={info}
      loading={loading}
      showAction={true}
      onActionPress={() => {}}
      compact={false}
    />
  );
}

describe("Repo workflow breadcrumb pipeline", () => {
  beforeEach(() => {
    mockGetRepoWorkflowInfo.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("polls workflow info, renders breadcrumb, and emits action skill", async () => {
    mockGetRepoWorkflowInfo.mockResolvedValue(workflowInfo("OPEN"));
    const onAction = vi.fn();
    const { lastFrame } = renderInk(
      <PipelineHarness onAction={onAction} pollIntervalMs={5_000} />,
      { width: 140 }
    );

    await waitForText({ lastFrame }, "acme", 500);
    await waitForText({ lastFrame }, "OPEN", 500);
    await waitForText({ lastFrame }, "Request Review", 500);
    await waitFor(() => onAction.mock.calls.length >= 1, 500);

    expect(onAction.mock.calls[0]?.[0]).toBe("request-review");
  });

  it("refreshes breadcrumb content on polling interval", async () => {
    mockGetRepoWorkflowInfo
      .mockResolvedValueOnce(workflowInfo("OPEN"))
      .mockResolvedValueOnce(workflowInfo("APPROVED"))
      .mockResolvedValue(workflowInfo("APPROVED"));

    const { lastFrame } = renderInk(<PollingHarness pollIntervalMs={25} />, {
      width: 140,
    });

    await waitForText({ lastFrame }, "OPEN", 500);
    await waitForText({ lastFrame }, "APPROVED", 1_000);
    expect(mockGetRepoWorkflowInfo.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

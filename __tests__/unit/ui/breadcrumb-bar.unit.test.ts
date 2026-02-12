import { REPO_WORKFLOW_ACTION } from "@/constants/repo-workflow-actions";
import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import type { RepoWorkflowInfo } from "@/core/repo-workflow";
import { BreadcrumbBar } from "@/ui/components/BreadcrumbBar";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderInk } from "../../utils/ink-test-helpers";

const createRepoInfo = (status = REPO_WORKFLOW_STATUS.LOCAL_CLEAN): RepoWorkflowInfo => ({
  owner: "acme",
  repoName: "toadstool",
  branch: "feature/cursor",
  status,
  prNumber: 123,
  prUrl: "https://github.com/acme/toadstool/pull/123",
  prTitle: "Improve cursor integration",
  isDirty: false,
  isAhead: false,
  isBehind: false,
  hasMergeConflicts: false,
  checksStatus: "pass",
  action: REPO_WORKFLOW_ACTION[status],
});

describe("BreadcrumbBar", () => {
  it("renders loading state when info is unavailable", () => {
    const { lastFrame } = renderInk(
      React.createElement(BreadcrumbBar, {
        info: null,
        loading: true,
        showAction: true,
        onActionPress: vi.fn(),
      }),
      { width: 120 }
    );

    expect(lastFrame()).toContain("Loading repo");
  });

  it("renders workflow context and action label", () => {
    const info = createRepoInfo(REPO_WORKFLOW_STATUS.APPROVED);
    const { lastFrame } = renderInk(
      React.createElement(BreadcrumbBar, {
        info,
        loading: false,
        showAction: true,
        onActionPress: vi.fn(),
      }),
      { width: 160 }
    );

    const frame = lastFrame();
    expect(frame).toContain("acme");
    expect(frame).toContain("toadstool");
    expect(frame).toContain("feature/cursor");
    expect(frame).toContain("APPROVED");
    expect(frame).toContain("PR #123");
    expect(frame).toContain("Merge PR");
  });
});

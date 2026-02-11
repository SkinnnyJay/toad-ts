import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REPO_WORKFLOW_ACTION } from "../../../src/constants/repo-workflow-actions";
import { REPO_WORKFLOW_STATUS } from "../../../src/constants/repo-workflow-status";
import type { RepoWorkflowInfo } from "../../../src/core/repo-workflow";
import { BreadcrumbBar } from "../../../src/ui/components/BreadcrumbBar";
import { cleanup, renderInk } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

const baseInfo: RepoWorkflowInfo = {
  owner: "acme",
  repoName: "toadstool",
  branch: "feature/workflow",
  status: REPO_WORKFLOW_STATUS.OPEN,
  prNumber: 42,
  prUrl: "https://example.com/pull/42",
  prTitle: "Add breadcrumb workflow",
  isDirty: false,
  isAhead: true,
  isBehind: false,
  hasMergeConflicts: false,
  checksStatus: "pending",
  action: REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS.OPEN],
};

describe("BreadcrumbBar", () => {
  it("renders loading state when data is pending", () => {
    const { lastFrame } = renderInk(
      React.createElement(BreadcrumbBar, {
        info: null,
        loading: true,
        showAction: true,
        onActionPress: vi.fn(),
      })
    );
    expect(lastFrame()).toContain("Loading repo…");
  });

  it("renders repository path, branch, status, and PR number", () => {
    const { lastFrame } = renderInk(
      React.createElement(BreadcrumbBar, {
        info: baseInfo,
        loading: false,
        showAction: true,
        onActionPress: vi.fn(),
      }),
      { width: 140 }
    );
    const frame = lastFrame();
    expect(frame).toContain("acme");
    expect(frame).toContain("toadstool");
    expect(frame).toContain("feature/workflow");
    expect(frame).toContain("OPEN");
    expect(frame).toContain("PR #42");
    expect(frame).toContain("Request Review");
  });

  it("hides action label when showAction is false", () => {
    const { lastFrame } = renderInk(
      React.createElement(BreadcrumbBar, {
        info: baseInfo,
        loading: false,
        showAction: false,
        onActionPress: vi.fn(),
      }),
      { width: 140 }
    );
    expect(lastFrame()).not.toContain("Request Review");
  });

  it("returns empty output when no info and not loading", () => {
    const { lastFrame } = renderInk(
      React.createElement(BreadcrumbBar, {
        info: null,
        loading: false,
        showAction: true,
        onActionPress: vi.fn(),
      })
    );
    expect(lastFrame().trim()).toBe("");
  });
});

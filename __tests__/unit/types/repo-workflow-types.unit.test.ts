import { REPO_WORKFLOW_ACTION } from "@/constants/repo-workflow-actions";
import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import {
  RepoWorkflowChecksResponseSchema,
  RepoWorkflowInfoSchema,
} from "@/types/repo-workflow.types";
import { describe, expect, it } from "vitest";

describe("repo-workflow types", () => {
  it("parses gh checks output with extra fields", () => {
    const parsed = RepoWorkflowChecksResponseSchema.parse([
      { name: "lint", status: "completed", conclusion: "success" },
      { name: "test", status: "in_progress", conclusion: "" },
    ]);
    expect(parsed).toHaveLength(2);
  });

  it("parses workflow info payload", () => {
    const parsed = RepoWorkflowInfoSchema.parse({
      owner: "acme",
      repoName: "toadstool",
      branch: "feature/repo-workflow",
      status: REPO_WORKFLOW_STATUS.OPEN,
      prNumber: 88,
      prUrl: "https://example.com/pull/88",
      prTitle: "Add breadcrumb workflow",
      isDirty: false,
      isAhead: true,
      isBehind: false,
      hasMergeConflicts: false,
      checksStatus: "pending",
      action: REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS.OPEN],
    });
    expect(parsed.status).toBe(REPO_WORKFLOW_STATUS.OPEN);
    expect(parsed.action.skill).toBe("request-review");
  });
});

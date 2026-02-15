import { PR_REVIEW_STATUS } from "@/constants/pr-review-status";
import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import { deriveRepoWorkflowStatus } from "@/core/repo-workflow";
import { describe, expect, it } from "vitest";

const createPr = (overrides?: Partial<Parameters<typeof deriveRepoWorkflowStatus>[0]>) => ({
  number: 1,
  title: "Test PR",
  url: "https://github.com/acme/repo/pull/1",
  state: "open" as const,
  reviewDecision: PR_REVIEW_STATUS.UNKNOWN,
  ...overrides,
});

describe("deriveRepoWorkflowStatus", () => {
  it("derives local statuses when no PR exists", () => {
    expect(deriveRepoWorkflowStatus(null, true, false, false, null)).toBe(
      REPO_WORKFLOW_STATUS.LOCAL_DIRTY
    );
    expect(deriveRepoWorkflowStatus(null, false, true, false, null)).toBe(
      REPO_WORKFLOW_STATUS.LOCAL_AHEAD
    );
    expect(deriveRepoWorkflowStatus(null, false, false, false, null)).toBe(
      REPO_WORKFLOW_STATUS.LOCAL_CLEAN
    );
  });

  it("derives merged and closed statuses first", () => {
    expect(
      deriveRepoWorkflowStatus(createPr({ state: "merged" }), false, false, false, "pass")
    ).toBe(REPO_WORKFLOW_STATUS.MERGED);
    expect(
      deriveRepoWorkflowStatus(createPr({ state: "closed" }), false, false, false, "pass")
    ).toBe(REPO_WORKFLOW_STATUS.CLOSED);
  });

  it("normalizes padded PR state before deriving workflow status", () => {
    expect(
      deriveRepoWorkflowStatus(createPr({ state: " merged " }), false, false, false, "pass")
    ).toBe(REPO_WORKFLOW_STATUS.MERGED);
  });

  it("derives draft, conflict, and ci failing statuses for open PRs", () => {
    expect(deriveRepoWorkflowStatus(createPr({ isDraft: true }), false, false, false, "pass")).toBe(
      REPO_WORKFLOW_STATUS.DRAFT
    );
    expect(
      deriveRepoWorkflowStatus(
        createPr({ reviewDecision: PR_REVIEW_STATUS.APPROVED }),
        false,
        false,
        true,
        "pass"
      )
    ).toBe(REPO_WORKFLOW_STATUS.MERGE_CONFLICTS);
    expect(
      deriveRepoWorkflowStatus(
        createPr({ reviewDecision: PR_REVIEW_STATUS.APPROVED }),
        false,
        false,
        false,
        "fail"
      )
    ).toBe(REPO_WORKFLOW_STATUS.CI_FAILING);
  });

  it("derives review-based statuses for open PRs", () => {
    expect(
      deriveRepoWorkflowStatus(
        createPr({ reviewDecision: PR_REVIEW_STATUS.APPROVED }),
        false,
        false,
        false,
        "pass"
      )
    ).toBe(REPO_WORKFLOW_STATUS.APPROVED);
    expect(
      deriveRepoWorkflowStatus(
        createPr({ reviewDecision: PR_REVIEW_STATUS.CHANGES_REQUESTED }),
        false,
        false,
        false,
        "pass"
      )
    ).toBe(REPO_WORKFLOW_STATUS.CHANGES_REQUESTED);
    expect(
      deriveRepoWorkflowStatus(
        createPr({ reviewDecision: PR_REVIEW_STATUS.REVIEW_REQUIRED }),
        false,
        false,
        false,
        "pass"
      )
    ).toBe(REPO_WORKFLOW_STATUS.REVIEW_REQUESTED);
    expect(deriveRepoWorkflowStatus(createPr(), false, false, false, "pending")).toBe(
      REPO_WORKFLOW_STATUS.OPEN
    );
  });

  it("normalizes padded review decisions before deriving status", () => {
    expect(
      deriveRepoWorkflowStatus(
        createPr({ reviewDecision: " approved " }),
        false,
        false,
        false,
        "pass"
      )
    ).toBe(REPO_WORKFLOW_STATUS.APPROVED);
  });
});

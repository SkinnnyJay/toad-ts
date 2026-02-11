import { PR_REVIEW_STATUS } from "@/constants/pr-review-status";
import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import {
  deriveChecksStatus,
  deriveChecksStatusFromOutput,
  deriveWorkflowStatus,
} from "@/core/repo-workflow";
import { REPO_WORKFLOW_CHECKS_STATUS } from "@/types/repo-workflow.types";
import { describe, expect, it } from "vitest";

const buildOpenPr = (reviewDecision: string) => ({
  number: 42,
  title: "My PR",
  url: "https://example.com/pr/42",
  state: "open" as const,
  reviewDecision,
  isDraft: false,
});

describe("repo-workflow", () => {
  describe("deriveChecksStatus", () => {
    it("returns null when no checks exist", () => {
      expect(deriveChecksStatus([])).toBeNull();
    });

    it("returns fail when a check has failure conclusion", () => {
      const status = deriveChecksStatus([
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "failure" },
      ]);
      expect(status).toBe(REPO_WORKFLOW_CHECKS_STATUS.FAIL);
    });

    it("returns pending when a check is in progress", () => {
      const status = deriveChecksStatus([{ status: "in_progress", conclusion: "" }]);
      expect(status).toBe(REPO_WORKFLOW_CHECKS_STATUS.PENDING);
    });

    it("returns pass when all checks are complete and successful", () => {
      const status = deriveChecksStatus([
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "neutral" },
      ]);
      expect(status).toBe(REPO_WORKFLOW_CHECKS_STATUS.PASS);
    });

    it("parses gh checks output into normalized status", () => {
      const output = JSON.stringify([
        { name: "unit", status: "completed", conclusion: "success" },
        { name: "integration", status: "queued", conclusion: "" },
      ]);
      expect(deriveChecksStatusFromOutput(output)).toBe(REPO_WORKFLOW_CHECKS_STATUS.PENDING);
    });

    it("returns null when gh checks output is malformed", () => {
      expect(deriveChecksStatusFromOutput("{not-json")).toBeNull();
    });
  });

  describe("deriveWorkflowStatus", () => {
    it("prioritizes local states when no pull request exists", () => {
      expect(deriveWorkflowStatus(null, true, false, false, null)).toBe(
        REPO_WORKFLOW_STATUS.LOCAL_DIRTY
      );
      expect(deriveWorkflowStatus(null, false, true, false, null)).toBe(
        REPO_WORKFLOW_STATUS.LOCAL_AHEAD
      );
      expect(deriveWorkflowStatus(null, false, false, false, null)).toBe(
        REPO_WORKFLOW_STATUS.LOCAL_CLEAN
      );
    });

    it("maps merged and closed pull requests", () => {
      expect(
        deriveWorkflowStatus(
          {
            ...buildOpenPr(PR_REVIEW_STATUS.UNKNOWN),
            state: "merged",
          },
          false,
          false,
          false,
          null
        )
      ).toBe(REPO_WORKFLOW_STATUS.MERGED);

      expect(
        deriveWorkflowStatus(
          {
            ...buildOpenPr(PR_REVIEW_STATUS.UNKNOWN),
            state: "closed",
          },
          false,
          false,
          false,
          null
        )
      ).toBe(REPO_WORKFLOW_STATUS.CLOSED);
    });

    it("prioritizes draft, conflicts, and failing checks for open pull requests", () => {
      expect(
        deriveWorkflowStatus(
          {
            ...buildOpenPr(PR_REVIEW_STATUS.UNKNOWN),
            isDraft: true,
          },
          false,
          false,
          false,
          null
        )
      ).toBe(REPO_WORKFLOW_STATUS.DRAFT);

      expect(
        deriveWorkflowStatus(
          buildOpenPr(PR_REVIEW_STATUS.UNKNOWN),
          false,
          false,
          true,
          REPO_WORKFLOW_CHECKS_STATUS.PASS
        )
      ).toBe(REPO_WORKFLOW_STATUS.MERGE_CONFLICTS);

      expect(
        deriveWorkflowStatus(
          buildOpenPr(PR_REVIEW_STATUS.UNKNOWN),
          false,
          false,
          false,
          REPO_WORKFLOW_CHECKS_STATUS.FAIL
        )
      ).toBe(REPO_WORKFLOW_STATUS.CI_FAILING);
    });

    it("maps review decision states to workflow statuses", () => {
      expect(
        deriveWorkflowStatus(
          buildOpenPr(PR_REVIEW_STATUS.APPROVED),
          false,
          false,
          false,
          REPO_WORKFLOW_CHECKS_STATUS.PASS
        )
      ).toBe(REPO_WORKFLOW_STATUS.APPROVED);

      expect(
        deriveWorkflowStatus(
          buildOpenPr(PR_REVIEW_STATUS.CHANGES_REQUESTED),
          false,
          false,
          false,
          REPO_WORKFLOW_CHECKS_STATUS.PASS
        )
      ).toBe(REPO_WORKFLOW_STATUS.CHANGES_REQUESTED);

      expect(
        deriveWorkflowStatus(
          buildOpenPr(PR_REVIEW_STATUS.REVIEW_REQUIRED),
          false,
          false,
          false,
          REPO_WORKFLOW_CHECKS_STATUS.PASS
        )
      ).toBe(REPO_WORKFLOW_STATUS.REVIEW_REQUESTED);

      expect(
        deriveWorkflowStatus(
          buildOpenPr(PR_REVIEW_STATUS.UNKNOWN),
          false,
          false,
          false,
          REPO_WORKFLOW_CHECKS_STATUS.PASS
        )
      ).toBe(REPO_WORKFLOW_STATUS.OPEN);
    });
  });
});

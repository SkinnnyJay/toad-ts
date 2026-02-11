import { REPO_WORKFLOW_STATUS, type RepoWorkflowStatus } from "@/constants/repo-workflow-status";

export interface RepoWorkflowAction {
  label: string;
  skill: string;
  description: string;
}

export const REPO_WORKFLOW_ACTION: Record<RepoWorkflowStatus, RepoWorkflowAction> = {
  [REPO_WORKFLOW_STATUS.LOCAL_CLEAN]: {
    label: "Create PR",
    skill: "create-pr",
    description: "Create a pull request for this branch",
  },
  [REPO_WORKFLOW_STATUS.LOCAL_DIRTY]: {
    label: "Commit & Push",
    skill: "commit-changes",
    description: "Stage, commit, and push changes",
  },
  [REPO_WORKFLOW_STATUS.LOCAL_AHEAD]: {
    label: "Push & Create PR",
    skill: "push-and-create-pr",
    description: "Push commits and create a PR",
  },
  [REPO_WORKFLOW_STATUS.DRAFT]: {
    label: "Ready for Review",
    skill: "mark-ready",
    description: "Mark PR as ready for review",
  },
  [REPO_WORKFLOW_STATUS.OPEN]: {
    label: "Request Review",
    skill: "request-review",
    description: "Request a code review",
  },
  [REPO_WORKFLOW_STATUS.REVIEW_REQUESTED]: {
    label: "Check Status",
    skill: "check-review",
    description: "Check review status and comments",
  },
  [REPO_WORKFLOW_STATUS.CHANGES_REQUESTED]: {
    label: "Address Feedback",
    skill: "address-feedback",
    description: "Review and address requested changes",
  },
  [REPO_WORKFLOW_STATUS.APPROVED]: {
    label: "Merge PR",
    skill: "merge-pr",
    description: "Merge the approved pull request",
  },
  [REPO_WORKFLOW_STATUS.MERGE_CONFLICTS]: {
    label: "Resolve Conflicts",
    skill: "resolve-conflicts",
    description: "Resolve merge conflicts",
  },
  [REPO_WORKFLOW_STATUS.CI_FAILING]: {
    label: "Fix CI",
    skill: "fix-ci",
    description: "Investigate and fix failing CI checks",
  },
  [REPO_WORKFLOW_STATUS.MERGED]: {
    label: "Clean Up",
    skill: "cleanup-branch",
    description: "Delete merged branch and switch to main",
  },
  [REPO_WORKFLOW_STATUS.CLOSED]: {
    label: "Reopen / New PR",
    skill: "reopen-or-new",
    description: "Reopen the PR or create a new one",
  },
};

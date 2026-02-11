import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import { z } from "zod";

export const REPO_WORKFLOW_CHECKS_STATUS = {
  PASS: "pass",
  FAIL: "fail",
  PENDING: "pending",
} as const;

export type RepoWorkflowChecksStatus =
  | (typeof REPO_WORKFLOW_CHECKS_STATUS)[keyof typeof REPO_WORKFLOW_CHECKS_STATUS]
  | null;

export const RepoWorkflowChecksStatusSchema = z
  .enum([
    REPO_WORKFLOW_CHECKS_STATUS.PASS,
    REPO_WORKFLOW_CHECKS_STATUS.FAIL,
    REPO_WORKFLOW_CHECKS_STATUS.PENDING,
  ])
  .nullable();

export const RepoWorkflowCheckSummarySchema = z
  .object({
    status: z.string().optional(),
    conclusion: z.string().optional(),
  })
  .passthrough();

export type RepoWorkflowCheckSummary = z.infer<typeof RepoWorkflowCheckSummarySchema>;

export const RepoWorkflowChecksResponseSchema = z.array(RepoWorkflowCheckSummarySchema);

export const RepoWorkflowActionSchema = z
  .object({
    label: z.string(),
    skill: z.string(),
    description: z.string(),
  })
  .strict();

export const RepoWorkflowStatusSchema = z.enum([
  REPO_WORKFLOW_STATUS.LOCAL_CLEAN,
  REPO_WORKFLOW_STATUS.LOCAL_DIRTY,
  REPO_WORKFLOW_STATUS.LOCAL_AHEAD,
  REPO_WORKFLOW_STATUS.DRAFT,
  REPO_WORKFLOW_STATUS.OPEN,
  REPO_WORKFLOW_STATUS.REVIEW_REQUESTED,
  REPO_WORKFLOW_STATUS.CHANGES_REQUESTED,
  REPO_WORKFLOW_STATUS.APPROVED,
  REPO_WORKFLOW_STATUS.MERGE_CONFLICTS,
  REPO_WORKFLOW_STATUS.CI_FAILING,
  REPO_WORKFLOW_STATUS.MERGED,
  REPO_WORKFLOW_STATUS.CLOSED,
]);

export const RepoWorkflowInfoSchema = z
  .object({
    owner: z.string(),
    repoName: z.string(),
    branch: z.string(),
    status: RepoWorkflowStatusSchema,
    prNumber: z.number().int().nullable(),
    prUrl: z.string().nullable(),
    prTitle: z.string().nullable(),
    isDirty: z.boolean(),
    isAhead: z.boolean(),
    isBehind: z.boolean(),
    hasMergeConflicts: z.boolean(),
    checksStatus: RepoWorkflowChecksStatusSchema,
    action: RepoWorkflowActionSchema,
  })
  .strict();

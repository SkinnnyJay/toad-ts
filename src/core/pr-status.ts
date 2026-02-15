import { TIMEOUT } from "@/config/timeouts";
import {
  PR_REVIEW_COLOR,
  PR_REVIEW_STATUS,
  type PrReviewStatus,
} from "@/constants/pr-review-status";
import { execa } from "execa";

const PR_STATE = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
} as const;

export interface PullRequestStatus {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  reviewDecision: PrReviewStatus;
  isDraft?: boolean;
}

const normalizePrState = (state: string | undefined): PullRequestStatus["state"] => {
  const normalized = state?.trim().toLowerCase();
  if (normalized === PR_STATE.CLOSED) {
    return PR_STATE.CLOSED;
  }
  if (normalized === PR_STATE.MERGED) {
    return PR_STATE.MERGED;
  }
  return PR_STATE.OPEN;
};

const normalizeReviewDecision = (reviewDecision: string | undefined): PrReviewStatus => {
  const normalized = reviewDecision?.trim().toLowerCase();
  if (normalized === PR_REVIEW_STATUS.APPROVED) {
    return PR_REVIEW_STATUS.APPROVED;
  }
  if (normalized === PR_REVIEW_STATUS.CHANGES_REQUESTED) {
    return PR_REVIEW_STATUS.CHANGES_REQUESTED;
  }
  if (normalized === PR_REVIEW_STATUS.REVIEW_REQUIRED) {
    return PR_REVIEW_STATUS.REVIEW_REQUIRED;
  }
  return PR_REVIEW_STATUS.UNKNOWN;
};

/**
 * Get the PR status for the current branch using the `gh` CLI.
 * Returns null if no PR exists or `gh` is not installed.
 */
export const getPRStatus = async (cwd?: string): Promise<PullRequestStatus | null> => {
  try {
    const { stdout } = await execa(
      "gh",
      ["pr", "view", "--json", "number,title,url,state,reviewDecision,isDraft"],
      { cwd: cwd ?? process.cwd(), timeout: TIMEOUT.GH_CLI_MS }
    );

    const data = JSON.parse(stdout) as {
      number?: number;
      title?: string;
      url?: string;
      state?: string;
      reviewDecision?: string;
      isDraft?: boolean;
    };

    if (!data.number || !data.url) return null;

    return {
      number: data.number,
      title: data.title ?? "",
      url: data.url,
      state: normalizePrState(data.state),
      reviewDecision: normalizeReviewDecision(data.reviewDecision),
      isDraft: data.isDraft === true,
    };
  } catch {
    // gh CLI not installed or not in a git repo with a PR
    return null;
  }
};

/**
 * Get the color for a PR review status indicator.
 */
export const prStatusColor = (status: PullRequestStatus): string =>
  PR_REVIEW_COLOR[status.reviewDecision] ?? PR_REVIEW_COLOR[PR_REVIEW_STATUS.UNKNOWN];

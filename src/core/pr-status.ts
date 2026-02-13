import { TIMEOUT } from "@/config/timeouts";
import {
  PR_REVIEW_COLOR,
  PR_REVIEW_STATUS,
  type PrReviewStatus,
} from "@/constants/pr-review-status";
import { execa } from "execa";

export interface PullRequestStatus {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  reviewDecision: PrReviewStatus;
  isDraft?: boolean;
}

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
      state: (data.state?.toLowerCase() as PullRequestStatus["state"]) ?? "open",
      reviewDecision:
        (data.reviewDecision?.toLowerCase() as PrReviewStatus) ?? PR_REVIEW_STATUS.UNKNOWN,
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

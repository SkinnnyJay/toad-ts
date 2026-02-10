import { execa } from "execa";

export interface PullRequestStatus {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  reviewDecision: "approved" | "changes_requested" | "review_required" | "unknown";
}

/**
 * Get the PR status for the current branch using the `gh` CLI.
 * Returns null if no PR exists or `gh` is not installed.
 */
export const getPRStatus = async (cwd?: string): Promise<PullRequestStatus | null> => {
  try {
    const { stdout } = await execa(
      "gh",
      ["pr", "view", "--json", "number,title,url,state,reviewDecision"],
      { cwd: cwd ?? process.cwd(), timeout: 10_000 }
    );

    const data = JSON.parse(stdout) as {
      number?: number;
      title?: string;
      url?: string;
      state?: string;
      reviewDecision?: string;
    };

    if (!data.number || !data.url) return null;

    return {
      number: data.number,
      title: data.title ?? "",
      url: data.url,
      state: (data.state?.toLowerCase() as PullRequestStatus["state"]) ?? "open",
      reviewDecision:
        (data.reviewDecision?.toLowerCase() as PullRequestStatus["reviewDecision"]) ?? "unknown",
    };
  } catch {
    // gh CLI not installed or not in a git repo with a PR
    return null;
  }
};

/**
 * Get the color for a PR review status indicator.
 */
export const prStatusColor = (status: PullRequestStatus): string => {
  switch (status.reviewDecision) {
    case "approved":
      return "#00FF00"; // Green
    case "changes_requested":
      return "#FF4444"; // Red
    case "review_required":
      return "#FFAA00"; // Yellow/Orange
    default:
      return "#888888"; // Gray
  }
};

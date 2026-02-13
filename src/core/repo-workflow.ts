import path from "node:path";
import { GIT_STATUS_CODE_MIN_LENGTH } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { REPO_WORKFLOW_ACTION, type RepoWorkflowAction } from "@/constants/repo-workflow-actions";
import { REPO_WORKFLOW_STATUS, type RepoWorkflowStatus } from "@/constants/repo-workflow-status";
import { type PullRequestStatus, getPRStatus } from "@/core/pr-status";
import { isGitClean } from "@/store/checkpoints/checkpoint-git";
import { execa } from "execa";

async function getGitRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
    });
    const root = stdout.trim();
    return root.length > 0 ? root : null;
  } catch {
    return null;
  }
}

export interface RepoWorkflowInfo {
  owner: string;
  repoName: string;
  branch: string;
  status: RepoWorkflowStatus;
  prNumber: number | null;
  prUrl: string | null;
  prTitle: string | null;
  isDirty: boolean;
  isAhead: boolean;
  isBehind: boolean;
  hasMergeConflicts: boolean;
  checksStatus: "pass" | "fail" | "pending" | null;
  action: RepoWorkflowAction;
}

const GIT_REMOTE_ORIGIN_URL = "remote.origin.url";

async function getRemoteOriginUrl(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["config", "--get", GIT_REMOTE_ORIGIN_URL], {
      cwd,
      encoding: "utf8",
    });
    const url = stdout.trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

function parseOwnerRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const trimmed = url.trim();
  const sshMatch = trimmed.match(/^git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1] ?? "", repo: (sshMatch[2] ?? "").replace(/\.git$/, "") };
  }
  const sshProtocolMatch = trimmed.match(
    /^ssh:\/\/(?:[^@]+@)?[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/
  );
  if (sshProtocolMatch) {
    return {
      owner: sshProtocolMatch[1] ?? "",
      repo: (sshProtocolMatch[2] ?? "").replace(/\.git$/, ""),
    };
  }
  const httpsMatch = trimmed.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1] ?? "", repo: (httpsMatch[2] ?? "").replace(/\.git$/, "") };
  }
  return null;
}

async function getBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
    });
    return stdout.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

async function getAheadBehind(cwd: string): Promise<{ ahead: number; behind: number }> {
  try {
    const { stdout } = await execa("git", ["rev-list", "--count", "--left-right", "HEAD...@{u}"], {
      cwd,
      encoding: "utf8",
    });
    const parts = stdout.trim().split(/\s+/);
    const ahead = Number.parseInt(parts[0] ?? "0", 10) || 0;
    const behind = Number.parseInt(parts[1] ?? "0", 10) || 0;
    return { ahead, behind };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

async function getHasMergeConflicts(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execa("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf8",
    });
    const lines = stdout.split("\n").filter((line) => line.length >= GIT_STATUS_CODE_MIN_LENGTH);
    return lines.some((line) => {
      const first = line[0];
      const second = line[1];
      return first === "U" || first === "A" || first === "D" || second === "U";
    });
  } catch {
    return false;
  }
}

async function getPrChecksStatus(cwd: string): Promise<"pass" | "fail" | "pending" | null> {
  try {
    const { stdout } = await execa("gh", ["pr", "checks", "--json", "name,status,conclusion"], {
      cwd,
      encoding: "utf8",
      timeout: TIMEOUT.GH_CLI_MS,
    });
    const data = JSON.parse(stdout) as Array<{ status?: string; conclusion?: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const hasFail = data.some((c) => (c.conclusion ?? c.status ?? "").toLowerCase() === "failure");
    const hasPending = data.some(
      (c) => (c.status ?? "").toLowerCase() === "in_progress" || (c.conclusion ?? "") === ""
    );
    if (hasFail) return "fail";
    if (hasPending) return "pending";
    return "pass";
  } catch {
    return null;
  }
}

export function deriveRepoWorkflowStatus(
  pr: PullRequestStatus | null,
  isDirty: boolean,
  isAhead: boolean,
  hasMergeConflicts: boolean,
  checksStatus: "pass" | "fail" | "pending" | null
): RepoWorkflowStatus {
  if (!pr) {
    if (isDirty) return REPO_WORKFLOW_STATUS.LOCAL_DIRTY;
    if (isAhead) return REPO_WORKFLOW_STATUS.LOCAL_AHEAD;
    return REPO_WORKFLOW_STATUS.LOCAL_CLEAN;
  }

  const state = pr.state.toLowerCase();
  if (state === "merged") return REPO_WORKFLOW_STATUS.MERGED;
  if (state === "closed") return REPO_WORKFLOW_STATUS.CLOSED;

  if (pr.isDraft === true) return REPO_WORKFLOW_STATUS.DRAFT;

  if (state !== "open") return REPO_WORKFLOW_STATUS.OPEN;

  if (hasMergeConflicts) return REPO_WORKFLOW_STATUS.MERGE_CONFLICTS;
  if (checksStatus === "fail") return REPO_WORKFLOW_STATUS.CI_FAILING;

  const decision = (pr.reviewDecision ?? "").toLowerCase();
  if (decision === "approved") return REPO_WORKFLOW_STATUS.APPROVED;
  if (decision === "changes_requested") return REPO_WORKFLOW_STATUS.CHANGES_REQUESTED;
  if (decision === "review_required") return REPO_WORKFLOW_STATUS.REVIEW_REQUESTED;

  return REPO_WORKFLOW_STATUS.OPEN;
}

export async function getRepoWorkflowInfo(cwd?: string): Promise<RepoWorkflowInfo> {
  const workDir = cwd ?? process.cwd();
  const gitRoot = await getGitRoot(workDir);
  const effectiveCwd = gitRoot ?? workDir;

  const [branch, isDirty, aheadBehind, hasMergeConflicts, pr, checksStatus, remoteUrl] =
    await Promise.all([
      getBranch(effectiveCwd),
      gitRoot ? isGitClean(gitRoot).then((clean) => !clean) : Promise.resolve(false),
      getAheadBehind(effectiveCwd),
      getHasMergeConflicts(effectiveCwd),
      getPRStatus(effectiveCwd),
      getPrChecksStatus(effectiveCwd),
      getRemoteOriginUrl(effectiveCwd),
    ]);

  const { ahead, behind } = aheadBehind;
  const isAhead = ahead > 0;
  const isBehind = behind > 0;

  const status = deriveRepoWorkflowStatus(pr, isDirty, isAhead, hasMergeConflicts, checksStatus);
  const action = REPO_WORKFLOW_ACTION[status];

  let owner = "unknown";
  let repoName = path.basename(effectiveCwd) || "repo";
  if (remoteUrl) {
    const parsed = parseOwnerRepoFromUrl(remoteUrl);
    if (parsed?.owner && parsed.repo) {
      owner = parsed.owner;
      repoName = parsed.repo;
    }
  }

  return {
    owner,
    repoName,
    branch,
    status,
    prNumber: pr?.number ?? null,
    prUrl: pr?.url ?? null,
    prTitle: pr?.title ?? null,
    isDirty,
    isAhead,
    isBehind,
    hasMergeConflicts,
    checksStatus,
    action,
  };
}

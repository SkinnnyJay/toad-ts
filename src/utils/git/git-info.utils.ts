import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Gets the current git branch name
 * @param cwd - Working directory (defaults to process.cwd())
 * @returns Branch name or "unknown" if git is not available or not in a git repo
 */
export function getGitBranch(cwd: string = process.cwd()): string {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return branch || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Gets the repository path and branch in the format "path:branch"
 * @param cwd - Working directory (defaults to process.cwd())
 * @param format - "full" for full path, "short" for just folder name (defaults to "full")
 * @returns Formatted string like "/Users/boice/Documents/GitHub/toad-ts:main" (full) or "toad-ts:main" (short)
 */
export function getRepoInfo(
  cwd: string = process.cwd(),
  format: "full" | "short" = "full"
): string {
  const branch = getGitBranch(cwd);
  if (format === "short") {
    const pathParts = cwd.split(path.sep);
    const folderName = pathParts[pathParts.length - 1] || cwd;
    return `${folderName}:${branch}`;
  }
  return `${cwd}:${branch}`;
}

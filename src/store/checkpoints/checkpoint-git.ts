import path from "node:path";
import { LIMIT } from "@/config/limits";
import type { FileChange, FilePatch } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { createTwoFilesPatch } from "diff";
import { execa } from "execa";

const logger = createClassLogger("CheckpointGit");

export const getGitRoot = async (cached: string | null | undefined): Promise<string | null> => {
  if (cached !== undefined) return cached;
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
    const root = stdout.trim();
    return root.length > 0 ? root : null;
  } catch {
    return null;
  }
};

export const isGitClean = async (root: string): Promise<boolean> => {
  try {
    const { stdout } = await execa("git", ["status", "--porcelain"], { cwd: root });
    return stdout.trim().length === 0;
  } catch {
    return false;
  }
};

export const buildPatches = async (
  changes: FileChange[],
  gitRoot: string | null
): Promise<FilePatch[]> => {
  if (!gitRoot || changes.length === 0) return [];
  const patches: FilePatch[] = [];
  for (const change of changes) {
    const relative = path.relative(gitRoot, change.path);
    if (!relative || relative.startsWith("..")) continue;
    const normalizedPath = relative.split(path.sep).join("/");
    const oldName = change.before === null ? "/dev/null" : `a/${normalizedPath}`;
    const newName = change.after === null ? "/dev/null" : `b/${normalizedPath}`;
    const patch = createTwoFilesPatch(
      oldName,
      newName,
      change.before ?? "",
      change.after ?? "",
      "",
      "",
      { context: LIMIT.DIFF_CONTEXT_LINES }
    );
    if (patch.trim().length > 0) {
      patches.push({ path: normalizedPath, patch });
    }
  }
  return patches;
};

export const applyGitPatches = async (
  patches: FilePatch[],
  reverse: boolean,
  gitRoot: string | null
): Promise<boolean> => {
  if (patches.length === 0 || !gitRoot) return false;
  const clean = await isGitClean(gitRoot);
  if (!clean) {
    logger.warn("Skipping git apply due to uncommitted changes");
    return false;
  }
  const patchContent = patches.map((entry) => entry.patch).join("\n");
  try {
    const args = ["apply"];
    if (reverse) args.push("--reverse");
    await execa("git", args, { cwd: gitRoot, input: patchContent });
    return true;
  } catch (error) {
    logger.warn("Failed to apply git patches", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

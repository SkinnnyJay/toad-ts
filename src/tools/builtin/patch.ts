import { readFile, writeFile } from "node:fs/promises";
import { ENCODING } from "@/constants/encodings";
import { TOOL_NAME } from "@/constants/tool-names";
import { applyPatch } from "diff";
import type { ToolContext, ToolDefinition, ToolResult } from "../types";

/**
 * Multi-edit/patch tool: apply unified diff patches to files.
 * Supports batch modifications across multiple files.
 */
export const patchTool: ToolDefinition = {
  name: "patch",
  description: "Apply a unified diff patch to one or more files",
  parameters: {
    patch: { type: "string", description: "Unified diff patch content" },
    dryRun: { type: "boolean", description: "If true, validate without applying", optional: true },
  },
  execute: async (
    args: { patch: string; dryRun?: boolean },
    context: ToolContext
  ): Promise<ToolResult> => {
    const { patch: patchContent, dryRun = false } = args;

    if (!patchContent || patchContent.trim().length === 0) {
      return { ok: false, error: "Patch content is empty" };
    }

    // Parse patch to find affected files
    const filePatches = parsePatchFiles(patchContent);
    if (filePatches.length === 0) {
      return { ok: false, error: "No valid file patches found in input" };
    }

    const results: Array<{ file: string; applied: boolean; error?: string }> = [];

    for (const filePatch of filePatches) {
      const filePath = context.resolvePath ? context.resolvePath(filePatch.file) : filePatch.file;

      try {
        const original = await readFile(filePath, ENCODING.UTF8);
        const patched = applyPatch(original, filePatch.patch);

        if (patched === false) {
          results.push({
            file: filePatch.file,
            applied: false,
            error: "Patch does not apply cleanly",
          });
          continue;
        }

        if (!dryRun) {
          await writeFile(filePath, patched, ENCODING.UTF8);
        }
        results.push({ file: filePatch.file, applied: true });
      } catch (error) {
        results.push({
          file: filePatch.file,
          applied: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const applied = results.filter((r) => r.applied).length;
    const failed = results.filter((r) => !r.applied).length;
    const summary = `${applied} file(s) ${dryRun ? "would be " : ""}patched, ${failed} failed`;

    return {
      ok: failed === 0,
      output: { summary, results },
      error: failed > 0 ? `${failed} patch(es) failed to apply` : undefined,
    };
  },
};

interface FilePatch {
  file: string;
  patch: string;
}

const parsePatchFiles = (patchContent: string): FilePatch[] => {
  const patches: FilePatch[] = [];
  const lines = patchContent.split("\n");
  let currentFile: string | null = null;
  let currentPatchLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      const filePath = line
        .slice(4)
        .trim()
        .replace(/^[ab]\//, "");
      if (line.startsWith("+++ ") && filePath !== "/dev/null") {
        currentFile = filePath;
      }
      currentPatchLines.push(line);
    } else if (line.startsWith("diff ")) {
      if (currentFile && currentPatchLines.length > 0) {
        patches.push({ file: currentFile, patch: currentPatchLines.join("\n") });
      }
      currentFile = null;
      currentPatchLines = [line];
    } else {
      currentPatchLines.push(line);
    }
  }

  if (currentFile && currentPatchLines.length > 0) {
    patches.push({ file: currentFile, patch: currentPatchLines.join("\n") });
  }

  return patches;
};

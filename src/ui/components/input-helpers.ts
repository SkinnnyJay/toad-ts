import { readFile } from "node:fs/promises";
import path from "node:path";
import { IGNORE_PATTERN } from "@/constants/ignore-patterns";
import ignore from "ignore";

const toPosix = (value: string): string => value.split(path.sep).join("/");

export const createIgnoreFilter = async (
  cwd: string
): Promise<(relativePath: string) => boolean> => {
  const ig = ignore();
  ig.add(IGNORE_PATTERN.PROJECT_FILES);
  try {
    const gitignore = await readFile(path.join(cwd, ".gitignore"), "utf8");
    ig.add(gitignore);
  } catch (_error) {
    // ignore missing .gitignore
  }
  return (relativePath: string): boolean => ig.ignores(toPosix(relativePath));
};

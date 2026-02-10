import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("InitGenerator");

const TOADSTOOL_MD = "TOADSTOOL.md";
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "coverage",
  ".toadstool",
  ".claude",
  ".cursor",
  ".opencode",
  ".gemini",
]);

const IMPORTANT_FILES = [
  "package.json",
  "tsconfig.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
];

/**
 * Scan project structure and generate a TOADSTOOL.md file with instructions for agents.
 */
export const generateToadstoolMd = async (cwd: string): Promise<string> => {
  const lines: string[] = [];
  lines.push("# TOADSTOOL.md");
  lines.push("");
  lines.push(
    "This file provides guidance to TOADSTOOL and other AI coding agents when working in this repository."
  );
  lines.push("");

  // Detect project type
  const projectInfo = await detectProjectType(cwd);
  if (projectInfo.length > 0) {
    lines.push("## Project Overview");
    lines.push("");
    for (const info of projectInfo) {
      lines.push(`- ${info}`);
    }
    lines.push("");
  }

  // Scan directory structure (top 2 levels)
  const structure = await scanDirectoryStructure(cwd, 2);
  if (structure.length > 0) {
    lines.push("## Project Structure");
    lines.push("");
    lines.push("```");
    for (const entry of structure) {
      lines.push(entry);
    }
    lines.push("```");
    lines.push("");
  }

  lines.push("## Commands");
  lines.push("");
  lines.push("```bash");
  lines.push("# Add your build, test, and dev commands here");
  lines.push("```");
  lines.push("");

  lines.push("## Code Style");
  lines.push("");
  lines.push("- Add project-specific code style guidelines here");
  lines.push("");

  lines.push("## Testing");
  lines.push("");
  lines.push("- Add testing guidelines and instructions here");
  lines.push("");

  const content = lines.join("\n");
  const filePath = join(cwd, TOADSTOOL_MD);
  await writeFile(filePath, content, ENCODING.UTF8);
  logger.info("Generated TOADSTOOL.md", { path: filePath });
  return filePath;
};

const detectProjectType = async (cwd: string): Promise<string[]> => {
  const info: string[] = [];
  for (const file of IMPORTANT_FILES) {
    try {
      await stat(join(cwd, file));
      if (file === "package.json") {
        try {
          const raw = await readFile(join(cwd, file), ENCODING.UTF8);
          const pkg = JSON.parse(raw) as { name?: string; description?: string };
          if (pkg.name) info.push(`Package: ${pkg.name}`);
          if (pkg.description) info.push(`Description: ${pkg.description}`);
        } catch {
          info.push("Node.js project (package.json found)");
        }
      } else if (file === "Cargo.toml") {
        info.push("Rust project (Cargo.toml found)");
      } else if (file === "go.mod") {
        info.push("Go project (go.mod found)");
      } else if (file === "pyproject.toml" || file === "requirements.txt") {
        info.push("Python project");
      }
    } catch {
      // File doesn't exist
    }
  }
  return info;
};

const scanDirectoryStructure = async (
  dir: string,
  maxDepth: number,
  depth = 0
): Promise<string[]> => {
  if (depth >= maxDepth) return [];
  const result: string[] = [];
  try {
    const entries = await readdir(dir);
    const sorted = entries.filter((e) => !e.startsWith(".") || e === ".env.sample").sort();
    for (const entry of sorted) {
      if (IGNORE_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const prefix = "  ".repeat(depth);
      try {
        const entryStat = await stat(fullPath);
        if (entryStat.isDirectory()) {
          result.push(`${prefix}${entry}/`);
          const children = await scanDirectoryStructure(fullPath, maxDepth, depth + 1);
          result.push(...children);
        } else if (depth === 0) {
          result.push(`${prefix}${entry}`);
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // Skip
  }
  return result;
};

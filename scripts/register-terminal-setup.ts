#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { ENCODING } from "@/constants/encodings";
import { FILE_PATH } from "@/constants/file-paths";
import { writeTerminalSetupScript } from "@/utils/terminal-setup";

const CLI_ARG = {
  HELP_SHORT: "-h",
  HELP_LONG: "--help",
  DRY_RUN: "--dry-run",
  WRITE_ONLY: "--write-only",
} as const;

const MARKER = {
  START: "# >>> toadstool setup >>>",
  END: "# <<< toadstool setup <<<",
} as const;

const printHelp = (): void => {
  process.stdout.write("register-terminal-setup\n\n");
  process.stdout.write("Writes the TOADSTOOL terminal setup script to ~/.toadstool\n");
  process.stdout.write("and (by default) registers it in your shell rc file.\n\n");
  process.stdout.write("Usage:\n");
  process.stdout.write("  bun scripts/register-terminal-setup.ts [options]\n\n");
  process.stdout.write("Options:\n");
  process.stdout.write("  --dry-run     Print planned changes; write nothing\n");
  process.stdout.write("  --write-only  Only write the setup script; don't touch rc files\n");
  process.stdout.write("  -h, --help    Show help\n");
};

const getShellRcPath = (homeDir: string): string | null => {
  const shell = process.env.SHELL ?? "";
  const base = path.basename(shell);

  if (base === "zsh") return path.join(homeDir, ".zshrc");
  if (base === "bash") return path.join(homeDir, ".bashrc");

  // Unsupported shells (e.g. fish) need a different snippet format.
  return null;
};

const buildRcSnippet = (scriptPath: string): string => {
  const home = homedir();
  const prettyPath = scriptPath.startsWith(home) ? scriptPath.replace(home, "$HOME") : scriptPath;

  return [
    MARKER.START,
    `if [ -f "${prettyPath}" ]; then`,
    `  source "${prettyPath}"`,
    "fi",
    MARKER.END,
    "",
  ].join("\n");
};

const ensureRcSourcing = async (rcPath: string, snippet: string): Promise<"added" | "present"> => {
  let current = "";
  try {
    current = await readFile(rcPath, ENCODING.UTF8);
  } catch {
    // New file is fine.
  }

  if (current.includes(MARKER.START) && current.includes(MARKER.END)) {
    return "present";
  }

  const next = `${current.replace(/\s*$/, "")}\n\n${snippet}`;
  await writeFile(rcPath, next, ENCODING.UTF8);
  return "added";
};

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has(CLI_ARG.HELP_SHORT) || args.has(CLI_ARG.HELP_LONG)) {
    printHelp();
    return;
  }

  const dryRun = args.has(CLI_ARG.DRY_RUN);
  const writeOnly = args.has(CLI_ARG.WRITE_ONLY);

  const homeDir = homedir();
  const result = await writeTerminalSetupScript(homeDir);

  if (dryRun) {
    process.stdout.write(`Would write terminal setup script: ${result.scriptPath}\n`);
    if (writeOnly) {
      process.stdout.write("Would not modify shell rc files (write-only).\n");
      return;
    }
    const rcPath = getShellRcPath(homeDir);
    if (!rcPath) {
      process.stdout.write("Could not auto-register for your shell.\n");
      process.stdout.write(`Suggested: source ${result.scriptPath}\n`);
      return;
    }
    process.stdout.write(`Would ensure this is registered in: ${rcPath}\n`);
    return;
  }

  process.stdout.write(`Wrote terminal setup script: ${result.scriptPath}\n`);

  if (writeOnly) {
    process.stdout.write("Skipped rc registration (--write-only).\n");
    return;
  }

  const rcPath = getShellRcPath(homeDir);
  if (!rcPath) {
    process.stdout.write(
      "Could not auto-register it for your shell. Add this line to your shell rc:\n"
    );
    process.stdout.write(`  source ${result.scriptPath}\n`);
    return;
  }

  const snippet = buildRcSnippet(result.scriptPath);
  const status = await ensureRcSourcing(rcPath, snippet);

  process.stdout.write(
    status === "added" ? `Registered in: ${rcPath}\n` : `Already registered in: ${rcPath}\n`
  );
  process.stdout.write("Restart your shell (or source your rc) for changes to take effect.\n");
}

await main();

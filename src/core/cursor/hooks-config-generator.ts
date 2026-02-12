/**
 * Hooks Configuration Generator for Cursor CLI integration.
 *
 * Dynamically generates `.cursor/hooks.json` and installs hook shim scripts
 * that route Cursor hook events to TOADSTOOL's IPC server.
 *
 * Features:
 * - Generate hooks.json with all supported hook events
 * - Install hook shim script to project-level .toadstool/hooks/
 * - Merge with existing hooks.json (append, don't overwrite)
 * - Cleanup on disconnect (remove TOADSTOOL hooks, restore originals)
 * - TOADSTOOL_HOOK_SOCKET env var injection
 *
 * @see PLAN2.md — "Milestone 6: Hooks Config Generator + Scripts (Channel 2)"
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, copyFileSync, chmodSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_CURSOR_HOOK_EVENTS,
} from "@/constants/cursor-hook-events";
import type { CursorHookEvent } from "@/constants/cursor-hook-events";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("HooksConfigGenerator");

// ── Types ────────────────────────────────────────────────────

interface HookEntry {
  command: string;
  timeout?: number;
  events?: string[];
}

interface HooksJson {
  version: number;
  hooks: Record<string, HookEntry[]>;
}

export interface HooksConfigGeneratorOptions {
  /** Project root directory (where .cursor/ lives) */
  projectRoot: string;
  /** Socket path for the IPC server */
  socketPath: string;
  /** Timeout overrides per hook event (seconds) */
  timeouts?: Partial<Record<CursorHookEvent, number>>;
  /** Subset of hooks to enable (defaults to all) */
  enabledHooks?: CursorHookEvent[];
  /** Custom hook script path (defaults to bundled toadstool-hook.mjs) */
  hookScriptPath?: string;
}

// ── Default Timeouts ─────────────────────────────────────────

const DEFAULT_HOOK_TIMEOUTS: Partial<Record<CursorHookEvent, number>> = {
  sessionStart: 10,
  preToolUse: 30,
  beforeShellExecution: 60,
  beforeMCPExecution: 30,
  beforeReadFile: 10,
  beforeSubmitPrompt: 10,
  stop: 10,
  subagentStart: 30,
};

// ── Paths ────────────────────────────────────────────────────

const TOADSTOOL_HOOKS_DIR = ".toadstool/hooks";
const TOADSTOOL_HOOK_SCRIPT_NAME = "toadstool-hook.mjs";
const CURSOR_HOOKS_JSON = ".cursor/hooks.json";
const BACKUP_SUFFIX = ".toadstool-backup";

// ── Generator ────────────────────────────────────────────────

export class HooksConfigGenerator {
  private readonly projectRoot: string;
  private readonly socketPath: string;
  private readonly timeouts: Partial<Record<CursorHookEvent, number>>;
  private readonly enabledHooks: CursorHookEvent[];
  private readonly hookScriptSource: string;
  private installedHooksJsonPath: string | null = null;
  private installedShimPath: string | null = null;
  private backedUpOriginal = false;

  constructor(options: HooksConfigGeneratorOptions) {
    this.projectRoot = options.projectRoot;
    this.socketPath = options.socketPath;
    this.timeouts = { ...DEFAULT_HOOK_TIMEOUTS, ...options.timeouts };
    this.enabledHooks = options.enabledHooks ?? [...ALL_CURSOR_HOOK_EVENTS];
    this.hookScriptSource = options.hookScriptPath ?? this.getBundledScriptPath();
  }

  /**
   * Install hooks: create shim script, generate/merge hooks.json.
   */
  install(): { hooksJsonPath: string; shimPath: string; env: Record<string, string> } {
    // 1. Install shim script
    const shimPath = this.installShimScript();
    this.installedShimPath = shimPath;

    // 2. Generate/merge hooks.json
    const hooksJsonPath = this.generateHooksJson(shimPath);
    this.installedHooksJsonPath = hooksJsonPath;

    // 3. Return env vars needed for the shim
    const env: Record<string, string> = {
      TOADSTOOL_HOOK_SOCKET: this.socketPath,
    };

    logger.info("Hooks installed", { hooksJsonPath, shimPath });

    return { hooksJsonPath, shimPath, env };
  }

  /**
   * Uninstall hooks: remove TOADSTOOL hooks, restore originals.
   */
  uninstall(): void {
    const hooksJsonPath = join(this.projectRoot, CURSOR_HOOKS_JSON);
    const backupPath = `${hooksJsonPath}${BACKUP_SUFFIX}`;

    // Restore original hooks.json if we backed it up
    if (this.backedUpOriginal && existsSync(backupPath)) {
      try {
        copyFileSync(backupPath, hooksJsonPath);
        unlinkSync(backupPath);
        logger.debug("Restored original hooks.json");
      } catch (error) {
        logger.warn("Failed to restore hooks.json backup", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (this.installedHooksJsonPath && existsSync(this.installedHooksJsonPath)) {
      // If we created it from scratch, remove it
      try {
        unlinkSync(this.installedHooksJsonPath);
      } catch {
        // Ignore
      }
    }

    // Clean up shim script
    if (this.installedShimPath && existsSync(this.installedShimPath)) {
      try {
        unlinkSync(this.installedShimPath);
      } catch {
        // Ignore
      }
    }

    this.installedHooksJsonPath = null;
    this.installedShimPath = null;
    this.backedUpOriginal = false;

    logger.info("Hooks uninstalled");
  }

  /**
   * Generate the hooks.json content.
   */
  generateHooksJsonContent(shimCommand: string): HooksJson {
    const hooks: Record<string, HookEntry[]> = {};

    for (const eventName of this.enabledHooks) {
      const entry: HookEntry = { command: shimCommand };

      // Add timeout for blocking hooks
      const timeout = this.timeouts[eventName];
      if (timeout !== undefined) {
        entry.timeout = timeout;
      }

      hooks[eventName] = [entry];
    }

    return { version: 1, hooks };
  }

  // ── Internal ───────────────────────────────────────────────

  private installShimScript(): string {
    const hooksDir = join(this.projectRoot, TOADSTOOL_HOOKS_DIR);

    // Ensure directory exists
    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    const destPath = join(hooksDir, TOADSTOOL_HOOK_SCRIPT_NAME);

    // Copy the shim script
    if (existsSync(this.hookScriptSource)) {
      copyFileSync(this.hookScriptSource, destPath);
    } else {
      // Generate inline if bundled script not found
      writeFileSync(destPath, this.generateInlineShimScript());
    }

    // Make executable
    chmodSync(destPath, 0o755);

    return destPath;
  }

  private generateHooksJson(shimPath: string): string {
    const hooksJsonPath = join(this.projectRoot, CURSOR_HOOKS_JSON);
    const cursorDir = dirname(hooksJsonPath);

    // Ensure .cursor/ directory exists
    if (!existsSync(cursorDir)) {
      mkdirSync(cursorDir, { recursive: true });
    }

    // Check for existing hooks.json
    let existingHooks: HooksJson | null = null;
    if (existsSync(hooksJsonPath)) {
      try {
        const content = readFileSync(hooksJsonPath, "utf-8");
        existingHooks = JSON.parse(content) as HooksJson;

        // Backup original
        const backupPath = `${hooksJsonPath}${BACKUP_SUFFIX}`;
        writeFileSync(backupPath, content);
        this.backedUpOriginal = true;
        logger.debug("Backed up existing hooks.json");
      } catch {
        logger.warn("Failed to parse existing hooks.json, overwriting");
      }
    }

    // Generate our hooks
    const toadstoolHooks = this.generateHooksJsonContent(shimPath);

    // Merge if existing hooks found
    const finalHooks = existingHooks
      ? this.mergeHooks(existingHooks, toadstoolHooks)
      : toadstoolHooks;

    writeFileSync(hooksJsonPath, JSON.stringify(finalHooks, null, 2));

    return hooksJsonPath;
  }

  private mergeHooks(existing: HooksJson, toadstool: HooksJson): HooksJson {
    const merged: HooksJson = {
      version: 1,
      hooks: { ...existing.hooks },
    };

    // Append TOADSTOOL hooks to each event (don't overwrite user hooks)
    for (const [eventName, entries] of Object.entries(toadstool.hooks)) {
      const existingEntries = merged.hooks[eventName] ?? [];
      // Filter out any previous TOADSTOOL hooks (by checking for toadstool-hook in command)
      const userEntries = existingEntries.filter(
        (entry) => !entry.command.includes("toadstool-hook"),
      );
      const toadstoolEntries = entries ?? [];
      merged.hooks[eventName] = [...userEntries, ...toadstoolEntries];
    }

    return merged;
  }

  private getBundledScriptPath(): string {
    // Resolve relative to this module
    try {
      return resolve(dirname(fileURLToPath(import.meta.url)), "hook-scripts", TOADSTOOL_HOOK_SCRIPT_NAME);
    } catch {
      // Fallback for CJS or test environments
      return resolve(__dirname, "hook-scripts", TOADSTOOL_HOOK_SCRIPT_NAME);
    }
  }

  private generateInlineShimScript(): string {
    return `#!/usr/bin/env node
import { createConnection } from "node:net";
const SOCKET_PATH = process.env.TOADSTOOL_HOOK_SOCKET;
if (!SOCKET_PATH) { process.stdout.write("{}"); process.exit(0); }
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const input = Buffer.concat(chunks).toString();
  const client = createConnection(SOCKET_PATH, () => { client.write(input); client.end(); });
  let response = "";
  client.on("data", (data) => { response += data.toString(); });
  client.on("end", () => { process.stdout.write(response || "{}"); process.exit(0); });
  client.on("error", () => { process.stdout.write("{}"); process.exit(0); });
  setTimeout(() => { if (!client.destroyed) client.destroy(); process.stdout.write("{}"); process.exit(0); }, 25000);
});
process.stdin.on("error", () => { process.stdout.write("{}"); process.exit(0); });
`;
  }
}

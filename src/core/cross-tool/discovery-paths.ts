import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Discovery path definitions for all AI tool folders.
 * TOADSTOOL loads from all supported tool conventions for zero-migration compatibility.
 */

const home = homedir();

export const TOOL_DIRS = {
  TOADSTOOL: {
    project: ".toadstool",
    global: join(home, ".config", "toadstool"),
  },
  OPENCODE: {
    project: ".opencode",
    global: join(home, ".config", "opencode"),
  },
  CLAUDE: {
    project: ".claude",
    global: join(home, ".claude"),
  },
  CURSOR: {
    project: ".cursor",
    global: join(home, ".cursor"),
  },
  GEMINI: {
    project: ".gemini",
    global: join(home, ".gemini"),
  },
} as const;

export type ToolSource = keyof typeof TOOL_DIRS;

export interface DiscoveryLocation {
  source: ToolSource;
  dir: string;
  scope: "project" | "global";
}

/**
 * Get all discovery locations for a given sub-path (e.g., "skills", "commands", "agents").
 * Returns locations in precedence order (TOADSTOOL first, then OpenCode, Claude, Cursor, Gemini).
 */
export const getDiscoveryLocations = (cwd: string, subPath: string): DiscoveryLocation[] => {
  const locations: DiscoveryLocation[] = [];

  // TOADSTOOL project + global
  locations.push({
    source: "TOADSTOOL",
    dir: join(cwd, TOOL_DIRS.TOADSTOOL.project, subPath),
    scope: "project",
  });
  locations.push({
    source: "TOADSTOOL",
    dir: join(TOOL_DIRS.TOADSTOOL.global, subPath),
    scope: "global",
  });

  // OpenCode project + global
  locations.push({
    source: "OPENCODE",
    dir: join(cwd, TOOL_DIRS.OPENCODE.project, subPath),
    scope: "project",
  });
  locations.push({
    source: "OPENCODE",
    dir: join(TOOL_DIRS.OPENCODE.global, subPath),
    scope: "global",
  });

  // Claude project + global
  locations.push({
    source: "CLAUDE",
    dir: join(cwd, TOOL_DIRS.CLAUDE.project, subPath),
    scope: "project",
  });
  locations.push({
    source: "CLAUDE",
    dir: join(TOOL_DIRS.CLAUDE.global, subPath),
    scope: "global",
  });

  // Cursor project (no global skills convention)
  locations.push({
    source: "CURSOR",
    dir: join(cwd, TOOL_DIRS.CURSOR.project, subPath),
    scope: "project",
  });

  // Gemini project + global
  locations.push({
    source: "GEMINI",
    dir: join(cwd, TOOL_DIRS.GEMINI.project, subPath),
    scope: "project",
  });
  locations.push({
    source: "GEMINI",
    dir: join(TOOL_DIRS.GEMINI.global, subPath),
    scope: "global",
  });

  return locations;
};

/** Get the OpenCode singular "command" path (note: singular, not plural) */
export const getOpenCodeCommandPath = (cwd: string): string =>
  join(cwd, TOOL_DIRS.OPENCODE.project, "command");

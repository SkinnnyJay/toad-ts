import type { PermissionsConfig } from "@/config/app-config";
import { PERMISSION_PATTERN } from "@/constants/permission-patterns";
import { PERMISSION } from "@/constants/permissions";

export const PERMISSION_MODE = {
  AUTO_ACCEPT: "auto-accept",
  PLAN: "plan",
  NORMAL: "normal",
} as const;

export type PermissionMode = (typeof PERMISSION_MODE)[keyof typeof PERMISSION_MODE];

const PERMISSION_MODE_ORDER: PermissionMode[] = [
  PERMISSION_MODE.NORMAL,
  PERMISSION_MODE.PLAN,
  PERMISSION_MODE.AUTO_ACCEPT,
];

export const cyclePermissionMode = (current: PermissionMode): PermissionMode => {
  const index = PERMISSION_MODE_ORDER.indexOf(current);
  if (index < 0) return PERMISSION_MODE.NORMAL;
  const nextIndex = (index + 1) % PERMISSION_MODE_ORDER.length;
  return PERMISSION_MODE_ORDER[nextIndex] ?? PERMISSION_MODE.NORMAL;
};

/**
 * Match a tool name against a glob-style permission rule.
 * Supports * wildcard patterns.
 */
const matchGlob = (toolName: string, pattern: string): boolean => {
  if (pattern === PERMISSION_PATTERN.WILDCARD) return true;
  const regex = new RegExp(`^${pattern.replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
  return regex.test(toolName);
};

/**
 * Resolve the permission for a specific tool based on the permission mode and rules.
 */
export const resolveToolPermission = (
  toolName: string,
  mode: PermissionMode,
  rules: Record<string, "allow" | "deny" | "ask">
): string => {
  // Check explicit rules first (most specific wins)
  for (const [pattern, permission] of Object.entries(rules)) {
    if (matchGlob(toolName, pattern)) {
      return permission;
    }
  }

  // Fall back to mode defaults
  switch (mode) {
    case PERMISSION_MODE.AUTO_ACCEPT:
      return PERMISSION.ALLOW;
    case PERMISSION_MODE.PLAN:
      // Plan mode: allow reads, ask for writes/executes
      if (isReadOnlyTool(toolName)) return PERMISSION.ALLOW;
      return PERMISSION.ASK;
    default:
      if (isReadOnlyTool(toolName)) return PERMISSION.ALLOW;
      if (isDangerousTool(toolName)) return PERMISSION.DENY;
      return PERMISSION.ASK;
  }
};

const READ_ONLY_TOOLS = new Set(["read", "grep", "glob", "list", "todoread", "question", "skill"]);
const DANGEROUS_PATTERNS = ["rm ", "rm -rf", "drop ", "delete", "truncate"];

const isReadOnlyTool = (toolName: string): boolean => READ_ONLY_TOOLS.has(toolName.toLowerCase());

const isDangerousTool = (toolName: string): boolean =>
  DANGEROUS_PATTERNS.some((pattern) => toolName.toLowerCase().includes(pattern));

/**
 * Create a permissions resolver from config.
 */
const isPermissionMode = (value: string): value is PermissionMode =>
  PERMISSION_MODE_ORDER.includes(value as PermissionMode);

export const createPermissionResolver = (config: PermissionsConfig) => {
  const rawMode = config.mode ?? PERMISSION_MODE.NORMAL;
  const mode: PermissionMode = isPermissionMode(rawMode) ? rawMode : PERMISSION_MODE.NORMAL;
  const rules = config.rules ?? {};

  return {
    mode,
    resolve: (toolName: string) => resolveToolPermission(toolName, mode, rules),
    cycle: () => cyclePermissionMode(mode),
  };
};

import { PERMISSION_PATTERN } from "@/constants/permission-patterns";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("SkillPermissions");

export type SkillPermission = "allow" | "deny" | "ask";

export interface SkillPermissionConfig {
  rules: Record<string, SkillPermission>;
}

const DEFAULT_PERMISSION: SkillPermission = "allow";

/**
 * Match a skill name against a glob-style permission rule.
 */
const matchGlob = (name: string, pattern: string): boolean => {
  if (pattern === PERMISSION_PATTERN.WILDCARD) return true;
  const regex = new RegExp(`^${pattern.replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
  return regex.test(name);
};

/**
 * Resolve permission for a specific skill based on configured rules.
 */
export const resolveSkillPermission = (
  skillName: string,
  config: SkillPermissionConfig
): SkillPermission => {
  for (const [pattern, permission] of Object.entries(config.rules)) {
    if (matchGlob(skillName, pattern)) {
      return permission;
    }
  }
  return DEFAULT_PERMISSION;
};

/**
 * Check if a skill is allowed to be loaded.
 */
export const isSkillAllowed = (skillName: string, config: SkillPermissionConfig): boolean =>
  resolveSkillPermission(skillName, config) !== "deny";

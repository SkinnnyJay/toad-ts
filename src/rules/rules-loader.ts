import { readFile } from "node:fs/promises";
import path from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import {
  PERMISSION_RULES_FILE,
  RULES_SUBDIR,
  RULE_SOURCE_PRECEDENCE,
  type RuleSource,
} from "@/constants/rule-sources";
import { type PermissionRules, permissionRulesSchema } from "@/rules/permission-rules";
import fg from "fast-glob";

export interface RuleDocument {
  source: RuleSource;
  path: string;
  content: string;
}

export interface RulesLoadResult {
  rules: RuleDocument[];
  permissions: PermissionRules;
}

export interface LoadRulesOptions {
  projectRoot?: string;
  permissionDefaults?: PermissionRules;
}

const rulePatternsForSource = (projectRoot: string, source: RuleSource): string[] => {
  const rulesDir = path.join(projectRoot, source, RULES_SUBDIR);
  return [path.join(rulesDir, "*.md"), path.join(rulesDir, "*.mdc")];
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const loadRuleFiles = async (projectRoot: string, source: RuleSource): Promise<RuleDocument[]> => {
  const patterns = rulePatternsForSource(projectRoot, source);
  const files = await fg(patterns, { onlyFiles: true, dot: true });
  const entries = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, ENCODING.UTF8);
      return { source, path: filePath, content };
    })
  );
  return entries;
};

const loadPermissionRules = async (
  projectRoot: string,
  source: RuleSource
): Promise<PermissionRules | null> => {
  const permissionPath = path.join(projectRoot, source, PERMISSION_RULES_FILE);
  try {
    const raw = await readFile(permissionPath, ENCODING.UTF8);
    const parsed: unknown = JSON.parse(raw);
    return permissionRulesSchema.parse(parsed);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return null;
    }
    if (error instanceof Error) {
      error.message = `Invalid permission rules at ${permissionPath}: ${error.message}`;
    }
    throw error;
  }
};

const mergePermissions = (base: PermissionRules, override: PermissionRules): PermissionRules => ({
  ...base,
  ...override,
});

export const loadRules = async ({
  projectRoot = process.cwd(),
  permissionDefaults = {},
}: LoadRulesOptions = {}): Promise<RulesLoadResult> => {
  const rules: RuleDocument[] = [];
  let permissions: PermissionRules = { ...permissionDefaults };

  for (const source of RULE_SOURCE_PRECEDENCE) {
    const docs = await loadRuleFiles(projectRoot, source);
    rules.push(...docs);
    const permissionOverrides = await loadPermissionRules(projectRoot, source);
    if (permissionOverrides) {
      permissions = mergePermissions(permissions, permissionOverrides);
    }
  }

  return { rules, permissions };
};

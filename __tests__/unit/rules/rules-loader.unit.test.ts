import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PERMISSION } from "@/constants/permissions";
import { PERMISSION_RULES_FILE, RULES_SUBDIR, RULE_SOURCE } from "@/constants/rule-sources";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { loadRules } from "@/rules/rules-loader";
import { describe, expect, it } from "vitest";

const createTempRoot = async (): Promise<string> => mkdtemp(join(tmpdir(), "toad-rules-"));

const writeRuleFile = async (
  root: string,
  source: string,
  filename: string,
  content: string
): Promise<void> => {
  const rulesDir = join(root, source, RULES_SUBDIR);
  await mkdir(rulesDir, { recursive: true });
  await writeFile(join(rulesDir, filename), content, "utf8");
};

const writePermissionRules = async (
  root: string,
  source: string,
  permissions: Record<string, string>
): Promise<void> => {
  const dir = join(root, source);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, PERMISSION_RULES_FILE), JSON.stringify(permissions, null, 2), "utf8");
};

describe("loadRules", () => {
  it("loads rule files in source precedence order", async () => {
    const root = await createTempRoot();
    await writeRuleFile(root, RULE_SOURCE.GEMINI, "gemini.md", "gemini rules");
    await writeRuleFile(root, RULE_SOURCE.TOADSTOOL, "toad.mdc", "toad rules");

    const result = await loadRules({ projectRoot: root });
    const sources = result.rules.map((rule) => rule.source);

    expect(sources).toEqual([RULE_SOURCE.GEMINI, RULE_SOURCE.TOADSTOOL]);
    expect(result.rules.map((rule) => rule.content)).toEqual(["gemini rules", "toad rules"]);
  });

  it("merges permission rules using precedence", async () => {
    const root = await createTempRoot();
    await writePermissionRules(root, RULE_SOURCE.CURSOR, {
      [TOOL_KIND.EXECUTE]: PERMISSION.DENY,
    });
    await writePermissionRules(root, RULE_SOURCE.TOADSTOOL, {
      [TOOL_KIND.EXECUTE]: PERMISSION.ALLOW,
    });

    const result = await loadRules({ projectRoot: root });

    expect(result.permissions[TOOL_KIND.EXECUTE]).toBe(PERMISSION.ALLOW);
  });
});

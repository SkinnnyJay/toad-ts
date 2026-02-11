import { existsSync } from "node:fs";
import path from "node:path";
import { REPO_WORKFLOW_ACTION } from "@/constants/repo-workflow-actions";
import { describe, expect, it } from "vitest";

const REQUIRED_WORKFLOW_SKILLS = [
  "create-pr",
  "commit-changes",
  "address-feedback",
  "resolve-conflicts",
  "fix-ci",
  "merge-pr",
  "cleanup-branch",
] as const;

describe("repo-workflow actions", () => {
  it("contains all required workflow skill mappings", () => {
    const skillSet = new Set(Object.values(REPO_WORKFLOW_ACTION).map((action) => action.skill));
    for (const skill of REQUIRED_WORKFLOW_SKILLS) {
      expect(skillSet.has(skill)).toBe(true);
    }
  });

  it("has a skill definition file for every mapped action", () => {
    for (const action of Object.values(REPO_WORKFLOW_ACTION)) {
      const skillPath = path.join(process.cwd(), ".toadstool", "skills", action.skill, "SKILL.md");
      expect(existsSync(skillPath)).toBe(true);
    }
  });
});

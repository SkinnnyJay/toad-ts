import { REPO_WORKFLOW_ACTION } from "@/constants/repo-workflow-actions";
import { getRepoWorkflowSkillPrompt } from "@/constants/repo-workflow-skill-prompts";
import { describe, expect, it } from "vitest";

describe("repo-workflow skill prompt mapping", () => {
  it("provides fallback prompt text for every workflow action skill", () => {
    for (const action of Object.values(REPO_WORKFLOW_ACTION)) {
      const prompt = getRepoWorkflowSkillPrompt(action.skill);
      expect(typeof prompt).toBe("string");
      expect((prompt ?? "").length).toBeGreaterThan(10);
    }
  });

  it("returns undefined for unknown skill names", () => {
    expect(getRepoWorkflowSkillPrompt("does-not-exist")).toBeUndefined();
  });
});

export const REPO_WORKFLOW_SKILL_PROMPT = {
  "create-pr":
    "Create a pull request from the current branch. Summarize key changes, risks, and testing performed.",
  "commit-changes":
    "Stage the relevant files, write a clear conventional commit message, and push the branch.",
  "push-and-create-pr":
    "Push the current branch and create a pull request with a concise summary and testing notes.",
  "mark-ready":
    "Mark the current draft pull request as ready for review and summarize what is ready to review.",
  "request-review":
    "Request review on the current pull request and propose the right reviewers based on changed files.",
  "check-review":
    "Check the pull request review and checks status, then summarize blockers and next steps.",
  "address-feedback":
    "Review requested changes on the pull request, implement fixes, and summarize what was updated.",
  "merge-pr":
    "Verify pull request checks/reviews and merge the pull request using the safest available strategy.",
  "resolve-conflicts":
    "Resolve current merge conflicts, explain decisions, and confirm the branch is conflict-free.",
  "fix-ci":
    "Investigate failing CI checks, fix the root cause, and report the validation evidence.",
  "cleanup-branch":
    "After merge, clean up local/remote branch state and switch to the default branch.",
  "reopen-or-new":
    "Decide whether to reopen the closed pull request or create a new one, then proceed accordingly.",
} as const;

export type RepoWorkflowSkillName = keyof typeof REPO_WORKFLOW_SKILL_PROMPT;

const isRepoWorkflowSkillName = (skillName: string): skillName is RepoWorkflowSkillName => {
  return Object.prototype.hasOwnProperty.call(REPO_WORKFLOW_SKILL_PROMPT, skillName);
};

export const getRepoWorkflowSkillPrompt = (skillName: string): string | undefined => {
  if (!isRepoWorkflowSkillName(skillName)) {
    return undefined;
  }
  return REPO_WORKFLOW_SKILL_PROMPT[skillName];
};

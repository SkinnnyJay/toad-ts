---
name: merge-pr
description: Merge an approved pull request safely
---

Merge the current PR with repository conventions.

Checklist:
1. Confirm approvals and green checks: `gh pr checks`
2. Confirm final diff and commit list.
3. Merge with default strategy (or requested one):
   `gh pr merge --squash --delete-branch`
4. Confirm merge commit and branch cleanup.
5. Share post-merge status and follow-up work.

---
name: resolve-conflicts
description: Resolve merge conflicts and validate the branch
---

Resolve merge conflicts carefully and verify behavior.

Checklist:
1. Update base branch refs: `git fetch origin`
2. Rebase or merge latest base into feature branch.
3. Resolve conflict markers in each file.
4. Run lint/typecheck/tests for changed scope.
5. Commit conflict resolution and push.

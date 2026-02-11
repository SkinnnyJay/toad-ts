---
name: reopen-or-new
description: Reopen a closed PR or create a replacement PR
---

Determine whether to reopen a PR or create a fresh one.

Checklist:
1. Inspect closed PR reason and branch state.
2. Reopen if branch and context are still valid: `gh pr reopen`.
3. Otherwise create a replacement PR with updated context.
4. Link old and new PRs in comments.

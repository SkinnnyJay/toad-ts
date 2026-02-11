---
name: mark-ready
description: Convert a draft pull request to ready-for-review
---

Mark the current draft PR as ready and notify reviewers.

Checklist:
1. Confirm draft PR status: `gh pr view --json isDraft`
2. Mark ready: `gh pr ready`
3. Add summary comment with testing evidence.

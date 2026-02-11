---
name: push-and-create-pr
description: Push ahead commits and open a pull request
---

Push local commits and create a new pull request.

Checklist:
1. Push current branch upstream.
2. Generate PR title/body from commit range.
3. Create PR with `gh pr create --fill`.
4. Return PR URL and review recommendations.

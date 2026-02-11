---
name: check-review
description: Check pull request review state and comments
---

Inspect review status and summarize next actions.

Checklist:
1. Retrieve review state: `gh pr view --json reviewDecision,comments,reviews`
2. Categorize open reviewer requests and blockers.
3. Provide a concise action plan for closure.

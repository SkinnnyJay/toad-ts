---
name: address-feedback
description: Read PR feedback and implement requested changes
---

Resolve PR review comments and prepare an updated submission.

Checklist:
1. Fetch review comments: `gh pr view --comments`
2. Group feedback into actionable tasks.
3. Implement fixes with tests for each group.
4. Commit and push updates.
5. Post follow-up summary: `gh pr comment --body "<resolution summary>"`

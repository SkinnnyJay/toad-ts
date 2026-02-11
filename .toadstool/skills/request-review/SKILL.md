---
name: request-review
description: Request review on an open pull request
---

Request review from appropriate teammates for the current PR.

Checklist:
1. Inspect PR metadata and changed areas.
2. Select reviewers with relevant ownership.
3. Request review via GitHub CLI:
   `gh pr edit --add-reviewer <user1,user2>`
4. Post a concise context comment.

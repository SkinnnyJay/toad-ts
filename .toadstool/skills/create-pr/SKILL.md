---
name: create-pr
description: Create a pull request for the current branch
---

Create a high-quality pull request using the current branch diff.

Checklist:
1. Verify branch is pushed: `git push -u origin "$(git branch --show-current)"`
2. Summarize changes from `git log --oneline origin/main..HEAD`
3. Generate a concise PR title and body with testing evidence.
4. Create PR: `gh pr create --fill --title "<TITLE>" --body "<BODY>"`
5. Return PR URL and next review step.

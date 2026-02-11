---
name: commit-changes
description: Stage, commit, and push local repository changes
---

Commit local changes with a clear message and push upstream.

Checklist:
1. Review changed files: `git status --short`
2. Summarize intent from diff: `git diff --stat`
3. Stage all intended changes: `git add -A`
4. Commit with conventional message: `git commit -m "<type>: <summary>"`
5. Push branch: `git push -u origin "$(git branch --show-current)"`

---
name: cleanup-branch
description: Clean up merged branch and sync local main
---

Remove merged branch artifacts and restore clean local state.

Checklist:
1. Switch to main: `git checkout main`
2. Pull latest main: `git pull origin main`
3. Delete merged feature branch locally.
4. Delete remote branch if still present.
5. Confirm clean status: `git status --short`

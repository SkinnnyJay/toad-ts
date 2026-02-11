---
name: fix-ci
description: Inspect failing CI jobs and land a corrective fix
---

Investigate failing CI runs and produce a verified fix.

Checklist:
1. Inspect latest run: `gh run list --limit 5`
2. Open failing run logs: `gh run view <run-id> --log-failed`
3. Identify root cause and reproduce locally.
4. Implement targeted fix with regression test.
5. Re-run relevant local checks and push.

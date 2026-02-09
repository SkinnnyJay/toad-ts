---
name: commit
description: Logically groups changed files into atomic commits with conventional format. Use when ready to commit staged work.
---

# Smart Commit

Group changed files into logical, atomic commits using the project's conventional commit format.

## Commit Format

```
agora:<type>(<scope>): <summary>
```

- **Types**: feat, fix, chore, refactor, docs, test
- **Scope**: affected area (api, ui, orchestration, memory, auth, etc.)
- **Summary**: present tense, imperative mood, under 72 chars

## Examples

```
agora:feat(orchestration): add retry logic to agent run queue
agora:fix(api): handle null chat in schedule-runs endpoint
agora:chore(deps): bump next to 14.2.1
agora:refactor(memory): extract storage interface from hybrid backend
agora:docs(readme): update architecture diagram
agora:test(e2e): add deliberation flow spec
```

## Process

1. Run `git status` and `git diff --staged` to see all changes
2. Analyze changed files and group by logical change
3. Stage each group: `git add <files>`
4. Commit with proper format
5. Repeat for each logical group
6. Verify with `git log --oneline -5`

## Rules

- One logical change per commit
- Never commit `.env`, credentials, or secrets
- Run `npm run lint && npm run typecheck` before committing
- Include Prisma migration IDs when schema changes are present

---
name: commit
description: Logically groups changed files into commits with concise messages following project:type(scope) format.
---

# Commit

Logically group the files into commits and give them short concise messages prefixed with the project (search-algorithms, websocket) and the type (feat, chore, doc, fix).

## Format

```
project:type(scope): message
```

## Examples

- `pagination:feat(ui): added pagination component`
- `auth:fix(api): corrected token validation`
- `docs:chore(readme): updated installation steps`

## Process

1. Review all changed files
2. Group related changes logically
3. Create commits with descriptive messages following the format
4. Ensure each commit is atomic and focused on a single concern

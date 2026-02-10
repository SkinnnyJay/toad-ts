# Contributing to TOADSTOOL

Thanks for helping improve TOADSTOOL. This repo follows strict TypeScript and UX quality gates.

## Development

```bash
bun install
bun run dev
```

## Quality Gates

Before opening a PR, run:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build
bun run check:literals
```

## Tests

- Unit: `bun run test:unit`
- Integration: `bun run test:integration`
- E2E: `bun run test:e2e`

## Code Standards

- TypeScript strict mode (no `any`, no unsafe casts).
- Extract magic literals into constants.
- Prefer small, composable functions.
- Add or update tests for new behavior.

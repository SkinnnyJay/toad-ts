# Contributing to TOADSTOOL

Thanks for helping improve TOADSTOOL. This repo follows strict TypeScript and UX quality gates.

## Development

```bash
npm install --legacy-peer-deps
npm run dev
```

## Quality Gates

Before opening a PR, run:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:literals
```

## Tests

- Unit: `npm run test:unit`
- Integration: `npm run test:integration`
- E2E: `npm run test:e2e`

## Code Standards

- TypeScript strict mode (no `any`, no unsafe casts).
- Extract magic literals into constants.
- Prefer small, composable functions.
- Add or update tests for new behavior.

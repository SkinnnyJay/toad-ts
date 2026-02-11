# Contributing to TOADSTOOL

Thank you for your interest in contributing to TOADSTOOL! This guide will help you get started.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) 1.0+ (primary runtime)
- [Node.js](https://nodejs.org) 20+ (for Prisma and some tooling)
- Git

### Getting Started

```bash
git clone https://github.com/your-org/toadstool-ts.git
cd toadstool-ts
bun install
bunx prisma generate
bun run build
```

### Verify Everything Works

```bash
bun run typecheck   # TypeScript type checking
bun run lint        # Biome + ESLint
bun run test        # Vitest test suite
bun run build       # tsup build
```

## Code Style

- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- **Biome** for linting and formatting (2-space indent, 100 char width, double quotes, semicolons)
- **ESM-only** (`"type": "module"`)
- **Zod** for runtime validation of all domain types
- **No `any`** — use explicit types or `unknown` with type guards
- **No `console.log`** — use logger from `src/utils/logging/`
- **Constants over literals** — extract magic strings/numbers to `src/constants/`
- Path alias: `@/` maps to `src/`

## Project Structure

```
src/
├── agents/      # Agent system
├── config/      # Configuration with Zod schemas
├── constants/   # Typed constant maps
├── core/        # Core infrastructure
├── server/      # HTTP/WebSocket server
├── store/       # Zustand state management
├── tools/       # Tool registry
├── types/       # TypeScript types
├── ui/          # OpenTUI React components
└── utils/       # Shared utilities
```

## Testing

- **Vitest** with globals enabled
- Test files: `__tests__/<unit|integration>/<domain>/<name>.<unit|integration>.test.ts`
- Target ≥ 95% coverage for changed/added code
- Run a single test: `bunx vitest run __tests__/unit/core/message-handler.unit.test.ts`

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
toad:<type>(<scope>): <summary>
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`

Examples:
```
toad:feat(tools): add webfetch tool with content extraction
toad:fix(sqlite): ensure parent directory exists before creating db
toad:chore(deps): update @opentui/core to 0.1.78
```

## Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with tests
4. Ensure all quality gates pass: `bun run typecheck && bun run lint && bun run test && bun run build`
5. Submit a PR with a clear description

## Quality Gates

Every change must pass:

```bash
bun run format      # Code formatting
bun run lint        # Linting
bun run typecheck   # Type checking
bun run test        # Test suite
bun run build       # Build verification
```

## Adding a New Feature

1. Define types/interfaces in `src/types/` or alongside the module
2. Add constants to `src/constants/` (no magic strings/numbers)
3. Implement the feature with proper error handling
4. Add unit tests (≥ 95% coverage)
5. Update relevant documentation

## Adding a Provider

1. Create adapter in `src/core/providers/` implementing `ProviderAdapter`
2. Add model catalog with context windows and capabilities
3. Register in `provider-registry.ts`
4. Add health check implementation
5. Add tests

## Security

- Never commit `.env`, credentials, or secrets
- Use `.env.sample` for documenting required keys
- Validate all external data with Zod schemas
- Run custom tools in isolated subprocesses

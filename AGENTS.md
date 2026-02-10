# Repository Guidelines

These guidelines apply to all AI coding agents working in this repository.

## Project Overview

TOADSTOOL (Terminal Orchestration for AI Development) is a unified terminal interface for AI coding agents. Built with TypeScript, Ink (React for CLIs), and Zustand for state management. It connects to ACP-compatible agents (Claude CLI, Gemini CLI, Codex CLI) with streaming responses, session persistence, and rich markdown rendering.

## Project Structure

```
src/
├── cli.ts               # CLI entry point (Commander)
├── index.ts             # App bootstrap (Ink render)
├── config/              # Runtime configuration (limits, timeouts, UI)
├── constants/           # Typed constant maps (status enums, colors, keys)
├── core/                # Core infrastructure (ACP client, session, streaming)
├── harness/             # Agent harness registry (multi-agent support)
├── store/               # Zustand state management + persistence (SQLite/JSON)
├── types/               # TypeScript type definitions
├── ui/                  # Ink/React UI (components + hooks)
└── utils/               # Shared utilities (env, logging, token-optimizer)
```

## Build, Test, and Development Commands

```bash
bun run dev              # Run with tsx (development mode)
bun run dev:watch        # Run with tsx in watch mode
bun run build            # Build with tsup (outputs to dist/)
bun run start            # Execute the compiled CLI from dist/
bun run test             # Run all tests with vitest
bun run test:unit        # Run unit tests only
bun run test:integration # Run integration tests
bun run test:e2e         # Run end-to-end tests
bun run test:coverage    # Run tests with coverage report
bun run lint             # Lint with Biome + ESLint
bun run lint:fix         # Lint and auto-fix
bun run format           # Format with Biome
bun run typecheck        # TypeScript type checking (tsc --noEmit)
bun run check:literals   # Check for magic literals
bun run build:test:all   # Full quality gate (clean + typecheck + format + lint + build + tests)
```

## Coding Style & Naming Conventions

- TypeScript strict mode, ESM-only (`"type": "module"`)
- Biome enforces 2-space indent, 100 char line width, double quotes, semicolons
- camelCase files (e.g., `sessionManager.ts`), utility suffixes (`*.utils.ts`), type files (`*.types.ts`)
- Path alias `@/` maps to `src/`
- No `any` types; use explicit types or `unknown` with type guards
- No raw `process.env`; use `Env` from `src/utils/env/`
- No `console.log`; use logger from `src/utils/logging/`
- Extract magic strings/numbers to `src/constants/`
- Zod schemas for all domain types and runtime validation

## Testing Guidelines

- Framework: Vitest with globals enabled
- Test files: `__tests__/<unit|integration>/<domain>/<name>.<unit|integration>.test.ts`
- Run a single test: `bunx vitest run __tests__/unit/core/message-handler.unit.test.ts`
- Target >= 95% coverage for changed/added units
- Separate configs: `vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.e2e.config.ts`

## Commit & Pull Request Guidelines

- Conventional Commits format: `toad:<type>(<scope>): <summary>`
- Types: feat, fix, chore, refactor, docs, test
- Present tense, imperative mood, under 72 characters
- Never commit `.env`, credentials, or secrets

## Security & Configuration

- Use `.env.sample` to create local `.env`; never commit secrets
- Required keys: `ANTHROPIC_API_KEY`; optional: `OPENAI_API_KEY`, `LOG_LEVEL`
- Target Node.js 20+ per `package.json` engines

## Execution Verification Policy

Never claim lint/typecheck/test/build were run unless the exact commands completed successfully. For every change cycle, run and verify: `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`. If any command fails, surface the error and do not proceed.

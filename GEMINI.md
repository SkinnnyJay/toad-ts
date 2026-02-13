# GEMINI.md

This file provides guidance to Google Gemini (Gemini CLI) when working with code in this repository.

## Project Overview

TOADSTOOL (Terminal Orchestration for AI Development) is a unified terminal interface for AI coding agents. Built with TypeScript, Ink (React for CLIs), and Zustand for state management. It connects to ACP-compatible agents (Claude CLI, Gemini CLI, Codex CLI) with streaming responses, session persistence, and rich markdown rendering.

## Commands

```bash
# Development
bun run dev              # Run with tsx (development mode)
bun run dev:watch        # Run with tsx in watch mode

# Build
bun run build            # Build with tsup (outputs to dist/)
bun run clean            # Remove dist/
bun run start            # Execute the compiled CLI from dist/

# Testing
bun run test             # Run all tests with vitest
bun run test:watch       # Run tests in watch mode
bun run test:unit        # Run unit tests only (__tests__/unit)
bun run test:integration # Run integration tests (__tests__/integration)
bun run test:e2e         # Run end-to-end tests (__tests__/e2e)
bun run test:coverage    # Run tests with coverage report

# Run a single test file
bunx vitest run __tests__/unit/core/message-handler.unit.test.ts

# Code Quality
bun run typecheck        # TypeScript type checking (tsc --noEmit)
bun run lint             # Lint with Biome + ESLint
bun run lint:fix         # Lint and auto-fix with Biome + ESLint
bun run format           # Format with Biome
bun run format:check     # Check formatting without writing changes
bun run check:literals   # Check for magic literals
bun run check:literals:strict # Fail on any magic literal finding

# Database
bun run db:clear         # Clear SQLite database
bun run db:migrate       # Run database migrations
bun run db:reset         # Clear and re-migrate

# Full quality gate
bun run build:test:all   # clean + typecheck + format:check + lint + check:literals:strict + build + test:unit + test:integration + test:e2e
```

## Architecture

### Directory Structure

```
src/
├── cli.ts                    # CLI entry point (Commander)
├── index.ts                  # App bootstrap (Ink render)
├── config/                   # Runtime configuration (limits, timeouts, UI)
├── constants/                # Typed constant maps (status enums, colors, keys)
├── core/                     # Core infrastructure (ACP client, session, streaming)
├── harness/                  # Agent harness registry (multi-agent support)
├── store/                    # Zustand state management + SQLite/JSON persistence
├── types/                    # TypeScript type definitions
├── ui/                       # Ink/React UI (components + hooks)
└── utils/                    # Shared utilities (env, logging, token-optimizer)
```

### Key Patterns

- **ACP Protocol**: Agent Client Protocol for communicating with AI agents
- **Harness System**: Pluggable agent harnesses via `harnessRegistry.ts`
- **Zustand Store**: Single `app-store.ts` for global state
- **Persistence**: SQLite (primary) + JSON (fallback) via `persistence-manager.ts`
- **Streaming**: Real-time token rendering via `session-stream.ts`
- **Constants**: All magic strings/numbers extracted to `src/constants/`

## Code Style

- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- **Biome** for linting/formatting (2-space indent, 100 char width, double quotes, semicolons)
- **ESM-only** (`"type": "module"`)
- **Zod** for runtime validation
- **No `any`** types; use `unknown` with type guards
- **No raw `process.env`**; use `Env` from `src/utils/env/`
- **No `console.log`**; use logger from `src/utils/logging/`
- Path alias: `@/` maps to `src/`

## Testing

- **Vitest** with globals enabled
- Test files: `__tests__/<unit|integration>/<domain>/<name>.<unit|integration>.test.ts`
- Target >= 95% coverage per changed/added unit
- Test groups are split by path: `__tests__/unit`, `__tests__/integration`, `__tests__/e2e`

## Execution Verification Policy

Never claim lint/typecheck/test/build were run unless the exact commands completed successfully. For every change cycle, run and verify: `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`. If any command fails, surface the error and do not proceed.

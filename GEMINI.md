# GEMINI.md

This file provides guidance to Google Gemini (Gemini CLI) when working with code in this repository.

## Project Overview

TOADSTOOL (Terminal Orchestration for AI Development) is a unified terminal interface for AI coding agents. Built with TypeScript, Ink (React for CLIs), and Zustand for state management. It connects to ACP-compatible agents (Claude CLI, Gemini CLI, Codex CLI) with streaming responses, session persistence, and rich markdown rendering.

## Commands

```bash
# Development
npm run dev              # Run with tsx (development mode)
npm run dev:watch        # Run with tsx in watch mode

# Build
npm run build            # Build with tsup (outputs to dist/)
npm run clean            # Remove dist/
npm start                # Execute the compiled CLI from dist/

# Testing
npm test                 # Run all tests with vitest
npm run test:watch       # Run tests in watch mode
npm run test:unit        # Run unit tests only (vitest.unit.config.ts)
npm run test:integration # Run integration tests (vitest.integration.config.ts)
npm run test:e2e         # Run end-to-end tests (vitest.e2e.config.ts)
npm run test:coverage    # Run tests with coverage report

# Run a single test file
npx vitest run __tests__/unit/core/message-handler.unit.test.ts

# Code Quality
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run lint             # Lint with Biome + ESLint
npm run lint:fix         # Lint and auto-fix with Biome + ESLint
npm run format           # Format with Biome
npm run check:literals   # Check for magic literals

# Database
npm run db:clear         # Clear SQLite database
npm run db:migrate       # Run database migrations
npm run db:reset         # Clear and re-migrate

# Full quality gate
npm run build:test:all   # clean + typecheck + format + lint + build + test:unit + test:integration + test:e2e
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
- Separate configs for unit, integration, and e2e

## Execution Verification Policy

Never claim lint/typecheck/test/build were run unless the exact commands completed successfully. For every change cycle, run and verify: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. If any command fails, surface the error and do not proceed.

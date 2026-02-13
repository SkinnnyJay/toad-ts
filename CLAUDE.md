# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
bun run check:literals   # Check for magic literals
bun run check:literals:strict # Fail on any magic literal finding

# Database
bun run db:clear         # Clear SQLite database
bun run db:migrate       # Run database migrations
bun run db:reset         # Clear and re-migrate

# Full quality gate
bun run build:test:all   # clean + typecheck + format + lint + check:literals:strict + build + test:unit + test:integration + test:e2e
```

## Architecture

### Directory Structure

```
src/
├── cli.ts                    # CLI entry point (Commander)
├── index.ts                  # App bootstrap (Ink render)
├── config/                   # Runtime configuration (limits, timeouts, UI)
├── constants/                # Typed constant maps (status enums, colors, keys)
├── core/                     # Core infrastructure
│   ├── acp-client.ts         # ACP protocol client
│   ├── acp-connection.ts     # Connection lifecycle management
│   ├── acp-agent-port.ts     # Agent port abstraction
│   ├── claude-cli-harness.ts # Claude CLI process harness
│   ├── session-manager.ts    # Session lifecycle
│   ├── session-stream.ts     # Streaming message handler
│   ├── message-handler.ts    # Message processing pipeline
│   └── search/               # File search service
├── harness/                  # Agent harness registry (multi-agent support)
├── store/                    # Zustand state management
│   ├── app-store.ts          # Global application state
│   ├── session-persistence.ts # Session save/restore
│   ├── persistence/          # SQLite + JSON persistence providers
│   └── settings/             # User settings management
├── types/                    # TypeScript type definitions (domain.ts, diff.types.ts)
├── ui/                       # Ink/React UI layer
│   ├── components/           # UI components (App, Chat, MessageList, Sidebar, etc.)
│   ├── hooks/                # React hooks (keyboard shortcuts, sessions, scroll)
│   ├── theme.ts              # Design tokens and color palette
│   └── status-colors.ts      # Status-to-color mapping
└── utils/                    # Shared utilities
    ├── env/                  # Environment parsing and validation
    ├── logging/              # Logger setup and correlation context
    └── token-optimizer/      # Multi-strategy prompt optimization
```

### Key Patterns

- **ACP Protocol**: Agent Client Protocol for communicating with AI agents (Claude CLI, etc.)
- **Harness System**: Pluggable agent harnesses registered via `harnessRegistry.ts`
- **Zustand Store**: Single `app-store.ts` manages sessions, messages, connection, and UI state
- **Persistence**: SQLite (primary) + JSON (fallback) providers via `persistence-manager.ts`
- **Streaming**: Real-time token-by-token rendering via `session-stream.ts`
- **Constants Pattern**: All status strings, magic numbers, and domain values extracted to `src/constants/`

## Code Style

- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- **Biome** for linting and formatting (2-space indent, 100 char width, double quotes, semicolons)
- **ESM-only** (`"type": "module"`)
- **Zod** for runtime validation of all domain types
- **No `any`** - use explicit types or `unknown` with type guards
- **No raw `process.env`** - use `Env` from `src/utils/env/`
- **No `console.log`** - use logger from `src/utils/logging/`
- **Constants over literals** - extract magic strings/numbers to `src/constants/`
- Path alias: `@/` maps to `src/`

## Testing

- **Vitest** with globals enabled
- Test files: `__tests__/<unit|integration>/<domain>/<name>.<unit|integration>.test.ts`
- Examples:
  - `__tests__/unit/core/message-handler.unit.test.ts`
  - `__tests__/integration/core/session-stream.integration.test.ts`
- Target >= 95% coverage per changed/added unit
- Test groups are split by path: `__tests__/unit`, `__tests__/integration`, `__tests__/e2e`

## Execution Verification Policy

Never claim lint/typecheck/test/build were run unless the exact commands completed successfully. For every change cycle, run and verify: `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`. If any command fails, surface the error and do not proceed.

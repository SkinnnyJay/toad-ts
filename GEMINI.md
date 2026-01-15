---
title: GEMINI.md
date: 2026-01-14
author: Gemini
status: draft
lastUpdated: 2026-01-14
description: Guidance for Google Gemini when working with this repository.
---

# GEMINI.md

This file provides guidance to Google Gemini when working with code in this repository.

## Project Overview

TOAD (Terminal Orchestration for AI Development) is a unified terminal interface for AI coding agents, built with TypeScript, Ink (React for CLIs), and Zustand for state management. It supports multiple AI providers (Claude, OpenAI) with streaming responses, session persistence, and rich markdown rendering.

## Commands

```bash
# Development
npm run dev              # Run with tsx (development mode)
npm run dev:watch        # Run with tsx in watch mode

# Build
npm run build            # Build with tsup (outputs to dist/)
npm run clean            # Remove dist/ and .next/

# Testing
npm test                 # Run all tests with vitest
npm run test:watch       # Run tests in watch mode
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e         # Run end-to-end tests
npm run test:scenarios   # Run E2E scenario tests
npm run test:coverage    # Run tests with coverage report

# Run a single test file
npx vitest run src/utils/env/env.utils.test.ts

# Code Quality
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run lint             # Lint with Biome
npm run lint:fix         # Lint and auto-fix
npm run format           # Format with Biome
```

## Architecture

### Current State
The codebase is in early development. The main implemented module is the **token-optimizer** system in `src/utils/token-optimizer/`.

### Token Optimizer (`src/utils/token-optimizer/`)
A multi-strategy prompt optimization system that reduces token count for AI API calls:

- **TokenOptimizer** - Core class that orchestrates cleaning, compression, and telemetry
- **Strategies** - Pluggable compression strategies (TOON, TONL, JSON, XML, YAML, Markdown, CSV, Passthrough)
- **Cleaner** - Prompt pre-processing (trim, collapse whitespace, flatten JSON)
- **Tokenizer** - Token counting abstraction
- **TelemetryStorage** - Persistence for analytics snapshots
- **ValidatorRegistry** - Validates compression metadata and payloads

The optimizer follows dependency injection patterns - `TokenOptimizerDependencies` interface defines required collaborators.

### Planned Architecture (from README)
```
UI Layer (Ink + React)     → Provider Selector, Message List, Input, Status Bar
State Layer (Zustand)      → Sessions, Messages, Connection, UI State
Provider Abstraction       → Claude Provider, OpenAI Provider
```

## Code Style

- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- **Biome** for linting and formatting (2-space indent, double quotes, semicolons)
- **ESM-only** (type: "module")
- **Zod** for runtime validation
- Path alias: `@/` maps to `src/`

## Testing

- **Vitest** with globals enabled
- Test files use `.test.ts` suffix
- Separate configs for unit, integration, e2e, and scenarios

## Execution Verification Policy (MANDATORY)
- Never claim lint/typecheck/test/build/dev were run unless the exact commands completed successfully in this workspace.
- For every change cycle, run and report actual command output for: `npm run lint`, `npm run typecheck`, `npm run test` (project suites), and `npm run build` before stating readiness. If any are skipped, explicitly state they were not run and why.
- Exclude third-party/vendor/research suites from test runs via config (already set in `vitest.config.ts`); do not mask project failures.
- If any command fails, surface the error, do not downgrade severity, and do not proceed as “green”.
- Final responses must list the commands actually executed and their status (pass/fail), or explicitly state if a command was not executed.

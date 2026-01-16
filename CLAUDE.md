---
title: CLAUDE.md
date: 2025-01-27
author: Jonathan Boice
status: approved
lastUpdated: 2025-01-27
description: Guidance for Claude Code when working with this repository
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TOADSTOOL (Terminal Orchestration for AI Development) is a unified terminal interface for AI coding agents, built with TypeScript, Ink (React for CLIs), and Zustand for state management. It supports multiple AI providers (Claude, OpenAI) with streaming responses, session persistence, and rich markdown rendering.

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
npx vitest run __tests__/unit/utils/env.utils.unit.test.ts

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
- Test files use `<filename>.<unit | integration>.test.ts` naming convention
- All test files are located in `__tests__/<unit | integration>/` directory structure
- Examples:
  - Unit tests: `__tests__/unit/core/message-handler.unit.test.ts`
  - Integration tests: `__tests__/integration/core/session-stream.integration.test.ts`
- Separate configs for unit, integration, e2e, and scenarios

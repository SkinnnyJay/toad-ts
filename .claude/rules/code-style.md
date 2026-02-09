# TOADSTOOL Code Quality Standards

## Strict Type Safety

- Never use `any`. Type every variable, parameter, and return value explicitly.
- Never use type casting (`as`). Use type guards, narrowing, or generics instead.
- Define domain types as Zod schemas in `src/types/domain.ts`.
- Validate all external data with Zod schemas at boundaries.
- Strict mode enabled with `noUncheckedIndexedAccess`.

## Constants Pattern

- Extract all magic strings, numbers, and status values to `src/constants/`.
- Use `as const` object pattern with derived types:
  ```typescript
  export const STATUS = { PENDING: "pending", DONE: "done" } as const;
  export type Status = typeof STATUS[keyof typeof STATUS];
  ```
- Never use string literals in switch/case or if/else chains.
- Acceptable exceptions: external library types (ACP SDK, marked), trivial numbers (0, 1, -1).

## Environment & Logging

- Always use `Env` from `src/utils/env/env.edge.ts` to access environment variables.
- Never use `process.env` directly (except in tests).
- Use logger from `src/utils/logging/logger.utils.ts` for all logging.
- Never use `console.log`, `console.debug`, `console.error`, or `console.info`.

## File & Function Size Limits

- Functions: max 500 lines. Break large functions into composable helpers.
- Files: max 2500 lines. Split into modules if approaching the limit.
- Prefer early returns to reduce nesting depth.

## Naming Conventions

- camelCase for files, variables, functions
- PascalCase for classes, types, interfaces, React components
- UPPER_SNAKE_CASE for constants
- Path alias `@/` maps to `src/`

## Dependency Injection

- Use factory functions for DI, not container libraries.
- Define `Dependencies` interfaces for configurable modules.
- Easy to test: just pass mocks.

## Comments & Documentation

- Only meaningful comments: explain "why", not "what".
- No trivial comments restating the code.
- JSDoc for public APIs and complex logic.
- No emoji in code or comments.

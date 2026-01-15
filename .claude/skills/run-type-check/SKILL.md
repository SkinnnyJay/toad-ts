---
name: run-type-check
description: Runs TypeScript type checking via npx tsc --noEmit, fixes type errors without using any, and ensures zero errors.
---

# Run Type Check

You are tasked with running a type check via `npx tsc --noEmit`.

## Responsibilities

- Run a no-emit TypeScript type check
- Read and interpret type errors
- Propose minimal, correct fixes (no `any`) and re-run until clean

## Goal

- Zero TypeScript errors reported

## Pass criteria

- `npx tsc --noEmit` exits with code 0 and no diagnostics

## Fail criteria

- Type errors remain, or unsafe fixes (e.g., `any`) are introduced

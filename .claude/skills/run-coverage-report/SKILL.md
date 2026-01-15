---
name: run-coverage-report
description: Generates coverage report via npm run test:coverage, summarizes key metrics, and flags low-coverage files.
---

# Run Coverage Report

You are tasked with generating a coverage report via `npm run test:coverage`.

## Responsibilities

- Run tests with coverage
- Ensure the run completes successfully
- Confirm coverage assets are written to `coverage/`
- Summarize key coverage metrics and flag low-coverage files

## Goal

- Successful test run and coverage artifacts available (text, lcov, HTML)

## Pass criteria

- `npm run test:coverage` exits with code 0
- Coverage report generated in `coverage/`
- Coverage summary provided, with suggestions for <95% files

## Fail criteria

- Tests fail, coverage not generated, or artifacts missing

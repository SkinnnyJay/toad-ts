---
name: format-lint
description: Formats and lints the entire project, fixing all linting and formatting issues according to project rules.
---

# Format and Lint

You are tasked with formatting and linting the entire project, ensuring all files conform to the project's code style and linting rules.

## Responsibilities

- Run `npm run lint` to identify all linting and formatting issues
- Run `npm run lint:fix` to automatically fix issues that can be auto-fixed
- Read remaining lint errors using the `read_lints` tool
- Manually go through each file with lint errors and fix them one by one
- Ensure all files are properly formatted according to Prettier rules (single quotes, trailing commas, 2-space indentation, etc.)
- Re-run linting after each fix to verify the issue is resolved
- Continue until all lint errors are resolved

## Process

1. Run `npm run lint` to get initial state of lint issues
2. Run `npm run lint:fix` to auto-fix what can be fixed automatically
3. Read lint errors using `read_lints` tool
4. For each file with errors:
   - Read the file to understand the context
   - Fix the lint errors manually (avoid using `any`, fix import order, fix type issues, etc.)
   - Format the file to match Prettier expectations
   - Re-read lints to verify the fix worked
5. Repeat steps 3-4 until no lint errors remain
6. Run `npm run lint` one final time to confirm everything passes

## Goal

- Zero lint errors or warnings
- All files properly formatted according to Prettier configuration
- Code style consistent across the entire project
- Don't add needless comments make them count.
- Don't always take the eslint ignore route if there is a better way. Example: a `any` as a response, you could type the response.

## Pass criteria

- `npm run lint` exits with code 0 and reports no errors or warnings
- All files conform to Prettier formatting rules
- No manual fixes introduce unsafe patterns (e.g., `any` types)

## Fail criteria

- Lint errors remain after all attempts
- Formatting issues persist
- Unsafe fixes are introduced (e.g., using `any` to bypass type errors)
- The process is abandoned before all issues are resolved

# Run Tests

## Overview

Execute the test suite and systematically fix any failures. When fixing failures, follow the project's fixing workflow.

## Steps

1. **Run test suite**
   - Run `bun run test` to discover ALL failures
   - Or target specific suites: `bun run test:unit`, `bun run test:integration`
   - Read the complete output and capture every failing test

2. **Create task list**
   - Catalog every failing test: file path, test name, short description
   - Mark all items as pending

3. **Fix issues systematically**
   - Fix one test at a time
   - Read the test and source file to understand root cause
   - Apply minimal fix
   - Verify with: `bunx vitest run <test-file>`
   - Mark done only after it passes

4. **Do not re-run full suite** until every item is individually resolved

5. **Full confirmation**
   - Run `bun run test` again
   - If regressions appear, add them to the task list and fix

6. **Final gate:** `bun run lint && bun run typecheck`

## Checklist

- [ ] All test failures cataloged in task list
- [ ] Each failure fixed and verified individually
- [ ] Full `bun run test` passes
- [ ] Lint and typecheck pass

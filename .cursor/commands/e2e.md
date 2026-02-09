# Run E2E Tests

## Overview

Execute end-to-end tests and systematically fix any failures. When fixing failures, follow the project's fixing workflow (see project rules).

## Steps

1. **Run E2E suite**
   - Run `npm run test:e2e` to discover ALL failures

2. **Create task list**
   - Catalog every failing test: file path, test name, short description
   - Mark all items as pending

3. **Fix issues systematically**
   - Fix one test at a time
   - Read the test file and relevant source code
   - Apply minimal fix
   - Verify with: `npx vitest run --config vitest.e2e.config.ts <test-file>`
   - Mark done only after it passes

4. **Do not re-run full suite** until all items are individually resolved

5. **Full confirmation**
   - Run `npm run test:e2e`; handle any regressions

6. **Final gate:** `npm run lint && npm run typecheck`

## Checklist

- [ ] All E2E failures cataloged in task list
- [ ] Each test fixed and verified individually
- [ ] Full `npm run test:e2e` passes
- [ ] Lint and typecheck pass

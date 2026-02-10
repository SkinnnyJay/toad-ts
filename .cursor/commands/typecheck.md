# Type Check

## Overview

Run TypeScript type checking and fix all type errors. When fixing errors, follow the project's fixing workflow (see project rules).

## Steps

1. **Run typecheck**
   - Run `bun run typecheck` to discover ALL type errors
   - Read the complete output and capture every error

2. **Create task list**
   - Catalog every error: file path, line, short description
   - Mark all items as pending

3. **Fix issues systematically**
   - Fix one error at a time
   - Read the file and understand the type mismatch
   - Apply minimal, correct fix; never use `any`, `@ts-ignore`, or type casting (`as`)
   - Use type guards, narrowing, or generics instead
   - Verify with: `bun run typecheck`
   - Mark done only after the specific error is gone

4. **Do not consider resolved** until every item is checked off

5. **Full confirmation**
   - Run `bun run typecheck` (exit code 0)

6. **Final gate:** `bun run lint`

## Checklist

- [ ] All type errors cataloged in task list
- [ ] Each error fixed without `any` or `as`
- [ ] Full `bun run typecheck` passes
- [ ] Lint passes

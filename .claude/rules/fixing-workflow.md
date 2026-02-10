# Fixing Workflow

When fixing lint errors, type errors, test failures, or build failures, always follow this exact process.

## Step 1: Discover ALL Failures

Run the appropriate command to get the full picture before touching any code:

| Category            | Discovery command          |
|---------------------|----------------------------|
| Lint                | `bun run lint`             |
| Format              | `bun run format`           |
| Type errors         | `bun run typecheck`        |
| Unit tests          | `bun run test:unit`        |
| Integration tests   | `bun run test:integration` |
| Build               | `bun run build`            |

## Step 2: Create a Task List of ALL Failures

Before fixing anything, catalog every failure:
- One item per distinct error (group related errors in same file)
- Include file path and short description
- Mark all items as pending

## Step 3: Fix Each Issue Individually

For each item:
1. Read the failing file and understand the root cause
2. Apply the minimal, correct fix
3. Verify the fix:

| Category     | Verify single fix                              |
|--------------|------------------------------------------------|
| Lint         | `bunx biome check <file>`                      |
| Type errors  | `bun run typecheck`                            |
| Unit test    | `bunx vitest run <test-file>`                  |
| Build        | `bun run build`                                |

4. Mark done only after verification passes

## Step 4: Full Suite Confirmation

Once all items are individually resolved:
1. Run the full command from Step 1
2. If new failures appear, go back to Step 2 with only the new failures
3. Run `bun run lint && bun run typecheck` as a final gate

# Test Suite

TOADSTOOL tests live under `__tests__/` with unit, integration, and e2e layers.

## Running tests

| Command | Behavior |
|--------|----------|
| `npm run test` | Runs all tests **except** those in files prefixed with `skippable.` (fast default). |
| `npm run test:all` | Runs the **full** suite including skippable tests. |
| `npm run test:unit` | Unit tests only (if config exists). |
| `npm run test:integration` | Integration tests only (if config exists). |
| `npm run test:e2e` | E2E tests only (if config exists). |
| `npm run test:watch` | Vitest watch mode (no skippable exclusion). |

Skippable exclusion is controlled by `TEST_SKIP_SKIPPABLE=1`. The default `npm run test` sets this so that only high-value tests run during normal development and CI.

## Test layout

- **unit/** – Fast, isolated tests (mocks, no real I/O). One file per module under test; name: `<module>.unit.test.ts`.
- **integration/** – Tests that cross boundaries (store + API, real DB, etc.). Name: `<scope>.integration.test.ts`.
- **e2e/** – End-to-end or CLI-level tests. Name: `<scenario>.e2e.test.ts`.
- **utils/** – Shared test helpers and runners (e.g. `ink-test-helpers.ts`). See `utils/README.md`.

## What “skippable” means

Tests in files named **`skippable.<something>.test.ts`** are excluded when you run `npm run test`. They are still run with `npm run test:all`.

Mark a test file as skippable when it fits one or more of these:

1. **No behavioral value** – Only asserts that constants equal the literals we just defined (e.g. `expect(STATUS.PENDING).toBe("pending")`), or that exports exist (`toBeDefined()` / `typeof x === "object"`) with no behavior under test.
2. **Placeholder / TODO** – File is mostly `expect(true).toBe(true)` or similar stubs until real E2E or infrastructure exists.
3. **Pure smoke with no assertions** – Renders a component and only checks that something rendered (e.g. `expect(frame).toBeTruthy()` or `expect(frame).toBeDefined()`) with no content or behavior asserted.
4. **Brittle literals** – Test is tied to exact counts or names (e.g. “must have exactly 6 themes”) that change with product decisions and add maintenance cost without guarding real behavior.

Do **not** mark as skippable:

- Tests that assert real behavior (parsing, state transitions, config merging, error handling).
- Tests that validate contracts (Zod parsing, API shape, keybind resolution).
- Integration tests that touch real dependencies and would catch regressions.

## Rules

- **One concept per file** – One module or one user-facing behavior per test file.
- **Behavior over implementation** – Prefer testing inputs/outputs and observable behavior; avoid testing internal structure.
- **No magic literals** – Use constants from `@/constants` (and env from `@/utils/env`) in tests as in production code.
- **Cleanup** – Use `afterEach(cleanup)` (or equivalent) in UI tests to avoid cross-test pollution.
- **Naming** – `describe`/`it` should read as requirements: e.g. “rejects invalid content block”, “merges project config over global config”.
- **Skippable prefix** – Only use the `skippable.` filename prefix when the file clearly matches the skippable criteria above; when in doubt, keep the test in the default suite.

## References

- `utils/README.md` – OpenTUI/Ink test helpers and patterns.
- Project root: `CLAUDE.md`, `AGENTS.md` – Commands and quality gates.

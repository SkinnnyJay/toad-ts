# Scratchpad Journal

## 2026-02-13 (api/core classifier handler IDs)
- Updated:
  - `src/server/server-route-classifier.ts`
  - `src/server/headless-server.ts`
- Changes:
  - server-route classifier now returns explicit classifier handler ids for
    method-not-allowed and unhandled outcomes:
    - `api_route_classifier`
    - `core_route_classifier`
  - headless validation telemetry now logs those classifier handler ids for
    method-not-allowed and not-found responses.
- Extended tests:
  - `__tests__/unit/server/server-route-classifier.unit.test.ts`
    - added expectations for classifier handler ids
  - `__tests__/integration/server/headless-server.integration.test.ts`
    - existing coverage exercises updated telemetry paths
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (route-classifier validation telemetry)
- Updated:
  - `src/server/headless-server.ts`
  - `src/core/cursor/hook-ipc-server.ts`
- Changes:
  - headless route-classifier method-not-allowed/not-found responses now emit
    shared validation telemetry with handler id `route_classifier`
  - hook IPC method guard (non-POST) now emits shared validation telemetry with
    handler id `method_guard`
- Extended tests:
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
    - added method-not-allowed validation telemetry assertion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (session validation handler identifiers)
- Updated `src/server/headless-server.ts`:
  - introduced headless session route handler identifiers in validation
    telemetry (`session_create`, `session_prompt`)
  - localized Zod validation handling for session create/prompt schema parsing
    through shared validation helper while preserving response semantics
- Extended `__tests__/integration/server/headless-server.integration.test.ts`:
  - added invalid session prompt payload schema coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (file-search validation telemetry parity)
- Updated `src/server/api-routes.ts`:
  - file-search validation failures now emit shared standardized validation
    telemetry (`Request validation failed`) through `logRequestValidationFailure(...)`
  - applied to query/URL validation failures (missing, duplicate, malformed,
    whitespace-only, invalid URL/host paths)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-error-normalization.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (shared request-validation telemetry parity)
- Updated:
  - `src/server/request-error-normalization.ts`
  - `src/core/cursor/hook-ipc-server.ts`
  - `src/server/headless-server.ts`
- Changes:
  - added shared `logRequestValidationFailure(...)` helper for non-parse request
    failure telemetry
  - hook IPC schema-validation failures now emit standardized validation telemetry
    before canonical invalid-request responses
  - headless `ZodError` validation path now emits standardized validation
    telemetry with shared source/context schema
- Extended tests:
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - added validation telemetry helper normalization coverage
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
    - added schema-invalid payload warning assertion for shared validation
      telemetry message/schema
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (shared request-parse telemetry helper)
- Updated:
  - `src/server/request-error-normalization.ts`
  - `src/server/api-routes.ts`
  - `src/server/headless-server.ts`
  - `src/core/cursor/hook-ipc-server.ts`
- Changes:
  - introduced shared telemetry helper `logRequestParsingFailure(...)`
  - standardized parse-failure warning metadata keys across API/headless/hook:
    - `source`, `method`, `pathname`, optional `handler`, `error`, `mappedMessage`
  - introduced shared source constants via `REQUEST_PARSING_SOURCE`
- Extended tests:
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - added telemetry helper normalization assertions
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
    - updated warning assertions to shared telemetry message/schema
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (API parse-failure diagnostics parity)
- Updated:
  - `src/server/api-routes.ts`
  - `src/server/request-error-normalization.ts`
  - `src/core/cursor/hook-ipc-server.ts`
- Changes:
  - API TUI handlers now emit structured warning diagnostics for request-body
    parse failures (`handler`, `method`, `pathname`, `error`, `mappedMessage`)
  - introduced shared `normalizeRequestBodyParseErrorDetails(...)` helper and
    reused it in API routes + hook IPC
- Extended tests:
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
    - added request stream `error`/`aborted` failure mapping coverage
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - added parse-error details helper coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (headless route-local parse handling hardening)
- Updated `src/server/headless-server.ts`:
  - route-level request-body parse handling added for:
    - `POST /sessions`
    - `POST /sessions/:id/prompt`
  - parse failures now map and return from route-local catch blocks using shared
    parse-error classification, with route-context warning diagnostics
    (`method`, `pathname`, `mappedMessage`, `error`).
  - reduced dependence on top-level request catch for route body-parse failures.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-error-normalization.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (shared request-error normalization utility)
- Added `src/server/request-error-normalization.ts` with shared helpers:
  - `normalizeRequestBodyParseError(...)`
  - `classifyRequestParsingError(...)`
- Refactored consumers:
  - `src/server/api-routes.ts` now reuses shared parse-error normalization
  - `src/core/cursor/hook-ipc-server.ts` now reuses shared parse-error normalization
  - `src/server/headless-server.ts` now classifies canonical parse errors via shared utility
- Added focused unit coverage:
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
- Behavioral hardening:
  - headless server now treats canonical invalid-request parse errors from body
    stream lifecycle failures as `400 INVALID_REQUEST` consistently.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC shared response helper adoption)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - removed local `sendJson`/`sendError` helpers
  - switched hook IPC endpoint response writes to shared helpers:
    - `sendJsonResponse(...)`
    - `sendErrorResponse(...)`
  - behavior preserved for canonical method/parse/handler-failure response paths
    while reducing response serialization duplication.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC invalid-body diagnostics hardening)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - request-body parse failures now emit structured warning telemetry before
    canonical 400 responses are returned
  - warning metadata includes normalized mapped message and original parse error
- Extended `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - malformed JSON and oversized payload paths now assert warning emission
  - parser-rejection stream-failure scenarios now assert warning metadata
    alongside canonical `INVALID_REQUEST` response mapping
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC request-stream failure mapping coverage)
- Updated `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added parser rejection coverage for request-stream lifecycle failures:
    - aborted-stream style errors
    - generic stream-error style failures
  - verifies both paths return canonical `400 INVALID_REQUEST` from hook IPC endpoint
    rather than leaking non-canonical error handling.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (CLI env-command blank fallback hardening)
- Updated runtime command resolution:
  - `src/core/claude-cli-harness.ts`
  - `src/core/cursor/cursor-cli-connection.ts`
- Changes:
  - command env values are now trimmed before use
  - whitespace-only env command overrides now fall back to harness defaults
    instead of being treated as executable command names
- Extended tests:
  - `__tests__/unit/core/claude-cli-harness.unit.test.ts`
  - `__tests__/unit/core/cursor/cursor-cli-connection.unit.test.ts`
  - added explicit blank-command env fallback assertions
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/claude-cli-harness.unit.test.ts __tests__/unit/core/cursor/cursor-cli-connection.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC request-body parser hardening)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - replaced ad-hoc body chunk parsing with shared `parseJsonRequestBody(...)`
    helper for robust stream parsing/error handling parity
  - added canonical bad-request error mapping for parse failures:
    - malformed -> `INVALID_REQUEST`
    - oversized -> `REQUEST_BODY_TOO_LARGE`
- Extended `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added oversized hook payload rejection coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC non-object payload coverage)
- Updated `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added explicit coverage for non-object JSON request bodies (array + primitive)
  - locked canonical `400 INVALID_REQUEST` response semantics
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (SSE pre-closed response cleanup hardening)
- Updated `src/server/api-routes.ts`:
  - events stream now immediately cleans up subscriptions if response is already
    ended/destroyed when handler attaches the store subscription
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added coverage for pre-closed response cleanup path (`writableEnded=true`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (file-search key-normalization hardening)
- Updated `src/server/api-routes.ts`:
  - query parameter key matching now normalizes case and trims names
  - mixed-case duplicate query keys (`q` + `Q`) now follow canonical duplicate-query
    invalid-request behavior
- Extended tests:
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Added coverage for:
  - uppercase key-name acceptance parity
  - mixed-case duplicate key-name rejection
  - encoded separator decoding in query values
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/api-routes.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (mixed-chunk request-body hardening)
- Updated `src/server/request-body.ts`:
  - request-body chunk handling now routes both string and buffer chunks through
    one UTF-8 decoder path for consistent ordering and byte accounting
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added mixed string+buffer chunk payload success coverage
  - added malformed partial-buffer then string chunk decode-order coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (auth-header type hardening)
- Updated `src/server/server-auth.ts`:
  - added authorization header normalization guard requiring non-empty string values
  - array/empty authorization headers now return canonical authorization-required
    unauthorized responses
- Extended `__tests__/unit/server/server-auth.unit.test.ts`:
  - added array-header rejection coverage
  - added whitespace-only header rejection coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (harness env-expansion validation hardening)
- Updated `src/harness/harnessConfig.ts`:
  - env-expanded harness config payloads are now re-parsed via `harnessConfigSchema`
    before returning from `loadHarnessConfig`
- Extended `__tests__/unit/harness/harness-config.unit.test.ts`:
  - added project/user env-map merge precedence coverage
  - added missing-env command expansion failure coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/harness/default-harness-config.unit.test.ts __tests__/unit/server/api-route-fallback-env.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (default harness env-override hardening)
- Updated `src/harness/defaultHarnessConfig.ts`:
  - command env overrides now trim and fall back to defaults when blank
  - explicit empty-string args overrides now produce empty args arrays
- Extended `__tests__/unit/harness/default-harness-config.unit.test.ts`:
  - added explicit empty-args override coverage
  - added blank-command fallback coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/default-harness-config.unit.test.ts __tests__/unit/server/api-route-fallback-env.unit.test.ts __tests__/unit/harness/harness-adapter.unit.test.ts` ✅
  - Full gates (equivalent due missing bun/bunx in environment):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (repo-workflow check-field type hardening)
- Updated `src/core/repo-workflow.ts`:
  - `normalizeCheckField` now safely handles unknown/non-string values from
    GH checks payload parsing
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added malformed check-field payload coverage (non-string status/conclusion)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts __tests__/unit/core/pr-status.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (non-origin-form request-target integration coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts`:
  - added raw HTTP request-target coverage for:
    - protocol-relative target rejection (`//example.com/...`)
    - absolute target rejection (`http://example.com/...`)
  - both now lock canonical `INVALID_REQUEST` responses end-to-end
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (protocol-relative request-target hardening)
- Updated `src/server/request-url.ts`:
  - parser now rejects protocol-relative request targets (`//...`)
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added protocol-relative target rejection coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added protocol-relative target invalid-request coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-target strictness hardening)
- Updated `src/server/request-url.ts`:
  - parser now requires origin-form request targets (`/...`)
  - absolute request targets are rejected with null fallback
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added absolute URL rejection coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added absolute request-target invalid-request coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-url whitespace normalization)
- Updated `src/server/request-url.ts`:
  - parser now trims request url and host header before URL construction
  - blank/whitespace-only url values continue to return `null`
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added whitespace-wrapped url/host parse coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added whitespace-host success-path coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (missing request-url hardening)
- Updated `src/server/request-url.ts`:
  - parser now returns `null` when request url is missing
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added missing-request-url null fallback coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added missing-url invalid-request coverage for file-search route
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (shared request-url parser hardening)
- Added `src/server/request-url.ts`:
  - centralized request URL parsing with localhost fallback
  - malformed host/URL inputs now return `null` instead of throwing
- Updated:
  - `src/server/headless-server.ts`
    - now uses shared parser and returns canonical invalid-request for malformed URL inputs
  - `src/server/api-routes.ts`
    - file-search now uses shared parser and canonical invalid-request fallback
- Extended tests:
  - `__tests__/unit/server/request-url.unit.test.ts`
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - malformed host-header rejection case
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless file-search integration coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts`:
  - added file-search integration assertions for:
    - valid query handling
    - duplicate `q` rejection
    - encoded key acceptance
    - malformed encoded key rejection
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search encoded-key hardening)
- Updated `src/server/api-routes.ts`:
  - query parameter name parsing now uses strict form decoding
  - encoded key names (e.g. `%71`) are accepted for `q`
  - malformed encoded key names now return canonical `INVALID_REQUEST`
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added encoded-key success case (`?%71=readme`)
  - added malformed key-encoding rejection case
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search duplicate-query hardening)
- Updated `src/server/api-routes.ts`:
  - query extraction now collects all `q` values
  - duplicate `q` parameters now return canonical `INVALID_REQUEST`
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added duplicate-query rejection coverage (`q=readme&q=notes`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo-workflow defensive normalization)
- Updated `src/core/repo-workflow.ts`:
  - `deriveRepoWorkflowStatus` now trims and lowercases PR `state` and
    `reviewDecision` before workflow branching
  - widened internal input shape for defensive compatibility with non-normalized
    callers while preserving existing behavior for normalized inputs
- Extended `__tests__/unit/core/repo-workflow.unit.test.ts`:
  - added padded-state normalization coverage (`" merged "`)
  - added padded-review-decision normalization coverage (`" approved "`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow.unit.test.ts __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/pr-status.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (events-stream stale-callback guard)
- Updated `src/server/api-routes.ts`:
  - events-stream callback now short-circuits when cleanup has already run
  - prevents writes from stale callbacks after unsubscribe/close paths
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added post-cleanup stale-callback no-write coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (events-stream write-failure cleanup)
- Updated `src/server/api-routes.ts`:
  - events-stream update callback now catches `res.write(...)` failures
  - write failures trigger idempotent SSE cleanup instead of surfacing exceptions
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added write-failure cleanup coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (events-stream aborted-request cleanup)
- Updated `src/server/api-routes.ts`:
  - events stream now subscribes to request `aborted` events for cleanup
  - cleanup remains idempotent with existing request/response close/error handling
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added request-aborted cleanup coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search plus-decoding contract test)
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added explicit coverage for `+` form-encoding in query values
  - locked expected decode contract: `q=readme+notes` -> `readme notes`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (PR status invocation-option coverage)
- Extended `__tests__/unit/core/pr-status.unit.test.ts`:
  - added assertions that `getPRStatus` calls `gh pr view` with expected
    `timeout` and `cwd` options
  - added default-cwd invocation assertion for no-arg `getPRStatus()`

## 2026-02-13 (events-stream error-path cleanup hardening)
- Updated `src/server/api-routes.ts`:
  - SSE cleanup now also hooks request/response `error` events
  - cleanup remains idempotent across close/error combinations
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added response-error cleanup coverage
  - added request-error cleanup coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (strict file-search query decoding hardening)
- Updated `src/server/api-routes.ts`:
  - file-search query parsing now decodes raw `q` values with strict decoding and
    returns canonical `INVALID_REQUEST` for malformed encoded input
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added malformed encoded query rejection coverage (`q=%E0%A4%A`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (PR status normalization hardening)
- Updated `src/core/pr-status.ts`:
  - added explicit state normalization with trim+lowercase and known-state fallback
  - added explicit review-decision normalization with trim+lowercase and unknown fallback
- Extended `__tests__/unit/core/pr-status.unit.test.ts`:
  - added padded state/review normalization coverage
  - added unsupported review-decision fallback coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/pr-status.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts __tests__/unit/core/repo-workflow-info.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (SSE response-close cleanup hardening)
- Updated `src/server/api-routes.ts`:
  - events stream now also performs subscription cleanup on `res.close`
  - cleanup handler is idempotent across request+response close events
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added response-close cleanup coverage and duplicate-close idempotency assertion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search query-trim hardening)
- Updated `src/server/api-routes.ts`:
  - file-search query extraction now trims surrounding whitespace
  - whitespace-only query values now return canonical missing-query bad-request
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added whitespace-only query bad-request coverage
  - added trimmed-query success response coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (route method normalization hardening)
- Added shared helper:
  - `src/server/http-method-normalization.ts`
- Updated:
  - `src/server/api-routes.ts`
  - `src/server/core-route-classifier.ts`
- Changes:
  - route matching/classification now normalizes method input via trim+uppercase
    before comparing with supported HTTP methods
- Extended tests:
  - `__tests__/unit/server/api-routes.unit.test.ts`
  - `__tests__/unit/server/core-route-classifier.unit.test.ts`
  - `__tests__/unit/server/server-route-classifier.unit.test.ts`
  - added lowercase/padded method acceptance coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body UTF-8 split-chunk decoding hardening)
- Updated `src/server/request-body.ts`:
  - buffer chunk decoding now uses `StringDecoder("utf8")` to preserve multibyte
    characters split across stream chunk boundaries
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added split-buffer UTF-8 emoji payload parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (search-files host-header fallback hardening)
- Updated `src/server/api-routes.ts`:
  - file-search URL parsing now falls back to `localhost` when request host header is absent
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added hostless request parsing coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body UTF-8 BOM parsing hardening)
- Updated `src/server/request-body.ts`:
  - JSON parser now strips UTF-8 BOM prefix before empty-body fallback and JSON.parse
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added BOM-prefixed JSON parse coverage
  - added BOM-only payload empty-body fallback coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo check-status whitespace normalization hardening)
- Updated `src/core/repo-workflow.ts`:
  - check-status/conclusion normalization now trims whitespace before lowercase matching
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added whitespace-padded queued/pending classification coverage
  - added whitespace-padded cancelled/failing classification coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (SSE close-unsubscribe idempotency hardening)
- Updated `src/server/api-routes.ts`:
  - switched events-stream close listener from `on` to `once` for unsubscribe idempotency
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added duplicate close-event assertion (`unsubscribe` called exactly once)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (git+ssh remote parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - ssh-protocol matcher now accepts optional `git+ssh://` prefix
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added git+ssh remote parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (uppercase SSH protocol parse coverage)
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added uppercase `SSH://...` remote parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (scp remote no-user parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - generalized scp-style remote matcher to allow missing `user@` prefix
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added no-user scp remote parse coverage (`github.com:owner/repo.git`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (uppercase .GIT remote suffix parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - added case-insensitive repo-name normalization for `.git` suffix removal
  - aligned remote URL matchers to accept `.GIT` suffix variants
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added uppercase `.GIT` URL parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (scp ssh custom-user parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - generalized scp-style ssh parser to accept any `user@host:owner/repo(.git)` form
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added custom-user scp ssh parse coverage (`alice@github.com:owner/repo.git`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request stream abort/close hardening)
- Updated `src/server/request-body.ts`:
  - added abort/close handling so read promise rejects on prematurely terminated streams
  - added listener cleanup on settle to avoid lingering handlers
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added `aborted` and premature `close` rejection coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (git protocol remote parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - added support for parsing owner/repo from `git://` remote URLs
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added `git://github.com/owner/repo.git` parsing coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo-workflow literal hygiene)
- Updated `src/core/repo-workflow.ts`:
  - extracted `gh pr checks --json` field list string into named constant
  - replaced raw PR state/review decision string literals with constants
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo remote scheme-case parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - made `https://` and `ssh://` remote parsing case-insensitive
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added uppercase-HTTPS remote parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body single-settlement hardening)
- Updated `src/server/request-body.ts`:
  - introduced one-shot resolve/reject guards so request-body promise settles once
    even when multiple stream events fire after failure
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added combined chunk overflow case to lock multi-chunk over-limit behavior
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (response-helper managed-header sanitization)
- Updated `src/server/http-response.ts`:
  - strips case-variant managed headers (`content-type`, `content-length`) from caller
    header inputs before writing canonical JSON headers
  - prevents duplicate/competing header casing variants
- Extended `__tests__/unit/server/http-response.unit.test.ts`:
  - added coverage for lowercase managed header override attempts
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/http-response.unit.test.ts __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (ssh remote trailing-slash parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - scp-style ssh remote parser now tolerates trailing slash (`git@host:owner/repo.git/`)
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added coverage for owner/repo extraction from ssh remotes with trailing slash
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo checks explicit-pending status hardening)
- Updated `src/core/repo-workflow.ts`:
  - checks-status classifier now explicitly treats `status: "pending"` as pending
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added pending-status classification case
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server auth header whitespace normalization)
- Updated `src/server/server-auth.ts`:
  - authorization header parsing now trims incoming header and extracted token values
  - preserves case-insensitive bearer support and raw-token compatibility
- Extended `__tests__/unit/server/server-auth.unit.test.ts`:
  - added bearer token with surrounding whitespace acceptance
  - added raw token with surrounding whitespace acceptance
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo workflow checks-status classification hardening)
- Updated `src/core/repo-workflow.ts`:
  - `getPrChecksStatus()` now classifies:
    - queued checks as `pending`
    - cancelled/timed_out/action_required/startup_failure conclusions as `fail`
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - queued-checks pending classification coverage
  - cancelled-checks failing classification coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server auth bearer-scheme robustness)
- Updated `src/server/server-auth.ts`:
  - bearer token extraction now uses case-insensitive scheme matching
    (`Bearer`/`bearer`/mixed-case supported)
  - raw-token authorization support remains unchanged
- Extended `__tests__/unit/server/server-auth.unit.test.ts`:
  - added lowercase bearer-scheme acceptance test
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo workflow ssh-protocol remote parsing)
- Updated `src/core/repo-workflow.ts`:
  - extended remote-url parsing to support ssh-protocol remotes
    (`ssh://git@host[:port]/owner/repo.git`)
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added coverage asserting owner/repo extraction for ssh-protocol remote URLs
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body chunk accounting hardening)
- Updated `src/server/request-body.ts`:
  - byte accounting now reads from native chunk type:
    - `Buffer.length` for buffer chunks
    - `Buffer.byteLength(...)` for string chunks
  - avoids redundant re-encoding while preserving accurate max-body enforcement
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - buffer-chunk body parsing coverage
  - exact-byte-limit acceptance coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless invalid-JSON response normalization)
- Updated `src/server/headless-server.ts`:
  - separated syntax-error handling from zod validation handling
  - syntax errors now return canonical `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST`
- Updated integration coverage:
  - `__tests__/integration/server/headless-server.integration.test.ts`
  - `/sessions` invalid-JSON assertion now locks canonical invalid-request payload
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (strict session-subroute parsing hardening)
- Updated `src/server/session-route-path.ts`:
  - parser now rejects over-segmented session paths (e.g. `/sessions/:id/prompt/extra`)
  - segment limit sourced from `LIMIT.SESSION_ROUTE_MAX_SEGMENTS`
- Updated `src/config/limits.ts`:
  - added `SESSION_ROUTE_MAX_SEGMENTS` constant for parser guard
- Extended coverage:
  - `__tests__/unit/server/session-route-path.unit.test.ts`
  - `__tests__/unit/server/core-route-classifier.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Locked behavior:
  - extra-segment session routes now consistently return canonical unknown-endpoint responses
    instead of being misclassified as valid prompt/messages paths
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/session-route-path.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅ (after moving segment cap to config constant)

## 2026-02-13 (request-body byte-size correctness hardening)
- Updated `src/server/request-body.ts`:
  - request size enforcement now tracks utf-8 byte length instead of string length
  - prevents undercounting multi-byte payloads for max-body limit enforcement
- Expanded `__tests__/unit/server/request-body.unit.test.ts` coverage:
  - utf-8 multibyte overflow case
  - multi-chunk request body assembly
  - request stream error propagation
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (/api/agents integration contract hardening)
- Updated `__tests__/integration/server/api-routes.integration.test.ts`:
  - strengthened `/api/agents` assertions to validate:
    - non-empty agents list
    - `defaultHarnessId` is present
    - `defaultHarnessId` corresponds to one of the returned agent ids
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/api-routes.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (hook IPC schema-invalid payload coverage)
- Extended `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added explicit assertion for schema-invalid JSON payload handling
  - verifies canonical `400` + `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST` mapping
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (harness config selection edge coverage)
- Extended `__tests__/unit/harness/harness-config.unit.test.ts` with selection edge-paths:
  - auto-select sole harness when no default is configured
  - throw `NO_DEFAULT_HARNESS_CONFIGURED` when multiple harnesses exist without defaults
  - throw formatted harness-not-found error for explicit unknown `harnessId`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/harness/default-harness-config.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (HTTP response helper content-type hardening)
- Updated `src/server/http-response.ts`:
  - changed header merge order so JSON content-type remains authoritative even when
    custom headers include a content-type override
- Extended tests:
  - `__tests__/unit/server/http-response.unit.test.ts`
  - added assertion for custom-header merge behavior preserving JSON content type
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/http-response.unit.test.ts __tests__/unit/server/server-auth.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (default harness fallback coverage)
- Added unit test file:
  - `__tests__/unit/harness/default-harness-config.unit.test.ts`
- Covered:
  - default harness set composition when cursor flag is unset
  - cursor harness inclusion with numeric truthy flag (`TOADSTOOL_CURSOR_CLI_ENABLED=1`)
  - argument override parsing for claude/gemini/codex/cursor defaults
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/default-harness-config.unit.test.ts __tests__/unit/server/api-route-fallback-env.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (hook IPC request hardening)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - switched method check to `HTTP_METHOD.POST`
  - added local JSON/error response helpers to remove repeated response code
  - normalized invalid payload response to canonical `INVALID_REQUEST`
  - added top-level try/catch around request handling to return canonical
    `SERVER_ERROR` on thrown handler failures
- Expanded unit coverage in:
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
- Added assertions for:
  - non-POST method rejection (`405`)
  - malformed JSON rejection (`400`)
  - thrown handler failure mapping (`500`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server auth response deduplication)
- Refactored `src/server/server-auth.ts` to reuse shared response helper:
  - replaced duplicated unauthorized `writeHead + end(JSON.stringify(...))` branches
    with `sendErrorResponse(...)` calls
  - centralized auth challenge header usage via shared constants
  - normalized bearer token prefix handling with one constant
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (shared server response helper extraction)
- Added `src/server/http-response.ts` with reusable helpers:
  - `sendJsonResponse()`
  - `sendErrorResponse()`
- Refactored response writers in:
  - `src/server/api-routes.ts`
  - `src/server/headless-server.ts`
- Added focused unit coverage:
  - `__tests__/unit/server/http-response.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/http-response.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (unified server route classifier pipeline)
- Added `src/server/server-route-classifier.ts` to compose:
  - core-route classification
  - api-route classification
- Updated `src/server/headless-server.ts` to consume unified route classification outcomes.
- Added dedicated unit coverage:
  - `__tests__/unit/server/server-route-classifier.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (session route path parser extraction)
- Added `src/server/session-route-path.ts` to centralize parsing of `/sessions/:id/:action` paths.
- Refactored consumers:
  - `src/server/headless-server.ts`
  - `src/server/core-route-classifier.ts`
- Added focused unit coverage:
  - `__tests__/unit/server/session-route-path.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/session-route-path.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (core route classification extraction)
- Added `src/server/core-route-classifier.ts` with explicit decision model for core routes:
  - `HEALTH_OK`
  - `METHOD_NOT_ALLOWED`
  - `UNHANDLED`
- Refactored `src/server/headless-server.ts` to consume `classifyCoreRoute()`.
- Added unit coverage:
  - `__tests__/unit/server/core-route-classifier.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (API route classification refactor)
- Added route classification abstraction in `src/server/api-routes.ts`:
  - `API_ROUTE_CLASSIFICATION`
  - `classifyApiRoute()`
- Updated `src/server/headless-server.ts` to use route classification output instead of
  direct `matchRoute + API_ROUTES.some(...)` probing.
- Expanded `__tests__/unit/server/api-routes.unit.test.ts` with explicit classification tests:
  - match
  - method-not-allowed
  - not-found
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-error canonicalization hardening)
- Updated `src/server/api-routes.ts` TUI handler error mapping to normalize invalid parse/read
  failures to `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST`, while preserving explicit
  `REQUEST_BODY_TOO_LARGE` for size overflows.
- Updated tests:
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (core route method-guard refactor)
- Refactored `src/server/headless-server.ts` method validation logic by extracting
  `isMethodAllowedForCoreRoute()` to centralize route-method checks and reduce branch duplication.
- Behavior preserved with existing integration assertions (no semantic drift).
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (non-API auth-ordering coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with explicit
  auth-ordering checks for a non-API protected route:
  - unauthenticated `GET /sessions` returns `401` with auth challenge
  - authenticated `GET /sessions` returns `405 Method not allowed`
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (shared request parser consolidation)
- Added `src/server/request-body.ts` with shared helpers:
  - `readRequestBody()`
  - `parseJsonRequestBody()`
- Refactored both server entrypoints to reuse shared behavior:
  - `src/server/headless-server.ts`
  - `src/server/api-routes.ts`
- Added focused unit coverage:
  - `__tests__/unit/server/request-body.unit.test.ts`
- Expanded TUI route unit coverage:
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - invalid JSON + oversized payload direct invocation paths
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (non-API method semantics hardening)
- Updated `src/server/headless-server.ts` to return canonical `405` responses for unsupported
  methods on known non-API routes (`/health`, `/sessions`, `/sessions/:id/prompt`,
  `/sessions/:id/messages`).
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with explicit
  coverage for these non-API method validation paths.
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (direct API handler error-path hardening)
- Updated `src/server/api-routes.ts` TUI handlers (`appendPrompt`, `executeCommand`) to catch
  parse/read failures and return explicit `400` error responses.
- Added direct invocation coverage in `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`:
  - invalid JSON payload handling
  - oversized payload handling with canonical body-too-large response
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (auth/method-ordering integration hardening)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to lock auth
  precedence semantics for protected `/api/*` endpoints:
  - unauthenticated unsupported method returns auth challenge (`401`)
  - authenticated unsupported method returns method semantic (`405`)
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (API route body-size hardening)
- Updated `src/server/api-routes.ts` request-body parser to enforce
  `SERVER_CONFIG.MAX_BODY_BYTES` and throw canonical `REQUEST_BODY_TOO_LARGE`.
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - invalid JSON handling for `/api/tui/append-prompt`
  - oversized payload handling for `/api/tui/execute-command`
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (API method semantics hardening)
- Updated `src/server/headless-server.ts` to return `405 Method not allowed` for known `/api/*`
  paths when method is unsupported.
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - unsupported-method handling for known API routes (`/api/config`, `/api/tui/execute-command`)
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (session-messages edge behavior coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with explicit
  coverage for unknown-session messages fetch behavior.
- Locked current behavior:
  - `GET /sessions/<unknown>/messages` returns `200` and `{ messages: [] }`.
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless request-body/schema edge hardening)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - strict schema rejection when `/sessions` payload includes unexpected keys
  - oversized request-body handling for `/sessions`
- Found and fixed runtime mismatch:
  - previously `REQUEST_BODY_TOO_LARGE` bubbled to generic error handling and returned 500
  - `src/server/headless-server.ts` now maps that error to `400 Bad Request` with canonical
    `SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE`
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (route/auth integration parity hardening)
- Extended route matcher unit tests in `__tests__/unit/server/api-routes.unit.test.ts` to cover:
  - `POST /api/tui/submit-prompt`
- Extended headless auth integration in
  `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - raw-token authorization (`Authorization: secret`) in addition to bearer-token path.
- Validation:
  - Targeted: `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless edge-route integration hardening)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with route edge-case
  coverage for:
  - unknown top-level endpoint handling
  - unsupported session subroute handling
  - prompt requests targeting missing runtime sessions
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server infrastructure coverage hardening)
- Added new focused server unit test files:
  - `__tests__/unit/server/server-config.unit.test.ts`
  - `__tests__/unit/server/server-types.unit.test.ts`
  - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
- Locked behavior for:
  - runtime config precedence and fallback behavior (`resolveServerConfig`)
  - strict schema validation for server request/response/event contracts
  - SSE handler lifecycle in `eventsStream` (headers, payload frame emission, unsubscribe on close)
- Validation:
  - Targeted tests: `npx vitest run __tests__/unit/server/server-config.unit.test.ts __tests__/unit/server/server-types.unit.test.ts __tests__/unit/server/api-route-events-stream.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (PLAN3 hardening continuation)
- Added coverage for repo workflow check outcome classification (`pass`/`fail`/`pending`) and
  status mapping.
- Added fallback safety by gating default Cursor harness injection behind
  `TOADSTOOL_CURSOR_CLI_ENABLED` in `createDefaultHarnessConfig`.
- Added route handler test coverage for `/api/agents`:
  - loaded-config happy path
  - fallback-to-default path
  - dual-failure 500 path
- Added env-driven fallback coverage ensuring Cursor appears in fallback agent list only when
  the cursor feature flag is enabled.
- Added `scratchpad/plan.md` as the canonical active-plan pointer expected by workspace rules.

## 2026-02-10 (Phase 0: PLAN2 Cursor CLI prerequisites)
- Branch: `feature/cursor-cli-harness`.
- Fixture paths: `__tests__/fixtures/cursor/ndjson/` (hello-response.ndjson, hello-stderr.txt, tool-use-response.ndjson, tool-use-stderr.txt), `__tests__/fixtures/cursor/status-output.txt`, `__tests__/fixtures/cursor/models-output.txt`, `__tests__/fixtures/cursor/ls-output.txt`. Directories `hooks/` and `cloud-api/` created with `.gitkeep`.
- `agent ls`: requires TTY (Ink raw-mode error when piped); `ls-output.txt` contains note: "Requires TTY; use session_id from NDJSON system.init instead."
- Quality gate: lint and typecheck and build passed; tests have 4 pre-existing failures (see scratchpad/progress.md "Phase 0 baseline quality gate"). No PLAN2.md updates required.

## 2026-02-10 (Repository Breadcrumb UI)
- Implemented PLAN2 Addendum B: repository breadcrumb bar (owner > repo > branch > status).
- Added constants: repo-workflow-status, repo-workflow-actions, breadcrumb-placement.
- Extended app config with ui.breadcrumb (placement: top/bottom/left/right/hidden, pollIntervalMs, showAction).
- Implemented getRepoWorkflowInfo in src/core/repo-workflow.ts (git root, branch, dirty/ahead/behind, remote owner/repo, PR status with isDraft, merge conflicts, gh pr checks, status derivation).
- Added useRepoWorkflow hook (polling, refresh); BreadcrumbBar component with status colors and action label.
- Wired BreadcrumbBar into App with configurable placement; keybind Leader+b runs current breadcrumb action (queues skill name; Chat consumes and submits skill content as prompt).
- Chat header hides repo path when breadcrumb is visible; DISCOVERY_SUBPATH import added in App for Skills/Commands modals.
- Updated PLAN2 Addendum B milestone checklists; scratchpad plan and progress.

## 2026-02-09
- Initialized scratchpad files to comply with repo workflow rules.
- Starting Phase 4A: runtime + build migration to Bun and OpenTUI.
- 2026-02-09 17:05 - Updated OpenTUI test docs/comments, ran quality gates, pushed commit.
- 2026-02-09 17:45 - Added perf markers, stream buffering, message list virtualization, diff worker.
- 2026-02-09 19:10 - Implemented tool registry, built-in tools, ACP tool host wiring.
- 2026-02-09 19:40 - Added background task manager, task output tool, and UI task modal.
- 2026-02-09 20:05 - Added shell command auto-detect and tab completion in chat input.
- 2026-02-09 20:30 - Added interactive shell execution with renderer suspend/resume.
- 2026-02-09 20:55 - Added per-harness tool permission overrides.
- 2026-02-09 21:20 - Added agent manager with build/plan agents and markdown agent config loader.
- 2026-02-09 21:50 - Added Tab agent switching and per-agent model/temperature wiring.
- 2026-02-09 22:25 - Added hidden agents, subagent runner, @mentions, and child session navigation.
- 2026-02-09 22:50 - Expanded slash commands (connect/sessions/new/rename/models/details/thinking).
- 2026-02-09 23:15 - Added /editor command and editor integration.
- 2026-02-09 23:40 - Added model listing from ACP session capabilities.
- 2026-02-10 00:10 - Added diagnostics slash commands (/doctor, /debug, /context, /stats, /cost).
- 2026-02-10 00:45 - Added /memory, /copy, /undo/redo/rewind, /share/unshare, and /compact flows.
- 2026-02-10 01:30 - Added /themes selector and /connect agent selection flow.
- 2026-02-10 02:20 - Added checkpoint manager, file change tracking, and /rewind list/delete.
- 2026-02-10 02:55 - Added rewind modal (Esc+Esc) and checkpoint status footer.
- 2026-02-10 03:30 - Added git patch apply fallback for checkpoint undo/redo.
- 2026-02-10 05:05 - Added config loader (JSONC + env/file substitution) and keybind runtime.
- 2026-02-10 05:45 - Added keybind editor tab and persistence to global config.
- 2026-02-10 06:15 - Added Shift+Tab permission mode cycling tied to session modes.
- 2026-02-10 06:55 - Added vim input mode with normal/insert and motion operators.
- 2026-02-10 08:10 - Implemented hooks system with config schema, hook manager, and hooks modal.
- 2026-02-10 09:05 - Added compaction summary storage, context budget indicator, and context attachments modal.
- 2026-02-10 10:05 - Added Gemini/Codex harness defaults and provider health checks.
- 2026-02-10 10:45 - Added unified rules loader and permission rule ingestion.
- 2026-02-10 11:25 - Added headless server mode with HTTP and WebSocket endpoints.
- 2026-02-10 12:05 - Added routing policy config and progress panel.
- 2026-02-10 12:35 - Added CI workflow and publish config; documented server mode.
- 2026-02-10 13:15 - Completed distribution polish (install scripts, update checks, accessibility).
- 2026-02-10 14:05 - Added session export/import (json/zip) and session history filter.
- 2026-02-10 15:10 - Hardened test harness cleanup, terminal handler timeouts, env isolation.
- 2026-02-10 15:40 - Closed headless server sockets more aggressively in tests.
- 2026-02-10 16:25 - Forced test env setup before modules; tests still hang after run.
- 2026-02-10 04:20 - Added execution engine wiring for plan task orchestration.
- 2026-02-10 16:40 - Updated PLAN.md checklists from scratchpad progress.
- 2026-02-10 17:35 - Updated docs/commands for Bun scripts; npm run lint/typecheck/test/build failed because bunx is unavailable (bun not installed).
- 2026-02-10 18:10 - Ran bun update; lint/typecheck/build pass, tests fail with sqlite persistence timeout.
- 2026-02-10 17:15 - Added OpenTUI/provider/Beads tasks in PLAN.md; added provider model IDs.
- 2026-02-10 17:20 - Added CLI parity subcommands (run/attach/auth) to PLAN.md.
- 2026-02-10 17:35 - Added OpenTUI input UX, workspace, resources parity tasks in PLAN.md.
- 2026-02-10 17:40 - Added session storage/retention tasks to PLAN.md.
- 2026-02-10 17:45 - Clarified storage contract with SQLite/JSON adapters in PLAN.md.
- 2026-02-10 18:10 - Converted all PLAN.md bullets to checkbox tasks.
- 2026-02-10 18:50 - Switched npm build to use npx tsup when bunx is unavailable.

## 2026-02-10 (Cursor Session — Full Backlog Execution)
### Milestone 0: Foundation Fix
- Installed bun 1.3.9, ran bun install (604 packages)
- Fixed SqliteStore: mkdir parent dirs, use executeRawUnsafe for DDL
- Fixed test harness: removed process.exit, added timeout wrapper script
- Generated Prisma client; all quality gates pass

### Milestone 2: Slash Commands
- Added 8 new commands: /add-dir, /permissions, /status, /login, /config, /init, /review, /security-review
- Extracted diagnostics to slash-command-diagnostics.ts, extended to slash-command-extended.ts
- Added categories to all 40+ command definitions

### Milestone 3: Checkpointing
- Added cleanupOldCheckpoints() for batch retention cleanup
- Extracted git operations to checkpoint-git.ts

### Milestone 4: Configuration
- Expanded config schema to 12 sections (compaction, permissions, themes, providers, compatibility, formatters, instructions)
- Extracted Zod schemas to app-config-schema.ts

### Milestone 5: Context Management
- Added ContextManager with token counting, budget levels, auto-compaction trigger
- Added pruneToolOutputs for reducing context

### Milestone 6: Session Management
- Added session forking, diff tracking, findByNameOrId
- Added RetentionPolicy with max sessions/TTL/max bytes

### Milestone 7: Provider Expansion
- Added AnthropicProvider, OpenAIProvider, OllamaProvider with SSE streaming
- Added ProviderRegistry with model refresh and health checks
- Added OpenAI-compatible adapter for Azure, Groq, OpenRouter, Together, Fireworks, Mistral, Perplexity, xAI
- Added small-model resolution

### Milestone 8: Cross-Tool Compatibility
- Added discovery paths for 5 tool folders
- Added universal loaders: skills, commands, agents, hooks, custom tools, instructions
- Added Cursor .mdc parser, init-generator for TOADSTOOL.md

### Milestone 9: Server Mode & CLI
- Added CLI subcommands: run, serve, models, auth, version
- Added headless mode (-p) with --output-format, --max-turns, --max-budget-usd
- Added REST API routes (11 endpoints) wired into headless server

### Milestone 10: Advanced Features
- Added code formatter, model variant cycling, PR status via gh CLI
- Added LSP client stub with language server detection
- Added plugin system with manifest discovery
- Added prompt suggestions (heuristic + LLM prompt)
- Added image support (@image.png extraction, base64 encoding)

### Milestone 11: Distribution
- Updated CI workflow for Bun + Prisma
- Added npm publish workflow
- Added README.md and CONTRIBUTING.md
- Added 6 built-in themes in theme-loader.ts

### Integration & Wiring
- Wired API routes into headless server
- Wired ContextManager into useContextStats hook
- Wired code formatter into tool-host writeTextFile
- Wired auto-title into session completion (useAutoTitle hook)
- Added usePromptSuggestions hook
- Exported 30+ new modules in index.ts
- Extracted input suggestions and checkpoint-git for 500-line compliance

### Testing
- Added 76 new tests across 13 new test files
- Integration tests for cross-tool loading pipeline (7 tests)
- Integration tests for context compaction flow (3 tests)
- Unit tests for all new modules: context, permissions, forking, providers, auto-title, retention, themes, SVG, images, suggestions, model variants, workspace, API routes
- All 121+ test files pass, 0 failures

### Code Quality
- 0 files over 500 lines (max: App.tsx at 500)
- 0 TODO/FIXME comments
- 0 type errors, 0 lint errors
- 479 files linted cleanly
- 2026-02-10 19:05 - Switched typecheck script to use npx for npm support.

## 2026-02-13 (Classifier metadata boundary hardening)

### Summary
- Extracted shared classifier handler ids into
  `src/constants/server-route-classifier-handlers.ts`.
- Updated `classifyApiRoute(...)` so `METHOD_NOT_ALLOWED` and `NOT_FOUND`
  outcomes include explicit `classifierHandler` metadata.
- Updated `classifyServerRoute(...)` to consume API classifier handler metadata
  for API method-not-allowed outcomes.
- Expanded `api-routes.unit` expectations to lock the new classifier metadata.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (API not-found boundary propagation hardening)

### Summary
- Updated `classifyServerRoute(...)` to run API route classification only when
  pathname starts with `/api/`.
- API not-found classification metadata is now propagated directly into server
  `UNHANDLED` results for API-path requests.
- Added focused unit coverage that `/api` (without trailing slash) remains a
  core-unhandled route classification.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/api-routes.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-id whitespace normalization hardening)

### Summary
- Updated harness-id resolution in `loadHarnessConfig(...)` to trim CLI/user/
  project harness-id inputs before precedence resolution.
- Whitespace-only defaults are now treated as absent, preserving fallback to
  single-harness auto-selection when applicable.
- Explicit CLI harness-id values are now trimmed before harness lookup.
- Expanded harness config unit coverage for whitespace default handling and
  trimmed explicit harness-id selection.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Invalid harness-id config guard hardening)

### Summary
- Added `formatInvalidHarnessIdError(...)` to centralize malformed harness-id
  diagnostics.
- Harness config loading now rejects harness ids with surrounding whitespace
  (including whitespace-only ids), preventing ambiguous/hidden id mismatches.
- Expanded focused unit coverage for:
  - invalid harness-id rejection in config loading
  - invalid harness-id message formatting helper

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/harness/harness-error-messages.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Explicit blank CLI harness-id guard hardening)

### Summary
- Updated harness-id resolution to reject explicit CLI harness-id inputs that
  are whitespace-only, returning canonical invalid-id diagnostics.
- Preserved existing behavior for padded-but-valid explicit harness ids by
  continuing to trim and resolve those values.
- Expanded harness config unit coverage for whitespace-only explicit CLI id
  rejection.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Default-harness id validation hardening)

### Summary
- Updated `loadHarnessConfig(...)` to validate configured project/user
  `defaultHarness` values using shared invalid-id validation.
- Project/user defaults now reject:
  - whitespace-only ids
  - padded ids with surrounding whitespace
- Expanded harness-config unit coverage for project/user default-id validation
  failures.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Strict explicit CLI harness-id validation)

### Summary
- Updated explicit CLI harness-id resolution to use shared strict harness-id
  validation.
- Explicit CLI ids now require canonical formatting:
  - exact id succeeds
  - padded id rejects
  - whitespace-only id rejects
- Expanded harness-config unit coverage for exact/padded/blank explicit CLI id
  behavior.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Session-request harness-id canonicalization hardening)

### Summary
- Added shared harness-id utilities for normalization/canonical checks.
- Updated create-session request schema to reject non-canonical `harnessId`
  values (padded or whitespace-only) at validation boundary.
- Reused shared harness-id helper within harness-config id validation to align
  config/runtime semantics.
- Expanded focused coverage across:
  - harness-id utility unit tests
  - server-types schema unit tests
  - headless server integration validation behavior

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-id.unit.test.ts __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/server/server-types.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-id validation message unification)

### Summary
- Added shared canonical harness-id validation message constant.
- Reused shared message text in:
  - harness invalid-id error formatter
  - create-session request schema refinement message
- Expanded focused unit/integration coverage to assert message propagation
  across harness utility/formatter/schema/headless request validation paths.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-id.unit.test.ts __tests__/unit/harness/harness-error-messages.unit.test.ts __tests__/unit/server/server-types.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Empty harness-id message parity hardening)

### Summary
- Updated create-session `harnessId` schema validation to use canonical-id
  refine validation without separate min-length check.
- Empty-string `harnessId` values now emit the same canonical validation
  message as padded/whitespace-only values.
- Expanded focused coverage for empty `harnessId` behavior in:
  - server-types schema unit tests
  - headless-server integration responses

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/server-types.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Unknown harness create-session integration coverage)

### Summary
- Added integration coverage for create-session requests with canonical but
  unconfigured harness ids.
- Locked expected response semantics:
  - `404 Not Found`
  - `formatHarnessNotConfiguredError(<id>)` response payload

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Unregistered adapter create-session integration coverage)

### Summary
- Added headless integration coverage for create-session when configured default
  harness exists but no matching adapter is registered.
- Test provisions temporary isolated harness config and asserts:
  - `404 Not Found`
  - `formatHarnessAdapterNotRegisteredError("custom")`

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-config fallback-on-load-failure coverage)

### Summary
- Added integration coverage ensuring headless server falls back to default
  harness config when `loadHarnessConfig(...)` fails due to invalid harness
  config file data.
- Test validates that startup remains functional by creating a session through
  fallback `mock` harness under invalid-config conditions.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Default-harness cursor flag parsing coverage)

### Summary
- Expanded default harness config unit coverage for cursor feature-flag parsing:
  - padded truthy value (`" true "`) includes cursor harness
  - falsey/invalid values (`"false"`, `"0"`, `"maybe"`) exclude cursor harness
    even when cursor command/args overrides are present

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/default-harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Boolean env-flag parser coverage)

### Summary
- Added direct unit coverage for `parseBooleanEnvFlag(...)`:
  - undefined input behavior
  - truthy values (`true`, padded/case-insensitive, `1`)
  - falsey values (`false`, padded/case-insensitive, `0`)
  - unsupported values (`""`, whitespace-only, `yes`, `no`, `2`)

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/boolean-flags.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Empty harness-config fallback integration coverage)

### Summary
- Added headless integration coverage for fallback behavior when harness config
  file resolves to no harnesses (`harnesses: {}`).
- Test provisions isolated empty harness config and validates session creation
  still succeeds via fallback `mock` harness config path.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Missing-default harness fallback integration coverage)

### Summary
- Added headless integration coverage for fallback behavior when harness config
  has a `defaultHarness` that does not exist in configured harness entries.
- Test provisions isolated harness config with unmatched default and validates
  session creation still succeeds via fallback `mock` harness config path.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Malformed harness-config JSON fallback integration coverage)

### Summary
- Added headless integration coverage for fallback behavior when harness config
  file exists but contains malformed JSON.
- Test provisions isolated malformed `harnesses.json` content and validates
  session creation still succeeds via fallback `mock` harness config path.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Cursor connect-failure resilience integration coverage)

### Summary
- Added headless integration coverage for cursor harness connection failures
  when cursor feature flag is enabled and cursor command is missing.
- Test validates:
  - `cursor-cli` session creation fails with canonical server error response.
  - server remains responsive by successfully creating a subsequent `mock`
    harness session.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

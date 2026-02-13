# Current Execution Plan

## Phase
- Execution hardening after PLAN3 completion.

## Objectives
- Keep PLAN3 tasks at 100% completion with regression-resistant coverage.
- Continue literal-hygiene and fallback-behavior hardening where small gaps remain.
- Preserve green quality gates after each meaningful change.

## Active Workstream
1. Strengthen fallback and feature-flag behavior tests around harness/config loading.
2. Expand focused unit coverage for server and workflow edge cases.
3. Keep strict literal checks green.

## Latest Completed Increment
- Added server infrastructure test coverage:
  - `server-config` runtime resolution behavior
  - `server-types` request/event schema contracts
  - `eventsStream` SSE lifecycle and unsubscribe cleanup
- Added headless-server integration edge coverage:
  - unknown endpoints and unsupported subroutes
  - missing session prompt behavior
- Added route/auth parity coverage:
  - route matcher coverage for `/api/tui/submit-prompt`
  - integration coverage for raw-token server authorization flow
- Added headless request validation hardening:
  - integration coverage for schema-rejection and oversized-body behavior
  - server runtime fix mapping oversized-body errors to `400` responses
- Added unknown-session message retrieval coverage:
  - integration assertion for `/sessions/:id/messages` empty-list behavior
- Added API method semantics hardening:
  - known `/api/*` unsupported methods now return `405`
  - integration coverage for canonical method-not-allowed response
- Added API route body parsing hardening:
  - request body limit enforcement aligned to server max-body config
  - integration coverage for invalid JSON and oversized payload behavior
- Added auth/method-ordering hardening:
  - integration coverage confirming auth challenge precedence on protected API routes
- Added direct handler error-path hardening:
  - TUI route handlers now return explicit 400s for parse/read failures
  - unit coverage added for invalid JSON and oversized payload direct invocation
- Added non-API method semantics hardening:
  - known non-API routes now emit canonical 405 responses for unsupported methods
  - integration coverage added for health/sessions method validation paths
- Added parser deduplication hardening:
  - extracted shared server request-body utility
  - refactored headless + api route parsing to use shared implementation
  - added direct utility unit coverage
- Added non-API auth-ordering validation:
  - integration coverage locking auth-before-method semantics for `/sessions`
- Added method-guard refactor:
  - extracted centralized core-route method validation helper in headless server
  - preserved semantics validated by integration coverage
- Added request-error normalization:
  - direct TUI route parse failures now return canonical invalid-request payloads
  - targeted unit/integration coverage updated for exact canonical error expectations
- Added API route classification abstraction:
  - centralized API route outcome classification (match/method-not-allowed/not-found)
  - headless server now consumes classification helper instead of ad-hoc route probing

## Exit Criteria
- PLAN3 remains fully checked and validated.
- No quality-gate regressions (`lint`, `typecheck`, `test`, `build`).
- New hardening increments documented in PLAN3 execution log.

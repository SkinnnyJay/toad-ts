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
- Added core route classification abstraction:
  - centralized non-API route method classification for headless dispatch
  - dedicated unit coverage for health/sessions/prompt/messages route decisions
- Added session path parser abstraction:
  - centralized parsing for `/sessions/:id/:action` paths
  - reused in headless dispatch and core route classifier
- Added unified server route classification abstraction:
  - composed core + api route classification outcomes in one helper
  - headless server now uses unified route classifier decision pipeline
- Added shared HTTP response helpers:
  - extracted JSON/error response writer behavior into shared server utility
  - refactored headless + API route modules to reuse response helpers
  - added focused unit coverage for header/body semantics
- Added auth response deduplication:
  - refactored server auth middleware to reuse shared error response helper
  - removed duplicated unauthorized response serialization logic
  - preserved Bearer/raw-token auth semantics with existing unit+integration coverage
- Added hook IPC request hardening:
  - standardized method/invalid-payload/server-error responses for hook IPC HTTP endpoint
  - added top-level request failure handling with canonical server error payload
  - expanded hook IPC unit coverage for method, malformed JSON, and thrown-handler paths
- Added default harness fallback coverage:
  - created focused unit coverage for `createDefaultHarnessConfig`
  - validated cursor feature-flag gating for unset and numeric-truthy env paths
  - validated environment argument override parsing for default harness commands
- Added HTTP response helper header hardening:
  - response helper now enforces JSON content-type even when custom headers are passed
  - added focused coverage for custom-header merge semantics
  - validated downstream auth usage remains correct
- Added harness config selection edge coverage:
  - locked single-harness auto-selection behavior when no default is provided
  - locked no-default error behavior when multiple harnesses are configured
  - locked explicit unknown harness-id failure path formatting
- Added hook IPC schema-error coverage:
  - extended hook IPC unit tests to cover schema-invalid JSON payloads
  - validated canonical invalid-request response mapping remains stable
- Added API agents integration contract coverage:
  - strengthened `/api/agents` integration assertions for defaultHarnessId semantics
  - now validates default harness id is present and corresponds to a returned agent id
- Added request-body byte-size correctness hardening:
  - request body size checks now use utf-8 byte counts instead of string length
  - added utility coverage for multibyte overflow, chunked reads, and stream error path
- Added strict session-subroute parsing hardening:
  - session route parser now rejects extra path segments beyond expected shape
  - added coverage to lock unknown-endpoint behavior for over-segmented session routes
  - moved segment-limit literal into shared limits config to keep strict literal checks green
- Added headless invalid-JSON response normalization:
  - syntax-error handling now returns canonical invalid-request response payload
  - aligned non-API invalid JSON behavior with existing API route canonical mapping
- Added request-body chunk accounting hardening:
  - request-body helper now measures bytes directly from incoming chunk type (string/buffer)
  - added focused coverage for buffer chunk inputs and exact-byte-limit acceptance
- Added repo workflow remote parsing hardening:
  - repo workflow parser now recognizes ssh protocol remotes (ssh://...)
  - added coverage for ssh-protocol remote owner/repo extraction behavior
- Added auth bearer-scheme robustness hardening:
  - server auth now accepts case-insensitive bearer scheme prefixes
  - preserved raw-token support and canonical unauthorized response behavior
- Added repo checks-status classification hardening:
  - repo workflow check classification now treats queued checks as pending
  - repo workflow check classification now treats cancelled checks as failing
- Added auth header whitespace hardening:
  - server auth now trims authorization header and extracted token values
  - tolerant handling for bearer/raw token values with surrounding whitespace
- Added repo checks pending-state parity hardening:
  - repo checks classifier now recognizes explicit `pending` status as pending
  - added unit coverage to lock pending-status mapping behavior

## Exit Criteria
- PLAN3 remains fully checked and validated.
- No quality-gate regressions (`lint`, `typecheck`, `test`, `build`).
- New hardening increments documented in PLAN3 execution log.

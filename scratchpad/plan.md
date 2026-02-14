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
- Added repeated explicit cursor connect-failure integration coverage:
  - headless integration now verifies consecutive explicit `harnessId:
    "cursor-cli"` session requests return canonical server-error responses when
    cursor command connect checks fail
  - validates explicit `mock` session creation still succeeds after repeated
    explicit cursor connect-failure requests
- Added repeated default cursor-disabled integration coverage:
  - headless integration now verifies repeated default `/sessions` requests
    return canonical adapter-not-registered responses when `defaultHarness` is
    `cursor-cli` and cursor adapter is disabled
  - validates explicit `mock` session creation still succeeds after repeated
    default-route adapter-not-registered responses
- Added repeated adapter-not-registered integration coverage:
  - headless integration now verifies consecutive default `/sessions` requests
    return canonical adapter-not-registered responses when `defaultHarness` is
    `cursor-cli` but cursor adapter is disabled
  - validates explicit `mock` session creation still succeeds after repeated
    adapter-not-registered responses in the same runtime
- Added harness-registry cursor-disable unit coverage:
  - registry factory tests now assert `createHarnessRegistry(...)` excludes
    `cursor-cli` when cursor is disabled while still including `mock` when
    `includeMock` remains enabled
- Added repeated cursor-not-configured integration coverage:
  - headless integration now verifies consecutive explicit `cursor-cli`
    requests return canonical harness-not-configured responses when cursor is
    disabled in default harness config
  - validates explicit `mock` session creation still succeeds after repeated
    cursor-not-configured requests in the same runtime
- Added repeated cursor connect-failure integration coverage:
  - headless integration now verifies consecutive default cursor-harness
    failures return canonical server errors in the same runtime
  - validates explicit `mock` session creation still succeeds after repeated
    cursor connection failures
- Added harness-registry normalization unit coverage:
  - registry factory unit tests now assert `createHarnessRegistry(...)` omits
    mock adapter entries when `includeMock: false`
  - added wrapper-level assertions for padded/case-insensitive cursor env-flag
    parsing behavior in `isCursorHarnessEnabled(...)`
- Added cursor default-config disablement integration coverage:
  - headless integration now verifies that with cursor disabled in default
    harness configuration, explicit `cursor-cli` requests return canonical
    harness-not-configured responses
  - validates explicit `mock` session creation still succeeds in the same
    server instance under default-config cursor disablement
- Added harness-registry factory fallback unit coverage:
  - harness registry factory unit tests now cover `includeMock: false`
    adapter-list behavior
  - added explicit unsupported cursor env-flag fallback assertions to lock
    default-value behavior in `isCursorHarnessEnabled(...)`
  - normalized adapter id assertions to shared harness constants
- Added default cursor disabled partial-availability integration coverage:
  - headless integration now verifies default session creation fails with
    canonical adapter-not-registered response when `defaultHarness` is
    `cursor-cli` but cursor adapter is disabled
  - validates explicit `mock` session creation still succeeds in the same
    server instance under that default-harness failure condition
- Added default cursor connect-failure integration coverage:
  - headless integration now verifies default-harness session creation returns
    canonical server error when `cursor-cli` is default and connection checks
    fail
  - validates server continuity by successfully creating an explicit `mock`
    session immediately after the failed default cursor path
- Added partial harness-availability integration coverage:
  - headless integration now verifies disabled `cursor-cli` adapter returns
    canonical adapter-not-registered responses while configured `mock` harness
    remains operational in the same server instance
  - locks mixed harness availability behavior for feature-flagged adapter
    disablement scenarios
- Added cursor feature-flag adapter-disable integration coverage:
  - headless integration now verifies that when `cursor-cli` is configured as
    default harness but cursor adapter is disabled by env flag, session create
    returns canonical adapter-not-registered response
  - locks config + registry feature-flag boundary behavior for cursor harness
    selection
- Added cursor connect-failure resilience integration coverage:
  - headless integration now verifies cursor harness connect failures return
    canonical server errors when cursor feature flag is enabled with a missing
    cursor command
  - validates server remains responsive by successfully creating a follow-up
    `mock` harness session after the cursor failure path
- Added malformed harness-config JSON fallback integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when `harnesses.json` exists but contains malformed JSON
  - validates successful session creation via fallback `mock` harness under
    malformed JSON config conditions
- Added missing-default-harness fallback integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when `defaultHarness` points to an unknown harness id
  - validates successful session creation via fallback `mock` harness under
    unmatched default-harness configuration
- Added empty harness-config fallback integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when configured harnesses map is empty
  - validates successful session creation via fallback `mock` harness under
    empty harness-config conditions
- Added boolean env-flag parser coverage:
  - added focused unit tests for `parseBooleanEnvFlag(...)` truthy/falsey/
    unsupported input variants, including padded and case-insensitive values
- Added default-harness cursor feature-flag parsing coverage:
  - padded truthy cursor flag values now covered for harness inclusion behavior
  - falsey/invalid cursor flag variants now covered for harness exclusion
    behavior even with cursor command/args overrides
- Added harness-config fallback-on-load-failure integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when configured harness file is invalid
  - validates successful session creation via fallback `mock` harness
    under invalid harness-config conditions
- Added unregistered-adapter create-session integration coverage:
  - headless integration now verifies configured default harnesses without a
    registered adapter return `404` adapter-not-registered errors
  - added isolated temp project/home harness-config setup in integration
    coverage to lock runtime adapter lookup failure semantics
- Added unknown-harness create-session integration coverage:
  - headless integration now verifies canonical but unconfigured harness ids
    return `404` with formatted harness-not-configured message
  - locks unresolved harness-selection semantics at session-creation boundary
- Added empty harness-id message parity hardening:
  - create-session harness-id schema now emits canonical invalid-id message for
    empty string values (parity with padded/whitespace-only values)
  - expanded server-types unit and headless integration coverage for empty
    harness-id request handling
- Added harness-id validation message unification hardening:
  - shared canonical harness-id validation message constant now reused across
    harness error formatting and server request schema validation
  - create-session schema now emits deterministic harness-id validation message
  - expanded unit/integration coverage for message propagation in schema +
    headless bad-request payloads
- Added session-request harness-id canonicalization hardening:
  - shared harness-id utility added for canonical-id checks/normalization
  - create-session request schema now rejects padded/blank harness ids at
    validation boundary
  - harness config id validation now reuses shared harness-id helper for
    consistent semantics
  - expanded harness utility + server schema + headless integration coverage
- Added strict explicit CLI harness-id validation hardening:
  - explicit CLI harness-id selection now requires canonical ids
    (padded/whitespace-only ids reject)
  - exact explicit harness-id selection continues to resolve normally
  - expanded harness-config unit coverage for exact vs padded/blank explicit
    CLI harness-id behavior
- Added default-harness id validation hardening:
  - project/user `defaultHarness` values now reject whitespace-only and padded
    ids via shared invalid-id validation
  - prevents silent fallback/coercion when defaults are malformed in config
  - expanded harness-config unit coverage for project/user default-id
    validation failures
- Added explicit blank CLI harness-id guard hardening:
  - whitespace-only explicit CLI harness-id values now reject with invalid-id
    diagnostics instead of silently falling back to defaults
  - preserved trimmed lookup behavior for padded-but-valid explicit ids
  - expanded harness config unit coverage for explicit blank CLI id rejection
- Added invalid harness-id config guard hardening:
  - harness-config loader now rejects harness ids with leading/trailing
    whitespace (including whitespace-only ids)
  - added explicit invalid harness-id formatter for standardized diagnostics
  - expanded harness config/error-message unit coverage for invalid-id paths
- Added harness-id whitespace normalization hardening:
  - harness id resolver now trims CLI/user/project harness-id inputs before
    applying precedence
  - whitespace-only defaults now correctly fall through to single-harness
    auto-selection behavior
  - explicit CLI harness-id selection now trims before harness lookup
  - expanded harness config unit coverage for whitespace/default/id edge cases
- Added API not-found boundary propagation hardening:
  - server route classifier now only runs API classification for `/api/` paths
  - API not-found outcomes now propagate classifier handler metadata directly
    into server `UNHANDLED` classification decisions
  - added focused unit coverage for `/api` root path classification to lock
    core-unhandled behavior
- Added API classifier boundary metadata hardening:
  - extracted shared classifier handler constants to
    `server-route-classifier-handlers`
  - `classifyApiRoute(...)` now returns explicit classifier handler ids for
    method-not-allowed and not-found outcomes
  - server route classifier now reuses API classifier metadata for API
    method-not-allowed classification
  - expanded `api-routes.unit` assertions for classifier metadata
- Added api/core classifier handler IDs:
  - route classifier now returns explicit `api_route_classifier` /
    `core_route_classifier` ids for method-not-allowed + unhandled outcomes
  - headless validation telemetry now uses classifier-provided handler ids for
    finer-grained diagnostics
- Added route-classifier/method-guard validation telemetry:
  - headless route-classifier method-not-allowed/not-found paths now emit shared
    validation telemetry with handler id `route_classifier`
  - hook IPC non-POST method guard now emits shared validation telemetry with
    handler id `method_guard`
- Added headless session validation handler identifiers:
  - session create/prompt schema validation failures now include explicit
    handler ids in shared validation telemetry (`session_create`, `session_prompt`)
  - added integration coverage for invalid prompt payload schema path
- Added file-search validation telemetry parity:
  - search-files query/url validation failures now emit shared standardized
    validation telemetry
  - extends validation diagnostics parity to non-JSON API validation paths
- Added shared request-validation telemetry parity:
  - introduced shared validation telemetry helper and reused it for hook IPC
    schema-invalid payloads and headless zod-validation failures
  - expanded unit coverage for validation telemetry helper + hook schema-invalid
    warning assertions under standardized telemetry schema
- Added shared request-parse telemetry helper:
  - introduced shared parse-failure logging helper and source constants
  - standardized warning metadata keys for API/headless/hook parse failures
  - expanded unit assertions for shared telemetry schema behavior
- Added API parse-failure diagnostics parity:
  - API TUI handlers now emit structured warning diagnostics for request-body
    parse failures, aligned with hook IPC/headless diagnostics behavior
  - shared parse-error details helper added and reused for API + hook IPC paths
  - expanded TUI handler coverage for request stream `error`/`aborted` failures
- Added headless route-local parse handling hardening:
  - body parse failures for session creation/prompt routes are now handled in
    localized route-level catch blocks with contextual warning diagnostics
  - preserved shared parse-error normalization while tightening control-flow
    boundaries for request parsing
- Added shared request-error normalization utility:
  - centralized request body parse error normalization/classification for server
    entrypoints
  - refactored API routes, hook IPC, and headless server to reuse shared logic
  - added focused unit coverage for classification behavior
- Added hook IPC shared response helper adoption:
  - hook IPC endpoint now uses shared `sendJsonResponse`/`sendErrorResponse`
    helpers instead of local response serialization functions
  - preserves canonical response semantics and reduces duplicated response code
- Added hook IPC invalid-body diagnostics hardening:
  - hook IPC now emits structured warnings for request-body parse failures while
    preserving canonical 400 response mappings
  - added focused assertions for warning metadata across malformed JSON,
    oversized body, and parser-rejection stream failure paths
- Added hook IPC request-stream failure mapping coverage:
  - added focused unit coverage for aborted-stream and stream-error parser
    rejection paths in hook IPC endpoint handling
  - locks canonical `400 INVALID_REQUEST` response behavior for non-size body
    reader lifecycle failures
- Added CLI env-command blank fallback hardening:
  - Claude and Cursor runtime command resolution now trims env command inputs
    and falls back to harness defaults for whitespace-only overrides
  - added focused unit coverage for blank-command env behavior in:
    - `claude-cli-harness.unit.test.ts`
    - `cursor-cli-connection.unit.test.ts`
- Added hook IPC request-body parser hardening:
  - switched hook IPC body parsing to shared request parser helper
  - added oversized payload coverage with canonical request-body-too-large response
- Added hook IPC non-object payload coverage hardening:
  - locked canonical invalid-request behavior for array and primitive JSON payloads
    sent to hook IPC endpoint
- Added SSE pre-closed response cleanup hardening:
  - events stream now proactively cleans up immediately when response is already ended/destroyed
  - added focused unit coverage for pre-closed response path
- Added file-search key-normalization hardening:
  - query key matching now normalizes key names for duplicate detection across case variants
  - added coverage for uppercase keys, mixed-case duplicate rejection, and encoded-separator values
- Added mixed-chunk request-body decoding hardening:
  - unified UTF-8 decode path now handles both string and buffer chunks
  - added mixed chunk and malformed partial-buffer ordering coverage
- Added auth-header type hardening in server auth middleware:
  - normalized authorization values now require a single non-empty string
  - array/empty header values now map to canonical authorization-required failures
  - added focused unit coverage for header-shape edge cases
- Added harness env-expansion validation hardening:
  - expanded harness configs are now re-validated after env substitution
  - added focused coverage for env-map merge precedence and missing-command expansion failure
- Added default harness env-override hardening:
  - command overrides now trim whitespace and fall back to defaults when blank
  - explicit empty-string args overrides now resolve to empty argument arrays
  - added focused unit coverage in `default-harness-config.unit.test.ts`
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
- Added ssh remote trailing-slash parsing hardening:
  - repo remote parser now accepts scp-style ssh remotes with trailing slash suffix
  - added unit coverage to lock owner/repo extraction for this remote variant
- Added response-helper managed-header sanitization hardening:
  - response helper now strips case-variant managed content headers from custom inputs
  - added unit coverage to lock content-type/content-length header precedence behavior
- Added request-body single-settlement hardening:
  - request-body reader now guards resolve/reject to settle exactly once
  - added chunk-overflow coverage for multi-chunk max-body enforcement path
- Added remote-url scheme-case parsing hardening:
  - repo remote parser now accepts uppercase HTTPS/SSH scheme variants
  - added workflow info unit coverage for uppercase HTTPS remotes
- Added repo-workflow literal hygiene hardening:
  - extracted GH checks JSON field list into named constant
  - replaced raw PR-state/review-decision literals with domain constants
- Added git-protocol remote parsing hardening:
  - repo remote parser now supports `git://host/owner/repo.git` URLs
  - added workflow info unit coverage for git protocol remotes
- Added request-stream abort/close hardening:
  - request-body helper now rejects aborted/prematurely closed streams
  - listener cleanup added to avoid stale handlers after settlement
- Added scp-SSH custom-user parsing hardening:
  - repo parser now accepts scp ssh remotes with non-`git` user prefixes
  - added workflow info unit coverage for `alice@host:owner/repo.git`
- Added uppercase `.GIT` suffix remote parsing hardening:
  - repo parser now normalizes case-variant `.git` suffixes
  - added workflow info unit coverage for `.../repo.GIT` remotes
- Added scp-remote no-user parsing hardening:
  - repo parser now accepts scp-style remotes without explicit user prefix
  - added workflow info unit coverage for `host:owner/repo.git` remotes
- Added uppercase SSH protocol parsing coverage:
  - added workflow info unit coverage for `SSH://...` protocol-case variant remotes
- Added git+ssh remote parsing hardening:
  - repo parser now accepts `git+ssh://...` remote URLs
  - added workflow info unit coverage for git+ssh protocol remotes
- Added SSE close-unsubscribe idempotency hardening:
  - events stream close handler now uses one-time listener semantics
  - added unit coverage for duplicate close-event safety
- Added check-status whitespace normalization hardening:
  - repo workflow checks parser now trims status/conclusion fields before classification
  - added unit coverage for whitespace-padded pending/failing check states
- Added UTF-8 BOM JSON parsing hardening:
  - request-body JSON parser now strips leading UTF-8 BOM before parsing
  - added unit coverage for BOM-prefixed JSON and BOM-only empty-body fallback
- Added search-files host-header fallback hardening:
  - file-search URL parser now defaults to localhost when host header is absent
  - added unit coverage for hostless request parsing path
- Added UTF-8 split-chunk decoding hardening:
  - request-body reader now uses StringDecoder for buffer chunk boundaries
  - added unit coverage for multi-byte UTF-8 split across buffer chunks
- Added HTTP-method normalization hardening for route classifiers:
  - shared method normalizer now canonicalizes trim+case for route matching
  - added unit coverage for lowercase/padded method handling across classifiers
- Added file-search query-trim hardening:
  - file-search now rejects whitespace-only query values
  - added unit coverage for whitespace-only and trimmed-query behavior
- Added SSE response-close cleanup hardening:
  - events stream now unsubscribes on response close in addition to request close
  - added unit coverage for response-close cleanup path
- Added PR status normalization hardening:
  - PR state/review decision parsing now trims + validates against known values
  - added unit coverage for padded and unsupported review-decision values
- Added strict file-search query decoding hardening:
  - query parameter decoding now validates malformed percent-encoding sequences
  - added unit coverage for malformed encoded query rejection path
- Added PR status timeout/options coverage hardening:
  - added unit assertions for GH CLI timeout + cwd wiring in PR status lookups
  - expanded PR status unit coverage alongside normalization behavior
- Added events-stream error-path cleanup hardening:
  - SSE subscriptions now clean up on request/response error events
  - added unit coverage for response-error and request-error cleanup paths
- Added file-search plus-decoding contract coverage:
  - locked behavior that `q=readme+notes` decodes to `readme notes`
  - expanded focused file-search unit coverage without changing runtime behavior
- Added events-stream aborted-request cleanup hardening:
  - SSE subscriptions now clean up when request emits `aborted`
  - added unit coverage for aborted + close event idempotency
- Added events-stream write-failure cleanup hardening:
  - SSE update writes now fail-safe and trigger cleanup when response write throws
  - added unit coverage for write-failure cleanup behavior
- Added events-stream stale-callback guard hardening:
  - SSE callback now no-ops after cleanup to prevent writes from stale listeners
  - added unit coverage locking post-cleanup callback behavior
- Added repo-workflow normalization hardening:
  - derive status now trims state/review-decision fields before comparisons
  - added unit coverage for padded merged state and approved decision inputs
- Added file-search duplicate-query hardening:
  - search route now rejects duplicated `q` params as invalid requests
  - added unit coverage for duplicated query-parameter behavior
- Added file-search encoded-key hardening:
  - search route now decodes query-parameter names with strict decoding
  - supports encoded `q` key and rejects malformed encoded parameter names
- Added headless file-search integration hardening:
  - added end-to-end coverage for file-search duplicate/encoded/malformed query keys
  - locks server-level response semantics for these file-search edge cases
- Added shared request-url parser hardening:
  - extracted safe URL parsing helper with malformed-host/URL null fallback
  - reused parser in headless server + file-search route handling
- Added missing-request-url hardening:
  - shared parser now returns null for missing request URLs
  - file-search route now returns canonical invalid-request for missing url input
- Added request-url whitespace normalization hardening:
  - shared parser now trims url/host inputs before URL construction
  - preserves valid parsing for whitespace-padded host/url request values
- Added request-target strictness hardening:
  - shared parser now rejects non-origin-form request targets (absolute URLs)
  - file-search route now returns invalid-request for absolute request targets
- Added protocol-relative request-target hardening:
  - shared parser now rejects `//...` request targets explicitly
  - file-search route now returns invalid-request for protocol-relative targets
- Added non-origin-form integration coverage:
  - headless integration now validates absolute/protocol-relative request-target
    rejection through raw HTTP request paths
- Added repo-workflow check-field type hardening:
  - check-field normalizer now safely handles non-string GH check payload fields
  - added unit coverage for malformed check-status payload shapes
- Added repeated unknown-harness continuity hardening:
  - headless integration now validates repeated explicit unknown harness requests
    return canonical harness-not-configured responses
  - verifies explicit mock session creation succeeds after repeated unknown-harness
    failures in the same server runtime
- Added repeated default custom-adapter continuity hardening:
  - headless integration now validates repeated default-route requests when
    configured default harness points to an unregistered custom adapter id
  - verifies canonical adapter-not-registered responses persist across repeats
    and explicit mock sessions remain operational in the same runtime
- Added repeated fallback mock continuity hardening:
  - headless integration now validates repeated explicit mock session creation
    when harness-file loading fails and server falls back to default harness config
  - verifies fallback-path repeated success semantics and distinct generated
    session ids across consecutive requests
- Added repeated fallback-trigger continuity hardening:
  - headless integration now validates repeated explicit mock session creation
    for fallback paths triggered by empty harness config and missing configured
    default harness id
  - verifies repeated fallback-trigger requests produce successful responses
    and distinct generated session ids in both scenarios
- Added repeated merge-override fallback continuity hardening:
  - headless integration now validates repeated explicit mock session creation
    when project/user merged harness config selects a missing user default id
    and server falls back to default harness config
  - verifies repeated fallback requests return successful responses and distinct
    session ids in the same runtime
- Added repeated merged-runtime override continuity hardening:
  - headless integration now validates repeated default session failures when
    project/user merged config preserves `cursor-cli` id but user override sets
    cursor command to an invalid runtime value
  - verifies canonical repeated server-error responses and follow-up explicit
    mock session continuity in the same runtime
- Added repeated merged env-expansion override continuity hardening:
  - headless integration now validates repeated explicit mock sessions when
    merged project/user override keeps `mock` id but command env-expands to an
    empty runtime value
  - verifies fallback-to-default behavior remains stable across repeated
    requests with distinct valid session ids
- Added repeated merged cwd-override continuity hardening:
  - headless integration now validates repeated explicit mock sessions when
    merged project/user override keeps `mock` id but `cwd` env-expands to an
    empty runtime value
  - verifies fallback-to-default behavior remains stable across repeated
    requests with distinct valid session ids
- Added repeated merged blank-command override continuity hardening:
  - headless integration now validates repeated explicit mock sessions when
    merged project/user override keeps `mock` id but command is blank
  - verifies fallback-to-default behavior remains stable across repeated
    requests with distinct valid session ids
- Added repeated merged env-map continuity hardening:
  - headless integration now validates repeated default-route sessions when
    merged project/user overrides keep valid harness id + command/cwd but env
    values expand to empty strings
  - verifies merged config remains valid without fallback and repeated default
    requests return successful distinct session ids
- Added merged env-map prompt continuity hardening:
  - headless integration now validates repeated session creation plus prompt
    submission flows under merged env-map empty-expansion overrides
  - verifies downstream prompt handling remains successful while merged config
    stays valid and avoids fallback
- Added merged env-map mixed-request continuity hardening:
  - headless integration now validates mixed default + explicit session creation
    sequences in the same runtime under merged env-map empty-expansion overrides
  - verifies mixed-path session creations and follow-up prompt submission remain
    successful while merged config stays valid and avoids fallback
- Added merged env-map mixed-validation continuity hardening:
  - headless integration now validates mixed explicit/default session-create
    ordering with invalid prompt payload rejection under merged env-map
    empty-expansion configuration
  - verifies subsequent valid prompt and trailing session creation remain
    successful after validation failure in the same runtime
- Added merged env-map repeated invalid-cycle continuity hardening:
  - headless integration now validates repeated invalid prompt payload cycles
    across multiple sessions under merged env-map empty-expansion configuration
  - verifies validation rejection stability plus valid prompt recovery and
    trailing session creation continuity in the same runtime
- Added merged env-map websocket continuity hardening:
  - headless integration now validates websocket session-created event stream
    stability while mixed create/invalid-prompt/valid-prompt cycles run under
    merged env-map empty-expansion configuration
  - verifies websocket emits distinct session-created events for each created
    session id without destabilizing server continuity
- Added merged env-map state-update stream continuity hardening:
  - headless integration now validates concurrent `/api/events` SSE delivery
    of repeated `STATE_UPDATE` events while merged env-map mixed validation
    cycles execute
  - verifies combined websocket `SESSION_CREATED` and SSE `STATE_UPDATE`
    continuity in the same runtime
- Added merged env-map SSE reconnect continuity hardening:
  - headless integration now validates `/api/events` teardown + reconnect
    behavior after invalid prompt validation and subsequent valid prompt
  - verifies repeated `STATE_UPDATE` delivery across first and second SSE
    stream connections in the same runtime
- Added merged env-map interleaved stream reconnect hardening:
  - headless integration now validates interleaved websocket + `/api/events`
    reconnect cycles across longer mixed validation sequences
  - verifies first and second websocket/SSE connection pairs both receive
    expected `SESSION_CREATED` and `STATE_UPDATE` events in the same runtime
- Added merged env-map alternating reconnect hardening:
  - headless integration now validates repeated reconnect cycles with
    alternating default and explicit `mock` harness create requests
  - verifies each alternating cycle preserves websocket `SESSION_CREATED` and
    SSE `STATE_UPDATE` continuity plus prompt validation recovery behavior
- Added merged env-map alternating burst reconnect hardening:
  - headless integration now validates alternating reconnect cycles where each
    cycle includes repeated invalid prompt payload bursts before recovery
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
    persist alongside repeated bad-request validation and valid-prompt recovery
- Added merged env-map mixed-close reconnect hardening:
  - headless integration now validates alternating reconnect cycles with mixed
    websocket close timing (before vs after prompt recovery)
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
    remains stable across mixed close-order cycles
- Added merged env-map jitter reconnect hardening:
  - headless integration now validates extended reconnect cycles with mixed
    close timing and reconnect jitter before session creation
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    validation recovery stability across all jittered cycles
- Added merged env-map alternating burst-size reconnect hardening:
  - headless integration now validates extended reconnect cycles that alternate
    default/explicit harness requests while varying invalid-prompt burst sizes
    per cycle
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    prompt validation recovery stability across all burst-size permutations
- Added merged env-map variable SSE cadence reconnect hardening:
  - headless integration now validates reconnect cycles where SSE stream
    teardown/reconnect cadence varies per cycle while session create requests
    continue alternating default/explicit harness paths
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability across all cadence permutations
- Added merged env-map dual cadence reconnect hardening:
  - headless integration now validates reconnect cycles where websocket and SSE
    reconnect cadence both vary per cycle while alternating default/explicit
    session create requests continue
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability across combined cadence permutations

## Exit Criteria
- PLAN3 remains fully checked and validated.
- No quality-gate regressions (`lint`, `typecheck`, `test`, `build`).
- New hardening increments documented in PLAN3 execution log.

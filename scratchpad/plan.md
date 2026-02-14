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
- Added merged env-map reconnect-order inversion hardening:
  - headless integration now validates alternating reconnect-order inversion per
    cycle (SSE-first vs websocket-first) while dual websocket/SSE cadence
    variation remains active
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability under both reconnect orders
- Added merged env-map reconnect-order jitter hardening:
  - headless integration now validates reconnect-order inversion with per-cycle
    jitter variation for stream-open ordering and create cadence
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability under jittered reconnect-order
    permutations
- Added merged env-map reconnect-order asymmetric burst hardening:
  - headless integration now validates longer reconnect-order inversion runs
    with asymmetric invalid-prompt burst sizes mapped to stream-open order path
    (`SSE-first` vs `websocket-first`)
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    valid-prompt recovery stability under asymmetric burst pressure
- Added merged env-map reconnect-order cadence expansion hardening:
  - reconnect-order inversion coverage now expands per-order-path create
    cadence in one runtime (`SSE-first` lower cadence, `websocket-first`
    higher cadence) while preserving dual stream assertions
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable across expanded cadence
- Added merged env-map reconnect-order jitter expansion hardening:
  - reconnect-order inversion cadence coverage now applies explicit per-order-
    path jitter arrays for stream-open sequencing and create timing
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    jitter expansion by order path
- Added merged env-map reconnect-order segment asymmetry hardening:
  - reconnect-order inversion cadence coverage now applies asymmetric websocket
    vs SSE reconnect segment counts per order path in the same runtime
  - `SSE-first` cycles run fewer websocket segments and more SSE segments,
    while `websocket-first` cycles invert that segment split
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    jitter + segment-count asymmetry by order path
- Added merged env-map reconnect-order jitter amplitude asymmetry hardening:
  - reconnect-order segment-asymmetry coverage now applies asymmetric
    websocket vs SSE segment-open jitter amplitudes per order path
  - `SSE-first` cycles use lower websocket jitter + higher SSE jitter, while
    `websocket-first` cycles invert that jitter amplitude split
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + jitter-amplitude asymmetry by order path
- Added merged env-map reconnect-order create-jitter asymmetry hardening:
  - reconnect-order jitter-amplitude coverage now applies asymmetric
    create-jitter amplitudes per order path
  - `SSE-first` cycles use lower create-jitter amplitude, while
    `websocket-first` cycles use higher create-jitter amplitude
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry by order path
- Added merged env-map reconnect-order recovery-jitter asymmetry hardening:
  - reconnect-order create-jitter coverage now applies asymmetric invalid-
    prompt recovery jitter amplitudes per order path
  - `SSE-first` cycles use lower recovery jitter amplitude, while
    `websocket-first` cycles use higher recovery jitter amplitude
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry by order path
- Added merged env-map reconnect-order burst-spacing asymmetry hardening:
  - reconnect-order recovery-jitter coverage now applies asymmetric invalid-
    prompt burst spacing amplitudes per order path
  - `SSE-first` cycles use lower invalid-burst spacing, while
    `websocket-first` cycles use higher invalid-burst spacing
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry by order
    path
- Added merged env-map reconnect-order post-recovery delay asymmetry hardening:
  - reconnect-order burst-spacing coverage now applies asymmetric valid-prompt
    post-recovery delay amplitudes per order path
  - `SSE-first` cycles use lower post-recovery delays, while
    `websocket-first` cycles use higher post-recovery delays
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry by order path
- Added merged env-map reconnect-order cycle-cooldown asymmetry hardening:
  - reconnect-order post-recovery delay coverage now applies asymmetric cycle-
    end cooldown jitter amplitudes per order path
  - `SSE-first` cycles use lower cycle cooldown jitter, while
    `websocket-first` cycles use higher cycle cooldown jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry by order path
- Added merged env-map reconnect-order close-delay asymmetry hardening:
  - reconnect-order cycle-cooldown coverage now applies asymmetric websocket
    and SSE close-delay amplitudes per order path
  - `SSE-first` cycles use lower websocket/SSE close-delay amplitudes, while
    `websocket-first` cycles use higher close-delay amplitudes
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry by order path
- Added merged env-map reconnect-order close-interleave asymmetry hardening:
  - reconnect-order close-delay coverage now applies asymmetric close-
    interleave timing between websocket and SSE segment completion handlers
  - `SSE-first` cycles use lower close-interleave delays, while
    `websocket-first` cycles use higher close-interleave delays
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry by order path
- Added merged env-map reconnect-order post-close create scheduling asymmetry hardening:
  - reconnect-order close-interleave coverage now applies asymmetric post-close
    create scheduling jitter per order path
  - `SSE-first` cycles use lower post-close create jitter, while
    `websocket-first` cycles use higher post-close create jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt scheduling asymmetry hardening:
  - reconnect-order post-close create scheduling coverage now applies
    asymmetric post-close prompt scheduling jitter per order path
  - `SSE-first` cycles use lower post-close prompt jitter, while
    `websocket-first` cycles use higher post-close prompt jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry by order path
- Added merged env-map reconnect-order post-close recovery scheduling asymmetry hardening:
  - reconnect-order post-close prompt scheduling coverage now applies
    asymmetric post-close recovery scheduling jitter per order path
  - `SSE-first` cycles use lower post-close recovery jitter, while
    `websocket-first` cycles use higher post-close recovery jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry by order path
- Added merged env-map reconnect-order post-close cycle transition asymmetry hardening:
  - reconnect-order post-close recovery scheduling coverage now applies
    asymmetric post-close cycle transition jitter per order path
  - `SSE-first` cycles use lower post-close cycle transition jitter, while
    `websocket-first` cycles use higher post-close cycle transition jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry by order path
- Added merged env-map reconnect-order post-close segment-open gating asymmetry hardening:
  - reconnect-order post-close cycle transition coverage now applies
    asymmetric post-close segment-open gating jitter per order path
  - `SSE-first` cycles use lower post-close segment-open gating jitter, while
    `websocket-first` cycles use higher post-close segment-open gating jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry by order path
- Added merged env-map reconnect-order post-close segment-rearm asymmetry hardening:
  - reconnect-order post-close segment-open gating coverage now applies
    asymmetric post-close segment-rearm jitter per order path
  - `SSE-first` cycles use lower post-close segment-rearm jitter, while
    `websocket-first` cycles use higher post-close segment-rearm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry by
    order path
- Added merged env-map reconnect-order post-close invalid-burst ramp asymmetry hardening:
  - reconnect-order post-close segment-rearm coverage now applies asymmetric
    post-close invalid-burst ramp jitter per order path
  - `SSE-first` cycles use lower post-close invalid-burst ramp jitter, while
    `websocket-first` cycles use higher post-close invalid-burst ramp jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry by order path
- Added merged env-map reconnect-order post-close valid-prompt ramp asymmetry hardening:
  - reconnect-order post-close invalid-burst ramp coverage now applies
    asymmetric post-close valid-prompt ramp jitter per order path
  - `SSE-first` cycles use lower post-close valid-prompt ramp jitter, while
    `websocket-first` cycles use higher post-close valid-prompt ramp jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry by order path
- Added merged env-map reconnect-order post-close recovery-confirm asymmetry hardening:
  - reconnect-order post-close valid-prompt ramp coverage now applies
    asymmetric post-close recovery-confirm jitter per order path
  - `SSE-first` cycles use lower post-close recovery-confirm jitter, while
    `websocket-first` cycles use higher post-close recovery-confirm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry by order path
- Added merged env-map reconnect-order post-close recovery-settle asymmetry hardening:
  - reconnect-order post-close recovery-confirm coverage now applies
    asymmetric post-close recovery-settle jitter per order path
  - `SSE-first` cycles use lower post-close recovery-settle jitter, while
    `websocket-first` cycles use higher post-close recovery-settle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry by order path
- Added merged env-map reconnect-order post-close cycle-handoff asymmetry hardening:
  - reconnect-order post-close recovery-settle coverage now applies asymmetric
    post-close cycle-handoff jitter per order path
  - `SSE-first` cycles use lower post-close cycle-handoff jitter, while
    `websocket-first` cycles use higher post-close cycle-handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry by order path
- Added merged env-map reconnect-order post-close cycle-cooldown handoff asymmetry hardening:
  - reconnect-order post-close cycle-handoff coverage now applies asymmetric
    post-close cycle-cooldown handoff jitter per order path
  - `SSE-first` cycles use lower post-close cycle-cooldown handoff jitter,
    while `websocket-first` cycles use higher post-close cycle-cooldown
    handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry by order path
- Added merged env-map reconnect-order post-close cycle-transition handoff asymmetry hardening:
  - reconnect-order post-close cycle-cooldown handoff coverage now applies
    asymmetric post-close cycle-transition handoff jitter per order path
  - `SSE-first` cycles use lower post-close cycle-transition handoff jitter,
    while `websocket-first` cycles use higher post-close cycle-transition
    handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    by order path
- Added merged env-map reconnect-order post-close segment-open handoff asymmetry hardening:
  - reconnect-order post-close cycle-transition handoff coverage now applies
    asymmetric post-close segment-open handoff jitter per order path
  - `SSE-first` cycles use lower post-close segment-open handoff jitter, while
    `websocket-first` cycles use higher post-close segment-open handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry by order path
- Added merged env-map reconnect-order post-close segment-rearm handoff asymmetry hardening:
  - reconnect-order post-close segment-open handoff coverage now applies
    asymmetric post-close segment-rearm handoff jitter per order path
  - `SSE-first` cycles use lower post-close segment-rearm handoff jitter,
    while `websocket-first` cycles use higher post-close segment-rearm handoff
    jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst handoff asymmetry hardening:
  - reconnect-order post-close segment-rearm handoff coverage now applies
    asymmetric post-close prompt-burst handoff jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst handoff jitter, while
    `websocket-first` cycles use higher post-close prompt-burst handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-settle asymmetry hardening:
  - reconnect-order post-close prompt-burst handoff coverage now applies
    asymmetric post-close prompt-burst recovery-settle jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-settle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-settle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-confirm asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-settle coverage now
    applies asymmetric post-close prompt-burst recovery-confirm jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-confirm
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-confirm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-handoff asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-confirm coverage now
    applies asymmetric post-close prompt-burst recovery-handoff jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-handoff
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry by
    order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-cooldown asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-handoff coverage now
    applies asymmetric post-close prompt-burst recovery-cooldown jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-cooldown
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-cooldown jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-drift asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-cooldown coverage now
    applies asymmetric post-close prompt-burst recovery-drift jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-drift
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-drift jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-transition asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-drift coverage now
    applies asymmetric post-close prompt-burst recovery-transition jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-transition
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-transition jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-checkpoint asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-transition coverage now
    applies asymmetric post-close prompt-burst recovery-checkpoint jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-checkpoint
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-checkpoint jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-finalize asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-checkpoint coverage now
    applies asymmetric post-close prompt-burst recovery-finalize jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-finalize
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-finalize jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-anchor asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-finalize coverage now
    applies asymmetric post-close prompt-burst recovery-anchor jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-anchor
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-anchor jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-seal asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-anchor coverage now
    applies asymmetric post-close prompt-burst recovery-seal jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-seal jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-seal jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-guard asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-seal coverage now applies
    asymmetric post-close prompt-burst recovery-guard jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-guard
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-guard jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-lock asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-guard coverage now applies
    asymmetric post-close prompt-burst recovery-lock jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-lock jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-lock jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-bolt asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-lock coverage now applies
    asymmetric post-close prompt-burst recovery-bolt jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-bolt jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-bolt jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-clamp asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-bolt coverage now applies
    asymmetric post-close prompt-burst recovery-clamp jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-clamp
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-clamp jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-brace asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-clamp coverage now applies
    asymmetric post-close prompt-burst recovery-brace jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-brace
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-brace jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-latch asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-brace coverage now applies
    asymmetric post-close prompt-burst recovery-latch jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-latch
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-latch jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-rivet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-latch coverage now applies
    asymmetric post-close prompt-burst recovery-rivet jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-rivet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-rivet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-pin asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-rivet coverage now applies
    asymmetric post-close prompt-burst recovery-pin jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pin jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pin jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-stud asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pin coverage now applies
    asymmetric post-close prompt-burst recovery-stud jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-stud jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-stud jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-spike asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-stud coverage now applies
    asymmetric post-close prompt-burst recovery-spike jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-spike
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-spike jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-notch asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-spike coverage now applies
    asymmetric post-close prompt-burst recovery-notch jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-notch
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-notch jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-groove asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-notch coverage now applies
    asymmetric post-close prompt-burst recovery-groove jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-groove
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-groove jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-ridge asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-groove coverage now applies
    asymmetric post-close prompt-burst recovery-ridge jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-ridge
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-ridge jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-crest asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-ridge coverage now applies
    asymmetric post-close prompt-burst recovery-crest jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-crest
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-crest jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-peak asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-crest coverage now applies
    asymmetric post-close prompt-burst recovery-peak jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-peak jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    peak jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-summit asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-peak coverage now applies
    asymmetric post-close prompt-burst recovery-summit jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-summit
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-summit jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-apex asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-summit coverage now applies
    asymmetric post-close prompt-burst recovery-apex jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-apex jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    apex jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-crown asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-apex coverage now applies
    asymmetric post-close prompt-burst recovery-crown jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-crown jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    crown jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-tiara asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-crown coverage now applies
    asymmetric post-close prompt-burst recovery-tiara jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-tiara jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    tiara jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-diadem asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-tiara coverage now applies
    asymmetric post-close prompt-burst recovery-diadem jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-diadem
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-diadem jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry by order path
- New next candidate:
  - evaluate whether reconnect-order post-close prompt-burst recovery-diadem
    asymmetry should include asymmetric post-close prompt-burst recovery-coronet
    jitter by order path
- Added severity-ordered simplification backlog in PLAN3:
  - appended 50 incomplete tasks using strict checkbox plan format
    (`- [ ] - ...`) with no emoji markers
  - tasks categorized by severity (P0/P1/P2) and focused on:
    - cross-platform reliability (Windows/Linux/macOS)
    - performance and memory-pressure hardening
    - process lifecycle leak prevention
    - NutJS capability/readiness and fallback safety
    - simplification-first architecture cleanup

## Exit Criteria
- PLAN3 remains fully checked and validated.
- No quality-gate regressions (`lint`, `typecheck`, `test`, `build`).
- New hardening increments documented in PLAN3 execution log.

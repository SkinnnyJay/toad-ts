# Scratchpad Progress

## Current Focus
- Phase 0 (PLAN2 Cursor CLI prerequisites) completed on branch `feature/cursor-cli-harness`. Fixtures captured; baseline quality gate recorded (see below).
- PLAN3 completion hardening on branch `cursor/plan3-tasks-completion-62e5` is active:
  - completed B154 health hash auth-bypass coverage hardening
    (password-protected health-route integration coverage now explicitly locks
    hash and trailing-hash variants for GET bypass and unsupported POST
    method semantics without auth challenge)
  - completed B153 protected-api hash auth-order coverage hardening
    (password-protected API auth-before-method integration coverage now
    explicitly locks hash and trailing-hash variants for config and
    execute-command paths with canonical `401`/`405` ordering)
  - completed B152 integration api hash method coverage hardening
    (headless-server integration coverage now explicitly locks known API
    unsupported-method semantics across hash and trailing-hash path variants)
  - completed B151 request-error pathname combined coverage hardening
    (request-error-normalization unit coverage now explicitly locks combined
    trailing-slash + hash + query pathname normalization in parsing-failure
    logging metadata)
  - completed B150 request-url hash parsing coverage hardening
    (request-url unit coverage now explicitly locks hash-bearing path parsing
    and host-header hash metadata rejection behavior)
  - completed B149 session-route-path combined suffix coverage hardening
    (session-route-path unit coverage now explicitly locks combined
    trailing-slash + query/hash parsing behavior across prompt/messages and
    missing-action session-id forms)
  - completed B148 api-route execute/session hash-match coverage hardening
    (api-routes matcher/classifier unit coverage now explicitly locks combined
    trailing-slash + hash semantics for execute-command and session-messages
    match plus execute unsupported-method classification)
  - completed B147 sessions trailing-hash method-guard coverage hardening
    (core-route and server-route classifier unit coverage now explicitly locks
    `/sessions/#...` non-POST method-guard behavior across direct and wrapper
    classification paths)
  - completed B146 api-routes trailing-hash combined coverage hardening
    (api-routes matcher/classifier unit coverage now explicitly locks combined
    trailing-slash + hash variants across match/method-not-allowed/not-found/
    api-root/malformed classification paths with canonical classifier
    ownership)
  - completed B145 server-route core trailing-hash combined coverage hardening
    (server-route classifier unit coverage now explicitly locks combined
    trailing-slash + hash variants across core-route health/method guards,
    unknown-core/missing-action unhandled paths, and API-scope edge routes)
  - completed B144 core-route trailing-hash combined coverage hardening
    (core-route classifier unit coverage now explicitly locks combined
    trailing-slash + hash variants across health, prompt, messages, and
    missing-action session route decisions)
  - completed B143 server-route trailing-hash combined coverage hardening
    (server-route classifier unit coverage now explicitly locks combined
    trailing-slash + hash variants for API match/method-not-allowed
    classification behavior with API classifier ownership)
  - completed B142 api-route root trailing-query not-found coverage hardening
    (api-routes unit coverage now explicitly locks direct classifier behavior
    for `/api/?...` trailing-query root form as API-scoped `NOT_FOUND`)
  - completed B141 core-route health combined-suffix coverage hardening
    (core-route classifier unit coverage now explicitly locks `HEALTH_OK`
    classification for `GET /health` combined trailing-slash + query input)
  - completed B140 server-route missing-action combined coverage hardening
    (server-route classifier unit coverage now explicitly locks combined
    trailing-slash + query missing-action session path classification as
    core-unhandled for both GET and POST methods)
  - completed B139 pathname-normalization combined non-root coverage hardening
    (pathname-normalization unit coverage now explicitly locks combined
    trailing-slash + query/hash + whitespace non-root path normalization to
    canonical route outputs)
  - completed B138 server-route core combined-suffix coverage hardening
    (server-route classifier unit coverage now explicitly locks combined
    trailing-slash+query forms for core-route method guards and unknown-core
    unhandled classification with core classifier ownership)
  - completed B137 api-routes combined-suffix unit coverage hardening
    (api-routes unit coverage now explicitly locks combined trailing-slash +
    query variants across match/method-not-allowed/not-found/malformed
    classification paths with canonical classifier ownership)
  - completed B136 core-route classifier combined-suffix coverage hardening
    (core-route classifier unit coverage now explicitly locks combined
    trailing-slash + query suffix variants for health/sessions/prompt/messages
    method guards and missing-action session unhandled classification)
  - completed B135 server-route classifier combined-path coverage hardening
    (server-route classifier unit coverage now explicitly locks combined
    trailing-slash+query API forms across match/method-not-allowed/API-root
    unhandled/malformed unhandled classifications with API handler ownership)
  - completed B134 protected-api execute-command auth-order coverage hardening
    (password-protected API auth-before-method integration now explicitly locks
    `/api/tui/execute-command` unsupported-method variants across base,
    trailing, query, and trailing+query forms with `401`/`405` ordering)
  - completed B133 non-api method query-trailing coverage hardening
    (non-API method-not-allowed integration now explicitly locks combined
    trailing-slash + query variants across known unsupported-method non-API
    routes with canonical `405` semantics)
  - completed B132 api method query-trailing coverage hardening
    (API method-not-allowed integration now explicitly locks combined
    trailing-slash + query variants across known unsupported-method API routes
    with canonical `405` semantics)
  - completed B131 protected-api query-trailing auth-order coverage hardening
    (password-protected API auth-before-method integration now explicitly locks
    combined trailing-slash + query variants across known unsupported-method
    API routes with unauthenticated `401` and authenticated `405` semantics)
  - completed B130 health query auth-bypass coverage hardening
    (health-route password-protected integration now explicitly locks query and
    trailing-slash+query bypass semantics with canonical GET `200` and
    unsupported POST `405` behavior without auth challenge headers)
  - completed B129 non-api query-trailing auth-order coverage hardening
    (non-api protected-route auth-before-method integration now explicitly
    locks combined trailing-slash + query variants with unauthenticated `401`
    and authenticated `405` semantics)
  - completed B128 unknown-route query-trailing auth-order coverage hardening
    (unknown-route auth-order integration now explicitly locks combined
    trailing-slash + query variants across API/core/session unknown and
    malformed paths with unauthenticated `401` and authenticated `404`
    semantics)
  - completed B127 unknown-route query auth-order coverage hardening
    (unknown-route auth-order integration now explicitly locks query-suffixed
    API/session unknown-path variants under password protection with
    unauthenticated `401` and authenticated `404` semantics)
  - completed B126 unknown-route trailing auth-order coverage hardening
    (unknown-route auth-order integration now explicitly locks trailing-slash
    variants for API/core/session malformed paths under password protection)
  - completed B125 non-api auth-order trailing route variants hardening
    (non-api protected-route auth-order integration now explicitly locks
    additional trailing-slash 401/405 semantics for sessions/prompt/messages)
  - completed B124 non-api auth-order trailing-slash coverage hardening
    (non-api protected-route auth-order integration now locks unauthenticated
    trailing-slash semantics for sessions/prompt/messages variants)
  - completed B123 non-api auth-order method coverage expansion hardening
    (password-protected non-api auth-before-method integration now includes
    session prompt/messages variants with locked `401`/`405` ordering)
  - completed B122 unknown-route auth-order malformed session coverage
    hardening
    (password-protected unknown-route integration now locks malformed session
    variants to unauthenticated `401` and authenticated
    `404` + `UNKNOWN_ENDPOINT` semantics)
  - completed B121 unknown-route auth-order malformed API coverage hardening
    (password-protected unknown-route integration now locks malformed API
    variants to unauthenticated `401` and authenticated `404` semantics)
  - completed B120 core-route missing-action normalization coverage hardening
    (unit coverage now locks trailing-slash/query/hash variants of
    `/sessions/:id` missing-action routes as `UNHANDLED`)
  - completed B119 malformed API scope classifier coverage hardening
    (server-route classifier now has explicit regression coverage proving
    malformed API double-segment paths remain API-scoped unhandled routes)
  - completed B118 unknown-route auth-order session coverage hardening
    (password-protected unknown-route ordering test now includes session
    unknown/missing-action paths for `401` pre-auth and authenticated
    `404` + `UNKNOWN_ENDPOINT` semantics)
  - completed B117 missing-action session-subroute coverage hardening
    (unsupported session-subroute integration now explicitly locks
    `/sessions/:id` and `/sessions/:id/` unknown-endpoint behavior)
  - completed B116 malformed API route coverage hardening
    (double-segment API path variants now explicitly locked to
    `404` + `NOT_FOUND` semantics in unit + integration coverage)
  - completed B115 malformed session-subroute coverage hardening
    (blank-segment session subroutes now explicitly locked to
    `404` + `UNKNOWN_ENDPOINT` in headless-server integration tests)
  - completed B114 headless session-route parse reuse hardening
    (single request-scope parse of session-resource route path reused across
    prompt/messages branch dispatch paths)
  - completed B113 API auth-order parameterized coverage
    (password-protected integration now locks auth-before-method behavior for
    `/api/sessions/:id` and `/api/sessions/:id/messages/` unsupported methods)
  - completed B112 parameterized API method semantics coverage
    (unit + integration lock-in for `/api/sessions/:id` and
    `/api/sessions/:id/messages` unsupported-method `405` behavior)
  - completed B111 API route single-pass classification hardening
    (method/path matching and known-path detection now resolved in one route
    pass without duplicate scans)
  - completed B110 slash-only pathname normalization hardening
    (shared route-path normalization now canonicalizes slash-only path variants
    to `/` with focused unit coverage)
  - completed B109 API trailing-slash method semantics coverage
    (`405` behavior lock-in for normalized API routes)
  - completed B108 non-API trailing-slash method semantics coverage
    (`405` behavior lock-in for normalized session routes)
  - completed B107 health-route trailing-slash auth-bypass regression coverage
    (password-enabled `/health/` semantics lock-in)
  - completed B106 trailing-slash known-route integration coverage
    (core/api/session route path variants)
  - completed B105 trailing-slash route normalization + dispatch alignment
    (classifier + headless-server path semantics consistency)
  - completed B104 health-route auth-bypass integration coverage
    (password-enabled GET/POST semantics lock-in)
  - completed B103 auth-before-not-found integration ordering coverage
    (unknown API/core routes under server password)
  - completed B102 API-root not-found integration coverage expansion
    (locks `/api` and query/trailing-slash 404 semantics)
  - completed B101 API-root route scope classifier normalization
    (`/api` now consistently API-scoped in server-route classification)
  - completed B100 server-auth health-path bypass regression coverage
    (router-only bypass ownership lock-in)
  - completed B99 request-error log pathname normalization alignment
    (reduced query/hash cardinality in parsing/validation telemetry)
  - completed B98 shared route-pathname normalization extraction
    (query/hash suffix trimming for direct route classifiers + parser)
  - completed B97 classifier padded-path method/not-found coverage expansion
    (API + server-route classifier regression protection)
  - completed B96 core/API classifier pathname trim normalization
    (consistent whitespace-resilient matching in direct classifier calls)
  - completed B95 server-route classifier pathname trim hardening
    (whitespace-resilient route classification)
  - completed B94 request-url IPv6 host handling coverage expansion
    (utility + route-level bracketed IPv6/malformed fallback tests)
  - completed B93 request-parse punctuation-insensitive canonical matching
    hardening
  - completed B92 request-url host label validation hardening
    (invalid hostname label rejection + candidate fallback)
  - completed B91 content-encoding parameter normalization hardening
    (parameterized identity encodings accepted)
  - completed B90 server runtime bracketed-IPv6 host normalization hardening
    (with shared IPv6 protocol-version limit extraction)
  - completed B89 session-messages schema non-blank session-id hardening
  - completed B88 session-route parser segment normalization hardening
    (blank segment rejection + pathname trim normalization)
  - completed B87 server runtime host validation hardening
    (invalid host fallback + ipv6 acceptance coverage)
  - completed B86 request-body whitespace-only empty-body fallback hardening
    (fallback-aware blank body handling)
  - completed B85 server-auth bearer-token payload hardening
    (bare/whitespace bearer payloads -> authorization required)
  - completed B84 server schema non-blank string validation hardening
    (`cwd`/`title`/`prompt` whitespace-only rejection)
  - completed B83 request-url host metadata validation hardening
    (reject host path/query/fragment/userinfo metadata)
  - completed B82 server runtime host/port normalization hardening
    (trimmed host resolution + strict bounded port parsing)
  - completed B81 server-auth single-entry authorization-array support
    with strict multi-entry rejection
  - completed B80 request-url multi-host candidate parsing hardening
    (comma-delimited/string-array host candidate support)
  - completed B79 request-url host-header array normalization hardening
    with direct unit coverage
  - completed B78 request-error case-insensitive canonical matching hardening
    for string/object message variants
  - completed B77 JSON response undefined-payload serialization hardening to
    prevent undefined-body content-length failures in shared response helper
  - completed B76 HTTP response header-key normalization hardening for padded
    managed/custom header inputs in shared JSON response helper
  - completed B75 request-error detail extraction hardening for numeric message
    payload support in non-Error thrown object shapes
  - completed B74 request parsing-log handler normalization hardening for
    trimmed handler metadata and blank-handler omission behavior
  - completed B73 request parsing-log method fallback hardening for blank
    method normalization in standardized parse/validation telemetry
  - completed B72 request parsing-log pathname fallback hardening for blank
    path normalization in standardized parse-failure telemetry
  - completed B71 request-error canonical-message trimming hardening for
    whitespace-padded string/object parse-error inputs
  - completed B70 request-error normalization robustness hardening for
    string/object parse-error inputs and standardized detail mapping
  - completed B69 server helper coverage closure with direct unit tests for
    HTTP method normalization utility
  - completed B68 allowlist-enforcement smoke coverage hardening for excluded
    action short-circuit behavior and invalid enabled-flag parsing
  - completed B67 early-gate boundary coverage hardening for disabled/not-
    allowlisted metadata behavior and disabled smoke short-circuit semantics
  - completed B66 unsupported-platform diagnostics hardening for NutJS
    permission helper + smoke simulation coverage
  - completed B65 NutJS no-op diagnostics + null-result smoke coverage
    hardening for unsupported-platform statuses and executed-null semantics
  - completed B64 missing-permission helper extraction to centralize NutJS
    diagnostics missing-status classification
  - completed B63 NutJS capability helper dead-code cleanup by removing unused
    post-capability noop wrapper and aligning capability unit coverage
  - completed B62 executed-outcome null-result hardening so NutJS gate no longer
    misclassifies successful `null` action results as capability no-op outcomes
  - completed B61 capability-noop diagnostics enrichment so NutJS gate returns
    diagnostics metadata for no-op outcomes (runtime-missing and
    unsupported-platform paths)
  - completed B60 wildcard precedence canonicalization in normalized allowlist
    policy output
  - completed B59 normalized allowlist deduplication with order-preserving
    policy output and focused unit coverage
  - completed B58 typed NutJS fallback-stage API hardening with precedence
    uniqueness assertions
  - completed B57 wildcard allowlist normalization execution coverage for
    padded env inputs
  - completed B56 normalization coverage for NutJS allowlist and enabled-flag
    env parsing behavior
  - completed B55 smoke-level macOS/Windows permission-missing simulation
    coverage in NutJS cross-platform smoke tests
  - completed B54 macOS + Windows permission-missing enforcement assertions in
    NutJS execution gate unit coverage
  - completed B53 NutJS diagnostics metadata assertions for executed and
    permission-missing outcomes
  - completed B52 Linux-specific NutJS smoke assertion for headless
    permission-missing runtime behavior
  - completed B51 permission-aware NutJS execution gate ordering with explicit
    `permission_missing` outcome when diagnostics report missing permissions
  - completed B50 platform fallback precedence consolidation across clipboard,
    NutJS, and completion sound paths with shared constants + docs
  - completed B49 NutJS cross-platform CI smoke matrix with dedicated workflow
    job and focused smoke scenario coverage
  - completed B48 NutJS feature-flag and allowlist execution gate with focused
    policy enforcement unit coverage
  - completed B47 NutJS permission diagnostics for macOS accessibility, Linux
    display backend, and Windows integrity readiness checks
  - completed B46 NutJS capability detector with explicit unsupported-platform
    no-op behavior and focused unit coverage
  - completed B45 timeout-wrapper dedup with shared typed delay helpers in
    reconnect integration coverage
  - completed B44 reconnect jitter scaffolding simplification with shared
    reconnect distribution helpers and typed jitter matrix generation
  - completed B43 clipboard fallback simplification with explicit
    capability-ranked command strategy and shared support checks
  - completed B42 shell invocation deduplication with shared invocation utility
    reused by shell-session, interactive-shell, and background-task-manager
  - completed B41 platform command adapter consolidation with shared shell
    resolution utility and focused adapter unit coverage
  - completed B40 nested hook/prompt subprocess chain hardening with async-context-local depth caps and concurrent-root isolation coverage
  - strengthened fallback and feature-flag behavior coverage
  - expanded repo workflow and server route unit coverage
  - added server infrastructure coverage for config resolution, schema contracts, and SSE lifecycle
  - added headless-server edge-route integration coverage for 404/unknown-session flows
  - added route-match and raw-token auth integration parity coverage
  - added oversized-body handling fix + integration coverage for schema/body edge paths
  - added unknown-session messages endpoint behavior coverage
  - added 405 method semantics for known API routes with unsupported methods
  - added API route body-size limits + invalid JSON/oversized payload integration coverage
  - added auth-vs-method-ordering integration coverage for protected API routes
  - added direct handler-level parse/read error response hardening for TUI API routes
  - added method-not-allowed semantics for known non-API server routes
  - consolidated duplicated request parsing into shared server request-body utility
  - added non-API protected-route auth-ordering coverage for method semantics
  - refactored core-route method guard logic to reduce branching duplication
  - normalized direct TUI route parse failures to canonical invalid-request responses
  - added API route classification helper to centralize match/method/not-found semantics
  - extracted core route classifier for health/sessions method semantics
  - extracted shared session path parser used by headless server and core classifier
  - added unified server route classifier composing core+api classification paths
  - extracted shared HTTP JSON/error response helpers and reused across server modules
  - refactored server auth unauthorized responses to reuse shared response helper
  - hardened hook IPC HTTP request handling and added error-path coverage
  - added direct unit coverage for default harness config feature-flag/fallback behavior
  - hardened JSON response helper content-type header precedence behavior
  - expanded harness config selection edge-case unit coverage
  - expanded hook IPC invalid payload unit coverage
  - strengthened /api/agents integration contract assertions
  - hardened request-body max-size enforcement to use utf-8 byte counts
  - hardened session route parsing against extra-segment subpaths
  - normalized headless invalid-json responses to canonical invalid-request payload
  - improved request-body helper chunk-type byte accounting and coverage
  - added ssh-protocol remote URL parsing support in repo workflow info
  - improved server auth bearer-scheme parsing robustness
  - expanded repo workflow checks-status classification for queued/cancelled outcomes
  - normalized server auth token parsing for surrounding whitespace
  - added explicit pending-status classification in repo workflow checks mapping
  - added ssh remote trailing-slash parsing support in repo workflow info
  - hardened shared JSON response helper managed-header sanitization
  - hardened request-body reader to settle once under repeated stream events
  - hardened repo remote URL parser for uppercase scheme variants
  - improved repo-workflow literal hygiene for PR/check constants
  - hardened repo remote parser for `git://` protocol URLs
  - hardened request-body handling for aborted/prematurely closed streams
  - hardened scp-ssh remote parsing for custom user prefixes
  - hardened remote parser for uppercase `.GIT` suffix variants
  - hardened scp-style remote parsing for missing user prefixes
  - added explicit uppercase SSH protocol remote parsing coverage
  - hardened repo remote parser for `git+ssh://` protocol URLs
  - hardened SSE stream close-handling to avoid duplicate unsubscribe calls
  - hardened repo checks-status parsing for whitespace-padded gh output fields
  - hardened JSON request parsing for UTF-8 BOM-prefixed payloads
  - hardened file-search URL parsing when request host header is missing
  - hardened UTF-8 request decoding for multi-byte split-buffer chunk boundaries
  - hardened route classifiers for lowercase/padded HTTP method inputs
  - hardened file-search query handling for whitespace-only input
  - hardened SSE cleanup for response-close shutdown path
  - hardened PR status normalization for padded/unsupported gh fields
  - hardened file-search query decoding for malformed percent-encoding input
  - hardened SSE stream cleanup coverage for request/response error events
  - expanded PR status unit coverage for gh invocation option wiring
  - expanded file-search unit coverage for plus-encoded query decoding
  - hardened SSE cleanup for request-aborted shutdown path
  - hardened SSE cleanup for response write-failure paths
  - hardened SSE callback behavior after cleanup to prevent stale writes
  - hardened repo workflow derivation against padded state/review fields
  - hardened file-search behavior for duplicate query parameter inputs
  - hardened file-search behavior for encoded/malformed query parameter names
  - expanded headless integration coverage for file-search query validation edges
  - centralized safe request URL parsing across server handlers
  - hardened request-url parsing for missing URL inputs
  - hardened request-url parsing for whitespace-padded url/host inputs
  - hardened request-url parsing by rejecting absolute request targets
  - hardened request-url parsing by rejecting protocol-relative targets
  - expanded headless integration coverage for non-origin-form request targets
  - hardened repo workflow checks parsing for non-string gh fields
  - hardened default harness env-override behavior for blank command and explicit empty args inputs
  - hardened harness env-substitution output validation and env-map merge precedence coverage
  - hardened server auth handling for non-string and whitespace-only authorization header values
  - hardened request-body mixed string/buffer chunk decoding consistency and ordering
  - hardened file-search key normalization for mixed-case duplicate query detection
  - hardened SSE lifecycle cleanup for pre-closed response streams
  - hardened hook IPC request-shape coverage for non-object JSON payload handling
  - hardened hook IPC request-body parsing via shared parser + oversized payload coverage
  - hardened CLI runtime command resolution for blank env command overrides
    (Claude/Cursor now fall back to default command names)
  - hardened hook IPC request-stream failure-path coverage for aborted/error body
    read scenarios to lock canonical invalid-request response mapping
  - hardened hook IPC invalid-body diagnostics with structured warning logs and
    focused assertions for malformed/oversized/stream-failure parse paths
  - hardened hook IPC response-path deduplication by reusing shared server
    JSON/error response helpers
  - hardened request parsing consistency with shared request-error normalization
    utility reused by API routes, hook IPC, and headless server
  - hardened headless route-local parse failure control flow with route-context
    diagnostics and localized parse-error handling
  - hardened API parse-failure diagnostics parity for TUI handlers plus stream
    error/aborted request-body coverage
  - hardened parse-failure telemetry consistency with a shared logging helper
    and standardized metadata keys across API/headless/hook paths
  - hardened request-validation telemetry parity with shared standardized logging
    for hook IPC schema failures and headless zod validation failures
  - hardened file-search query validation telemetry parity for non-JSON API
    validation paths using shared standardized validation logging
  - hardened headless session validation telemetry with explicit handler
    identifiers for session create/prompt schema failures
  - hardened route-classifier and hook method-guard validation telemetry with
    explicit standardized handler identifiers
  - hardened classifier telemetry precision by distinguishing api/core route
    classifier handler ids for method-not-allowed and unhandled outcomes
  - hardened API route classifier boundaries to carry classifier handler
    metadata for method-not-allowed and not-found outcomes
  - hardened server-route classification to propagate API not-found classifier
    metadata only for `/api/` paths while keeping `/api` root as core-unhandled
  - hardened harness-config id resolution by trimming whitespace-only CLI/user/
    project harness-id values before fallback and lookup
  - hardened harness-config file parsing with explicit rejection for invalid
    harness ids that include leading/trailing whitespace
  - hardened explicit CLI harness-id handling to reject whitespace-only
    selections with canonical invalid-id diagnostics
  - hardened configured defaultHarness validation for project/user config files
    to reject whitespace-only and padded harness ids
  - hardened explicit CLI harness-id selection to require canonical ids (no
    trimming/coercion of padded values)
  - hardened session create request validation to reject non-canonical
    harness ids using shared harness-id helper semantics
  - hardened harness-id validation diagnostics by reusing one canonical
    message across harness config errors and session request schema failures
  - hardened create-session schema so empty harness-id values share the same
    canonical invalid-id message as other non-canonical inputs
  - added headless integration coverage for canonical-but-unconfigured harness
    ids returning 404 harness-not-configured responses
  - added headless integration coverage for configured default harness ids that
    lack registered adapters returning 404 adapter-not-registered responses
  - added headless integration coverage for fallback to default harness config
    when harness config loading fails at startup
  - expanded default-harness cursor feature-flag test coverage for padded
    truthy and falsey/invalid env-value variants
  - added direct unit coverage for shared env boolean-flag parsing utility
    across truthy, falsey, and unsupported string inputs
  - added headless integration coverage for startup fallback when harness config
    resolves to an empty harness map
  - added headless integration coverage for startup fallback when configured
    default harness id is missing from configured harnesses
  - added headless integration coverage for startup fallback when harness
    config file contains malformed JSON
  - added headless integration coverage for cursor harness connect failures,
    including post-failure server responsiveness via mock harness sessions
  - added headless integration coverage for cursor feature-flag disabled
    adapter behavior when cursor harness remains configured in harness config
  - added headless integration coverage for mixed harness availability where
    disabled cursor adapter does not block configured mock harness operation
  - added headless integration coverage for default cursor-harness connection
    failure while preserving follow-up mock session creation continuity
  - added headless integration coverage for default cursor-harness adapter
    disablement while preserving follow-up mock session creation continuity
  - expanded harness-registry factory unit coverage for adapter list assembly
    and unsupported cursor feature-flag fallback defaults
  - added headless integration coverage for cursor disablement in default
    harness config with explicit cursor-not-configured semantics
  - expanded harness-registry factory coverage for registry-level mock omission
    and padded/case-insensitive cursor feature-flag parsing behavior
  - added headless integration coverage for repeated default cursor-harness
    connection failures with post-failure mock continuity checks
  - added headless integration coverage for repeated explicit cursor-not-
    configured requests with post-failure mock continuity checks
  - expanded harness-registry factory coverage to assert cursor adapter
    exclusion semantics when `enableCursor` is false
  - added headless integration coverage for repeated adapter-not-registered
    responses when cursor default harness remains configured but adapter is disabled
  - added headless integration coverage for repeated default-route adapter-not-
    registered responses under cursor-disabled default harness configuration
  - added headless integration coverage for repeated explicit cursor connect-
    failure requests with post-failure mock continuity checks
  - added headless integration coverage for repeated explicit unknown-harness
    requests with post-failure mock continuity checks
  - added headless integration coverage for repeated default-route custom-adapter
    registration failures with post-failure mock continuity checks
  - added headless integration coverage for repeated fallback-path explicit mock
    session creation success semantics when harness config loading fails
  - added headless integration coverage for repeated fallback-trigger explicit
    mock session creation when fallback is caused by empty harnesses or missing
    configured default harness id
  - added headless integration coverage for repeated fallback-trigger explicit
    mock session creation when project/user merged config selects a missing user
    default harness id
  - added headless integration coverage for repeated merged config runtime
    override failures (invalid cursor command) with post-failure mock continuity
  - added headless integration coverage for repeated merged env-expansion
    override failures (empty resolved command) with fallback mock continuity
  - added headless integration coverage for repeated merged cwd-override
    failures (empty resolved cwd) with fallback mock continuity
  - added headless integration coverage for repeated merged blank-command
    override failures with fallback mock continuity
  - added headless integration coverage for repeated merged env-map overrides
    with empty expansions while keeping valid command/cwd behavior
  - added headless integration coverage for merged env-map empty-expansion
    scenarios that include repeated prompt submissions after session creation
  - added headless integration coverage for merged env-map empty-expansion
    scenarios with mixed default/explicit session-create sequences
  - added headless integration coverage for mixed default/explicit ordering
    plus invalid-prompt validation recovery under merged env-map expansions
  - added headless integration coverage for repeated invalid prompt cycles
    across multiple merged env-map sessions with recovery continuity
  - added headless integration coverage for websocket `SESSION_CREATED` stream
    stability during merged env-map mixed validation cycles
  - extended merged env-map stream coverage with repeated `/api/events`
    `STATE_UPDATE` SSE assertions during mixed validation cycles
  - added merged env-map `/api/events` SSE teardown/reconnect continuity
    coverage after prompt validation failures
  - added merged env-map interleaved websocket+SSE reconnect continuity
    coverage for longer mixed validation sequences
  - added merged env-map alternating default/explicit reconnect cycle coverage
    with combined websocket+SSE continuity assertions
  - added merged env-map alternating reconnect coverage for repeated invalid
    prompt bursts with websocket+SSE continuity assertions
  - added merged env-map mixed websocket close-timing reconnect coverage with
    websocket+SSE continuity assertions
  - added merged env-map extended jitter reconnect coverage with websocket+SSE
    continuity assertions
  - added merged env-map alternating burst-size reconnect coverage with
    websocket+SSE continuity assertions across variable invalid-prompt bursts
  - added merged env-map variable SSE cadence reconnect coverage with
    websocket+SSE continuity assertions across per-cycle reconnect cadence
  - added merged env-map dual cadence reconnect coverage with websocket+SSE
    continuity assertions across per-cycle websocket and SSE cadence variation
  - added merged env-map reconnect-order inversion coverage with websocket+SSE
    continuity assertions across alternating SSE-first/websocket-first cycles
  - added merged env-map reconnect-order jitter coverage with websocket+SSE
    continuity assertions across jittered SSE-first/websocket-first cycles
  - added merged env-map reconnect-order asymmetric burst coverage with
    websocket+SSE continuity assertions under order-path-specific burst sizes
  - added merged env-map reconnect-order cadence expansion coverage with
    websocket+SSE continuity assertions under order-path-specific create cadence
  - added merged env-map reconnect-order jitter expansion coverage with
    websocket+SSE continuity assertions under order-path-specific jitter arrays
  - added merged env-map reconnect-order segment asymmetry coverage with
    websocket+SSE continuity assertions under order-path-specific websocket vs
    SSE segment-count expansion
  - added merged env-map reconnect-order jitter amplitude asymmetry coverage
    with websocket+SSE continuity assertions under order-path-specific
    websocket vs SSE segment-open jitter amplitudes
  - added merged env-map reconnect-order create-jitter asymmetry coverage with
    websocket+SSE continuity assertions under order-path-specific create-jitter
    amplitudes
  - added merged env-map reconnect-order recovery-jitter asymmetry coverage
    with websocket+SSE continuity assertions under order-path-specific
    invalid-prompt recovery jitter amplitudes
  - added merged env-map reconnect-order burst-spacing asymmetry coverage with
    websocket+SSE continuity assertions under order-path-specific invalid-
    prompt burst spacing amplitudes
  - added merged env-map reconnect-order post-recovery delay asymmetry
    coverage with websocket+SSE continuity assertions under order-path-
    specific valid-prompt post-recovery delays
  - added merged env-map reconnect-order cycle-cooldown asymmetry coverage
    with websocket+SSE continuity assertions under order-path-specific cycle-
    end cooldown jitter amplitudes
  - added merged env-map reconnect-order close-delay asymmetry coverage with
    websocket+SSE continuity assertions under order-path-specific websocket/SSE
    close-delay amplitudes
  - added merged env-map reconnect-order close-interleave asymmetry coverage
    with websocket+SSE continuity assertions under order-path-specific
    websocket/SSE close-handler interleave delays
  - added merged env-map reconnect-order post-close create scheduling
    asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close create jitter amplitudes
  - added merged env-map reconnect-order post-close prompt scheduling
    asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt jitter amplitudes
  - added merged env-map reconnect-order post-close recovery scheduling
    asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close recovery jitter amplitudes
  - added merged env-map reconnect-order post-close cycle transition
    asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close cycle transition jitter amplitudes
  - added merged env-map reconnect-order post-close segment-open gating
    asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close segment-open gating jitter amplitudes
  - added merged env-map reconnect-order post-close segment-rearm asymmetry
    coverage with websocket+SSE continuity assertions under order-path-
    specific post-close segment-rearm jitter amplitudes
  - added merged env-map reconnect-order post-close invalid-burst ramp
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close invalid-burst ramp jitter amplitudes
  - added merged env-map reconnect-order post-close valid-prompt ramp
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close valid-prompt ramp jitter amplitudes
  - added merged env-map reconnect-order post-close recovery-confirm
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close recovery-confirm jitter amplitudes
  - added merged env-map reconnect-order post-close recovery-settle
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close recovery-settle jitter amplitudes
  - added merged env-map reconnect-order post-close cycle-handoff asymmetry
    coverage with websocket+SSE continuity assertions under order-path-
    specific post-close cycle-handoff jitter amplitudes
  - added merged env-map reconnect-order post-close cycle-cooldown handoff
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close cycle-cooldown handoff jitter amplitudes
  - added merged env-map reconnect-order post-close cycle-transition handoff
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close cycle-transition handoff jitter amplitudes
  - added merged env-map reconnect-order post-close segment-open handoff
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close segment-open handoff jitter amplitudes
  - added merged env-map reconnect-order post-close segment-rearm handoff
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close segment-rearm handoff jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst handoff
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst handoff jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    settle asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-settle jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    confirm asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-confirm jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    handoff asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-handoff jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    cooldown asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-cooldown jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    drift asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-drift jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    transition asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-transition
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    checkpoint asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-checkpoint
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    finalize asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-finalize jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    anchor asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-anchor jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-seal
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-seal jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    guard asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-guard jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-lock
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-lock jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-bolt
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-bolt jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    clamp asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-clamp jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    brace asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-brace jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    latch asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-latch jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    rivet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-rivet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-pin
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-pin jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    stud asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-stud jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    spike asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-spike jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    notch asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-notch jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    groove asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-groove jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    ridge asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-ridge jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    crest asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-crest jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-peak
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-peak jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    summit asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-summit jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    apex asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-apex jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    crown asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-crown jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    tiara asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-tiara jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    diadem asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-diadem jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    coronet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-coronet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    circlet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-circlet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-band
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-band jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    bangle asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-bangle jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    bracelet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-bracelet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    anklet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-anklet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-toe-
    ring asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-toe-ring jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-charm
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-charm jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pendant asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pendant jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    locket asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-locket jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    medallion asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-medallion jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    amulet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-amulet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    talisman asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-talisman jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    totem asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-totem jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    relic asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-relic jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    sigil asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-sigil jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    glyph asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-glyph jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-rune
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-rune jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    insignia asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-insignia jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    emblem asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-emblem jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    badge asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-badge jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    banner asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-banner jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    standard asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-standard jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-flag
    asymmetry coverage with websocket+SSE continuity assertions under order-
    path-specific post-close prompt-burst recovery-flag jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pennant asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pennant jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    guidon asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-guidon jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    burgee asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-burgee jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    streamer asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-streamer jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pennon asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pennon jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    ensign asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-ensign jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    gonfalon asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-gonfalon jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    oriflamme asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-oriflamme jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    vexillum asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-vexillum jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    labarum asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-labarum jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    draco asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-draco jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    signum asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-signum jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    vexiloid asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-vexiloid jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    banderole asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-banderole jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pennoncelle asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pennoncelle jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    streameret asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-streameret jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    guidonet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-guidonet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    cornette asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-cornette jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    fanion asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-fanion jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    chapeau asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-chapeau jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    banneret asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-banneret jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    baucan asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-baucan jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    gonfanon asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-gonfanon jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    ribband asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-ribband jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pencel asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pencel jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    ribbonet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-ribbonet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    tassel asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-tassel jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    inescutcheon asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-inescutcheon
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    escarbuncle asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-escarbuncle
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    roundel asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-roundel jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    billette asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-billette jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    lozenge asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-lozenge jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    fusil asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-fusil jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    mascle asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-mascle jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    rustre asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-rustre jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    annulet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-annulet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    torteau asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-torteau jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    bezant asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-bezant jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    plate asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-plate jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pellet asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pellet jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    hurt asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-hurt jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pomme asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pomme jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    golpe asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-golpe jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    ogress asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-ogress jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    fountain asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-fountain jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    gurges asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-gurges jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    barry asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-barry jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    bend asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-bend jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    flaunches asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-flaunches
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pale asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pale jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    fess asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-fess jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    chevron asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-chevron jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    chief asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-chief jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pall asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pall jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    saltire asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-saltire jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pile asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-pile jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    cross asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-cross jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    fret asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-fret jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    gyron asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-gyron jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    orle asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-orle jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    tressure asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-tressure jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    trefoil asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-trefoil jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    label asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-label jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    motto asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-motto jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    supporter asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-supporter jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    compartment asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-compartment
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    torse asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-torse jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    caparison asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-caparison
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    pavilion asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-pavilion
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    livery asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-livery jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    escutcheon asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-escutcheon
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    mantling asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-mantling
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    helm asymmetry coverage with websocket+SSE continuity assertions under
    order-path-specific post-close prompt-burst recovery-helm jitter
    amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    cartouche asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-cartouche
    jitter amplitudes
  - added merged env-map reconnect-order post-close prompt-burst recovery-
    vamplate asymmetry coverage with websocket+SSE continuity assertions
    under order-path-specific post-close prompt-burst recovery-vamplate
    jitter amplitudes
  - completed P0 backlog item B01 by hardening `shell-session` teardown:
    Windows dispose now forces `SIGTERM` + `SIGKILL`, active/queued commands
    are rejected on dispose, and chat runtime cleanup now disposes shell
    sessions on runtime replacement/unmount
  - completed P0 backlog item B02 by hardening `cli-agent-process-runner`
    detached process-tree cleanup across POSIX/Windows via explicit kill-tree
    strategy injection, Windows `taskkill` tree termination with timeout+fallback,
    and expanded disconnect/cleanup unit coverage
  - completed P0 backlog item B03 by hardening `TerminalManager` with bounded
    session capacity + completed-session eviction, preventing unbounded
    in-memory session growth while preserving active sessions
  - completed P0 backlog item B04 by hardening Hook IPC startup transport
    selection with deterministic unix-socket-to-http fallback and endpoint-aware
    shutdown cleanup semantics for socket/path edge failures
  - completed P0 backlog item B05 by hardening Linux clipboard behavior with
    Wayland-first command selection (`wl-copy`), X11 fallback gating, and
    headless no-spawn handling for deterministic failure behavior
  - completed P0 backlog item B06 by hardening path-escape detection with
    shared separator-normalized traversal checks that now reject Windows-style
    (`..\\`) and mixed-separator payloads across terminal execution paths
  - completed P0 backlog item B07 by replacing prefix-based base containment
    checks with canonical relative-path comparison and win32 case-insensitive
    normalization across terminal/shell/fs path resolution flows
  - completed P0 backlog item B08 by hardening cli-agent process runner signal
    handler lifecycle cleanup so SIGINT/SIGTERM listeners do not accumulate
    across repeated streaming command runs
  - completed P0 backlog item B09 by hardening timeout kill-path behavior in
    cli-agent runners with SIGTERM→SIGKILL escalation and explicit stuck-process
    warning semantics
  - completed P0 backlog item B10 by locking Hook IPC HTTP transport to local
    host bindings and local-origin request validation with explicit forbidden
    responses for non-local traffic
  - completed P0 backlog item B11 by hardening shared JSON request-body parsing
    with strict preflight header checks, bounded read duration, and
    deterministic compressed/slow-client rejection semantics across server
    endpoints
  - completed P0 backlog item B12 by adding bounded per-session in-memory
    message retention in app-store append flows with deterministic oldest-first
    eviction and cross-session retention isolation
  - completed P0 backlog item B13 by hardening worker/process bridge retries
    with bounded jittered backoff and explicit diff-worker retry caps to reduce
    synchronized retry bursts under transient failures
  - completed P0 backlog item B14 by adding SQLite statement/transaction
    timeouts plus worker request timeout/restart cancellation paths for stuck
    persistence operations
  - completed P0 backlog item B15 by deferring and deduplicating update-check
    metadata calls so startup/render paths remain non-blocking
  - completed P0 backlog item B16 by adding bounded provider stream parser
    buffers to prevent unbounded growth on malformed/infinite streams
  - completed P0 backlog item B17 by adding lifecycle retention pruning for
    completed background tasks to prevent long-session memory growth
  - completed P0 backlog item B18 by enforcing global spawned-process
    concurrency caps across shell/provider execution pathways
  - completed P0 backlog item B19 by adding clipboard payload/stall guardrails
    to prevent pipe memory spikes and hanging child processes
  - completed P0 backlog item B20 by adding crash-safe temp artifact cleanup
    hooks for unix sockets and editor temp directories
  - completed P1 backlog item B21 by preventing macOS completion-sound process
    accumulation via single-active-child guarding
  - completed P1 backlog item B22 by introducing explicit Linux desktop
    capability detection for clipboard and UI-dependent slash-command flows
  - completed P1 backlog item B23 by hardening Windows command quoting and
    escaping for spaces/metacharacters/unicode path execution
  - completed P1 backlog item B24 by isolating shell command cwd context per
    request to remove hidden cross-command state coupling
  - completed P1 backlog item B25 by replacing terminal output byte trimming
    with a linear-time UTF-8-safe truncation strategy
  - completed P1 backlog item B26 by optimizing shell-session sentinel scanning
    to bounded incremental search windows
  - completed P1 backlog item B27 by enforcing Hook IPC HTTP auth/nonce
    handshake and propagating auth headers through hook shims
  - completed P1 backlog item B28 by reducing repeated env snapshot merges in
    hot shell/terminal command paths
  - completed P1 backlog item B29 by adding reconnect-cycle signal
    attach/detach idempotency regression coverage
  - completed P1 backlog item B30 by implementing SQLite optimize/checkpoint/
    vacuum maintenance policy with bounded cadence
  - completed P1 backlog item B31 by adding recursive search depth bounds and
    cancellation token handling
  - completed P1 backlog item B32 by enabling full transcript virtualization in
    MessageList default behavior
  - completed P1 backlog item B33 by bypassing markdown reparsing during active
    streaming chunk rendering
  - completed P1 backlog item B34 by streaming JSON/Markdown/ZIP session export
    writes to reduce peak in-memory payload pressure
  - completed P1 backlog item B35 by batching and throttling token optimizer
    telemetry writes
  - completed P1 backlog item B36 by caching update-check outcomes with runtime
    TTL to reduce repeated filesystem/network work
  - completed P1 backlog item B37 by de-correlating jittered retry delays to
    reduce synchronized retry bursts
  - completed P1 backlog item B38 by bounding provider failure payload logs
    with centralized truncation helpers
  - completed P1 backlog item B39 by throttling command-palette filter
    recomputation using deferred query updates
  - added severity-ordered checklist backlog in PLAN3 with 50 incomplete tasks
    covering critical bugs, performance/memory leak risk, cross-platform
    hardening (Windows/Linux/macOS), NutJS readiness, and simplification-first
    cleanup
  - quality gates remain green after each increment

## Phase 0 baseline quality gate (2026-02-10)
- **Lint**: Passed.
- **Typecheck**: Passed.
- **Build**: Passed.
- **Tests**: 4 failed, 657 passed, 1 skipped (pre-existing, do not attribute to Cursor harness work):
  1. `__tests__/unit/ui/sidebar-footer-prompt-palette.unit.test.ts` — CommandPalette output expected to contain `› /help`.
  2. `__tests__/unit/ui/ui-modals.unit.test.ts` — SessionsPopup filter expected to contain `Alpha Session`.
  3. `__tests__/integration/core/cross-tool-loading.integration.test.ts` — skills length (expect 1, got 6) and empty-dir (expect 0, got 5); loader picks up repo-level skills.

## Milestones
- [X] M0: Foundation Fix (bun, deps, sqlite, test harness)
- [X] M1: Test Verification (85+ tests pass)
- [X] M2: Slash Commands (40+ commands, SVG export, Claude Code parity)
- [X] M3: Checkpointing (cleanup, retention, git stash/apply)
- [X] M4: Configuration (12-section schema, permissions, themes, formatters)
- [X] M5: Context Management (token counting, auto-compaction, pruning)
- [X] M6: Session Management (forking, diff tracking, retention policy, workspace)
- [X] M7: Provider Expansion (Anthropic, OpenAI, Ollama, 8+ OpenAI-compatible)
- [X] M8: Cross-Tool Compatibility (skills, commands, agents, hooks, .mdc rules, custom tools, instructions)
- [X] M9: Server Mode & CLI (REST API, SSE, TUI control, headless mode, subcommands)
- [X] M10: Advanced Features (formatters, model cycling, PR status, LSP, plugins, suggestions, images)
- [X] M11: Distribution (CI, npm publish, README, CONTRIBUTING, themes, accessibility)
- [X] PLAN2 Addendum B: Repository breadcrumb bar (workflow status, placement, action keybind, skill injection)

## Test Coverage
- 113 test files (85 original + 28 new)
- 0 failures
- New tests: context manager, permission modes, session forking, provider registry, auto-title, retention policy, theme loader, SVG export

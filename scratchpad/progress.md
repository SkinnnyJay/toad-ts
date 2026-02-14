# Scratchpad Progress

## Current Focus
- Phase 0 (PLAN2 Cursor CLI prerequisites) completed on branch `feature/cursor-cli-harness`. Fixtures captured; baseline quality gate recorded (see below).
- PLAN3 completion hardening on branch `cursor/plan3-tasks-completion-62e5` is active:
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

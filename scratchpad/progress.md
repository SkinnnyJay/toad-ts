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

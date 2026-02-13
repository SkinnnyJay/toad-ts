# Scratchpad Journal

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

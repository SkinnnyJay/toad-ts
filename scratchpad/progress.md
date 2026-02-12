# Scratchpad Progress

## Current Focus
- PLAN2 Cursor CLI Harness (M2a–M11) **COMPLETE** on branch `cursor/project-plan-3-completion-9635`. 173 tests, build passes, lint clean.

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
- [X] PLAN2 M2a: Zod types & stream event schemas (constants, types, 52 unit tests)
- [X] PLAN2 M2: Cursor stream parser (NDJSON parser, backpressure, size limits, 19 tests)
- [X] PLAN2 M3: Cursor CLI connection (process lifecycle, resume, auth, models, 21 tests)
- [X] PLAN2 M4: Protocol translator (NDJSON→AgentPort, tool discrimination, truncation, 18 tests)
- [X] PLAN2 M5: Hook IPC server (Unix socket, permission flow, context injection, 14 tests)
- [X] PLAN2 M6: Hooks config generator + shim script (hooks.json, merge, cleanup, 13 tests)
- [X] PLAN2 M7: Cursor CLI harness adapter (AgentPort impl, Ch1+Ch2, 16 tests)
- [X] PLAN2 M8: Harness registration (App.tsx, headless-server, env keys, .env.sample)
- [X] PLAN2 M10: Integration tests (15 tests: pipeline, hooks, multi-turn, errors)
- [X] PLAN2 M11: TUI integration + quality gate (build, typecheck, lint, tests all pass)

## Test Coverage
- 113 test files (85 original + 28 new)
- 0 failures
- New tests: context manager, permission modes, session forking, provider registry, auto-title, retention policy, theme loader, SVG export

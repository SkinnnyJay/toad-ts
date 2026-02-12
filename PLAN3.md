# PLAN3: Incomplete Tasks (PLAN2 + Magic Literals)

> **Carryover checklist: incomplete tasks from PLAN2 (Cursor CLI Harness) and from [MAGIC_LITERALS_TASKS.md](MAGIC_LITERALS_TASKS.md).**

**Sources**: [PLAN2.md](PLAN2.md) — Cursor CLI Harness Integration · [MAGIC_LITERALS_TASKS.md](MAGIC_LITERALS_TASKS.md) — Magic Literals remediation  
**Created**: 2026-02-12  
**Status**: In Progress  
**Last Updated**: 2026-02-12  

---

## Table of Contents

1. [Phase 0: Prerequisites](#phase-0-prerequisites)
2. [Milestone 1: Research & Protocol Validation](#milestone-1-research--protocol-validation)
3. [Milestone 3: Implementation Guards](#milestone-3-implementation-guards)
4. [Milestone 7: Implementation Guards](#milestone-7-implementation-guards)
5. [Milestone 10: E2E](#milestone-10-e2e)
6. [Breadcrumb (MB2, MB4, MB5)](#breadcrumb-mb2-mb4-mb5)
7. [Re-evaluation & Plan Hygiene](#re-evaluation--plan-hygiene)
8. [Addendum D: Unified Agent Management (MD1–MD3)](#addendum-d-unified-agent-management-md1md3)
9. [Magic Literals: Phase 1 – Block New Slop](#magic-literals-phase-1--block-new-slop)
10. [Magic Literals: Phase 2 – Centralize Domains](#magic-literals-phase-2--centralize-domains)
11. [Magic Literals: Phase 3 – Replace Usage](#magic-literals-phase-3--replace-usage)
12. [Magic Literals: Phase 4 – Lock In](#magic-literals-phase-4--lock-in)
13. [Addendum E: OpenTUI Deep Audit (OT-1–OT-20)](#addendum-e-opentui-deep-audit-performance-rendering-resize-selection-colors-layout)
14. [Addendum F: Competitive Inspiration (CC-1–CC-10, OC-1–OC-10)](#addendum-f-competitive-inspiration-cc-1cc-10-oc-1oc-10)
15. [Addendum G: Code Quality Audit (CQ-1–CQ-28)](#addendum-g-code-quality-audit-cq)
16. [Addendum H: Deep Competitive Review & UX Audit (DC-1–DC-45)](#addendum-h-deep-competitive-review--ux-audit-dc-1dc-45)
17. [Addendum I: Ecosystem & Component Library Audit (EC-1–EC-20)](#addendum-i-ecosystem--component-library-audit-ec-1ec-20)

---

## Phase 0: Prerequisites

**A. Git Hygiene (Critical)**

- [ ] P0-1 — Commit or stash all current changes (30+ modified files, 5+ untracked)
- [ ] P0-2 — Create feature branch: `git checkout -b feature/cursor-cli-harness`

**B. Environment Validation (M1 Blockers)**

- [ ] P0-3 — Verify `agent` binary installed: `which cursor-agent` or `which agent`
- [ ] P0-4 — Verify Cursor auth: `agent status` or `agent whoami` — capture output format
- [ ] P0-7 — Validate `--resume` across process invocations:
  1. Run `agent -p --output-format stream-json "remember the word banana"` → capture `session_id` from `system.init`
  2. Run `agent -p --output-format stream-json --resume <session_id> "what word did I ask you to remember?"` → verify context retained
- [ ] P0-8 — Validate `agent create-chat` → capture output, then test with `--resume <id>`
- [ ] P0-12 — **CRITICAL — Architecture Decision**: Test hooks in `-p` (headless) mode:
  1. Create a minimal `hooks.json` with a `preToolUse` hook pointing to a script that logs to a file
  2. Run `agent -p "read the file package.json"` (triggers a tool call)
  3. Check if the hook script was executed (log file created)
  4. **If hooks DO NOT fire in `-p` mode**: Channel 2 architecture is unviable for headless — document this and revise plan to use NDJSON-only with `--force` as fallback
  5. **If hooks DO fire**: Full three-channel architecture is go

**C. Quality Gate Baseline**

- [ ] P0-13 — Run full quality gates and confirm green baseline:
  ```bash
  bun run lint && bun run typecheck && bun run test && bun run build
  ```
- [ ] P0-14 — Record any pre-existing failures (so they aren't attributed to new work)

**E. Document Findings**

- [ ] P0-16 — Update `scratchpad/journal.md` with validation results
- [ ] P0-17 — If any open question yields a surprise, update the relevant milestone in this plan before starting

---

## Milestone 1: Research & Protocol Validation

- [ ] M1 - Validate `agent -p --output-format stream-json --stream-partial-output` locally
- [ ] M1 - Capture real NDJSON output samples for test fixtures
- [ ] M1 - Validate `--resume` across separate process invocations
- [ ] M1 - Validate `agent create-chat` returns usable ID
- [ ] M1 - Test hooks.json with a simple shim script
- [ ] M1 - Validate hook IPC latency (is Unix socket fast enough for real-time approval?)
- [ ] M1 - Test `agent models` output parsing
- [ ] M1 - Test `agent status` output parsing
- [ ] M1 - Test `agent ls` output parsing
- [ ] M1 - Test Cloud Agents API with `CURSOR_API_KEY`

---

## Milestone 3: Implementation Guards

- [ ] M3 - **Guard (Q11)**: Ensure prompt is always passed via stdin in `-p` mode (never positional args; Cursor CLI can hang otherwise)
- [ ] M3 - **Guard (Q7)**: Session list for Cursor must use session_id from NDJSON only; do not rely on `agent ls` (requires TTY)

---

## Milestone 7: Implementation Guards

- [ ] M7 - **Guard (Q11)**: Verify harness always invokes Cursor with prompt on stdin (pipe), not as positional argument
- [ ] M7 - **Guard (Q7)**: Session browser for Cursor uses session_id from stream only; no `agent ls` for listing

---

## Milestone 10: E2E

- [ ] M10 - Optional: E2E test with real Cursor CLI (env-gated)

---

## Breadcrumb (MB2, MB4, MB5)

- [ ] MB2 - Zod schemas for all outputs (deferred)
- [ ] MB2 - Unit tests for status derivation logic (>= 95% coverage)
- [ ] MB4 - Create/wire skills for each status action:
  - [ ] `create-pr` — `gh pr create` with AI-generated title/body
  - [ ] `commit-changes` — Stage + commit with AI-generated message
  - [ ] `address-feedback` — Read PR review comments, apply fixes
  - [ ] `resolve-conflicts` — AI-assisted merge conflict resolution
  - [ ] `fix-ci` — Read CI logs, diagnose and fix failures
  - [ ] `merge-pr` — `gh pr merge` with options
  - [ ] `cleanup-branch` — Delete branch, switch to main
- [ ] MB4 - Unit tests for BreadcrumbBar component
- [ ] MB5 - Integration test: full workflow status polling → display → action trigger

---

## Re-evaluation & Plan Hygiene

- [ ] **Plan** — Update Open Questions section: mark Q1–Q11 as resolved, add "See Addendum C" pointer
- [ ] **Plan** — Add implementation guard to M3/M7: Cursor CLI must receive prompt via stdin in `-p` mode (not positional args)
- [ ] **Plan** — Add implementation guard to M3/M7: Session list for Cursor uses session_id from NDJSON only; do not call `agent ls` (TTY required)
- [ ] **Plan** — Add MD1–MD3 to Execution Phases table and Milestone Table (Phase I: Agent Management)
- [ ] **Plan** — Update plan header: Status and Last Updated when re-baseline is complete
- [ ] **Doc** — Document tested/supported Cursor CLI version in README or docs (e.g. "Tested with 2026.01.28")
- [ ] **Doc** — (Optional) ADR for three-channel architecture; Cursor troubleshooting subsection in README

---

## Addendum D: Unified Agent Management (MD1–MD3)

- [ ] MD1 - Add management command types to `src/types/cli-agent.types.ts` (Zod schemas)
- [ ] MD1 - Add abstract methods to `CliAgentBase` for login/logout/status/about/models/mcp
- [ ] MD1 - Implement output parser utilities for all agents:
  - [ ] Cursor CLI parsers (about, models, mcp list, status, login/logout)
  - [ ] Claude CLI parsers (version, mcp list)
  - [ ] Codex CLI parsers (login status, version)
  - [ ] Gemini CLI parsers (version, list-sessions)
- [ ] MD2 - Register slash commands: `/login`, `/logout`, `/status`, `/models`, `/model`, `/mcp`, `/agent`
- [ ] MD2 - Implement slash command handlers that delegate to `CliAgentPort` methods
- [ ] MD2 - Create `agent-command-formatter.ts` with rich TUI rendering
- [ ] MD3 - Integration tests for all agent command parsers (>= 95% coverage)
- [ ] MD3 - Handle edge cases:
  - [ ] Agent doesn't support logout → show "not supported" message
  - [ ] Agent auth requires env var → show instructions
  - [ ] Login requires browser → indicate "Opening browser..."
  - [ ] MCP not supported by agent → show "not available" message
  - [ ] Models not listable → show "use --model flag" message

---

## Magic Literals: Phase 1 – Block New Slop

> Lint + patterns to block new magic literals. Source: [MAGIC_LITERALS_TASKS.md](MAGIC_LITERALS_TASKS.md).

- [ ] Ensure `scripts/check-magic-literals.ts` runs in CI (e.g. `bun run check:literals:strict`).
- [ ] Add patterns for `getEnvironment() === "test"`, `process.platform === "win32"`, and `.toLowerCase() === "true"` to detection script.
- [ ] Document allowed exceptions (ACP, marked) in script comments and in `.cursorrules`.

---

## Magic Literals: Phase 2 – Centralize Domains

> Add constant modules so literals have a single source of truth.

- [ ] **Env values:** Add `src/constants/env-values.ts` with `ENV_VALUE = { TEST: "test", ... } as const`.
- [ ] **Platform:** Ensure `PLATFORM` from `platform.ts` is the single source for darwin/win32/linux.
- [ ] **Provider stream:** Add `src/constants/provider-stream.ts` (or under `constants/`) for "[DONE]", "stop", "content_block_delta", "text_delta", "thinking_delta", "message_stop".
- [ ] **Permission wildcard:** Add `PERMISSION_PATTERN.WILDCARD = "*"` (or similar) in `permission-patterns.ts`.
- [ ] **Command palette row types:** Add `COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER` / `COMMAND` in new or existing constants file.
- [ ] **Terminal names:** Add constants for "iTerm.app", "WezTerm" if used elsewhere; else keep local with comment.
- [ ] **Config placeholders:** Add `CONFIG_PLACEHOLDER.FILE = "$FILE"` (or in code-formatter config).
- [ ] **Limits/timeouts:** Add missing entries to `config/limits.ts` and `config/timeouts.ts` (cleanup interval, prompt TTL, integrity window, listAgents limit, input history size, clipboard debounce, LSP/beads timeout, rotate interval).

---

## Magic Literals: Phase 3 – Replace Usage

> Replace literals with constants (codemod-friendly order).

- [ ] Replace `getEnvironment() === "test"` / `!== "test"` in all 5 files with `ENV_VALUE.TEST`.
- [ ] Replace `process.platform === "win32"` with `PLATFORM.WIN32` in hooks-config-generator and hook-ipc-server.
- [ ] Add `KEY_NAME.RIGHT_BRACKET` and use in Sidebar.tsx.
- [ ] repo-workflow.ts: use constants for state/decision strings.
- [ ] cursor-cli-connection.ts: use event type constants.
- [ ] CommandPalette: use row type constants.
- [ ] RewindModal: use rewind/selection constants.
- [ ] anthropic-provider: use MESSAGE_ROLE.SYSTEM.
- [ ] Provider files: use provider-stream constants for "[DONE]", "stop", event/delta types.
- [ ] permissions.ts: use PERMISSION_OPTION_KIND.REJECT_ALWAYS / REJECT_ONCE.
- [ ] StatusFooter: use SLASH_COMMANDS.HELP for "/help".
- [ ] permission-modes & skill-permissions: use wildcard constant.
- [ ] code-formatter: use CONFIG_PLACEHOLDER.FILE.
- [ ] init-generator: use PROJECT_FILES.ENV_SAMPLE.
- [ ] hooks-loader: use constant for "settings.json".
- [ ] patch.ts: use constant for "/dev/null".
- [ ] universal-loader: use BOOLEAN_STRINGS.TRUE.
- [ ] image-renderer: use terminal name constants (or document).
- [ ] cursor-cli-harness: use transport constant.
- [ ] cursor-cli-agent-port & cli-agent.base: use mode constants (focus-target/sidebar-tabs).
- [ ] slash-command-actions: use image-extensions constant for ".svg".
- [ ] theme-loader: use constant for ".json".
- [ ] cli-output-parser: use BOOLEAN_STRINGS/TRUTHY_STRINGS.
- [ ] hook-ipc-server: use error message constant for "Payload too large.".
- [ ] useSessionHydration: use shared "No harnesses configured." constant.
- [ ] ui-symbols & update-check: use BOOLEAN_STRINGS.TRUE for env checks.
- [ ] Replace magic numbers (listAgents 100, MAX_HISTORY_SIZE 200, debounce 100, CLEANUP_INTERVAL_MS, DEFAULT_TTL_MS, 7 days, slice 200, timeout 3000, ROTATE_INTERVAL_MS) with config/limits/timeouts.
- [ ] formatToolCallDuration: ensure LIMIT.DURATION_FORMAT_* used consistently.
- [ ] (Optional) Centralize throw new Error() messages to error-codes or messages module.

---

## Magic Literals: Phase 4 – Lock In

> Tests + CI so literals stay centralized.

- [ ] All new constant modules have types exported and used in Zod/domain where relevant.
- [ ] Run `bun run check:literals:strict` and fix any remaining violations.
- [ ] Add or update CI step to run `check:literals:strict` on every PR.
- [ ] Add unit tests for constant modules where behavior depends on literal values (e.g. env checks, platform).

---

## Addendum E: OpenTUI Deep Audit (Performance, Rendering, Resize, Selection, Colors, Layout)

> Audit of `src/` against OpenTUI skill and references: maximize performance, correct rendering, resize behavior, text selection, colors, and layout, and leverage OpenTUI’s full potential.

**Source**: `.agents/skills/opentui/SKILL.md` and `references/` (react, layout, components, keyboard, core gotchas).  
**Status**: Tasks listed for approval; not started.

### Performance

- [ ] **OT-1** — **Modal animation**: Replace or complement `useModalAnimation`’s `setInterval`-based stepping with OpenTUI’s `useTimeline` (ease-out/ease-in, duration, onComplete) so modal open/close uses the same animation system as the rest of the TUI and avoids timer drift.
- [ ] **OT-2** — **Keyboard handlers**: Audit all `useKeyboard` usages (many components register their own). Document ordering and potential conflicts; consider a single app-level handler with delegation by focus/route to avoid duplicate handling and ensure predictable precedence.
- [ ] **OT-3** — **Scroll performance**: Confirm every `<scrollbox>` (including via `ScrollArea`) has an explicit `height` (or constrained parent). MessageList already passes `scrollAreaHeight`; verify no scrollbox is rendered without a height constraint (OpenTUI gotchas).
- [ ] **OT-4** — **Re-renders**: Review high-churn UI (MessageList, CommandPalette, Sidebar) for unnecessary re-renders; use `memo`/stable callbacks where missing and avoid creating new object/array refs in render for scrollbox `style` or other props.

### Rendering

- [ ] **OT-5** — **Root dimensions**: App root uses `<box height={terminalDimensions.rows} width={terminalDimensions.columns}>`. Ensure the full chain for main layout uses `height="100%"` / `width="100%"` only where the parent has explicit size (per OpenTUI layout gotchas).
- [ ] **OT-6** — **Text styling**: OpenTUI React docs prefer nested modifier tags (`<strong>`, `<em>`, `<u>`) for bold/italic/underline. The codebase uses `attributes={TextAttributes.DIM}` / `TextAttributes.BOLD` in many places. Verify whether `@opentui/react` supports an `attributes` prop; if not, or for consistency, migrate to nested tags (e.g. `<text><span dim>...</span></text>`) where applicable.
- [ ] **OT-7** — **Diff view**: `DiffRenderer` uses `createTwoFilesPatch` and custom box/text. Evaluate OpenTUI’s `<diff>` (unified/split, showLineNumbers) for at least the unified view to get consistent styling and line numbers; keep custom logic only if needed for truncation/worker.
- [ ] **OT-8** — **Markdown**: `MarkdownRenderer` already uses OpenTUI `<markdown>`; no change required. Optionally ensure `syntaxStyle` and theme colors align with app theme.

### Resizing

- [ ] **OT-9** — **Resize hook**: `useTerminalDimensions()` is used; `useOnResize` is not. Add `useOnResize` only where side effects on resize are needed (e.g. persisting window size, analytics, or one-off layout fixes); avoid duplicating dimension-driven layout that React already gets from `useTerminalDimensions`.
- [ ] **OT-10** — **Responsive breakpoints**: Sidebar width is `terminalDimensions.columns * SIDEBAR_WIDTH_RATIO`. Consider explicit breakpoints (e.g. from layout/patterns.md): very small width → stacked layout or hide sidebar; document chosen breakpoints in config or constants.

### Selection

- [ ] **OT-11** — **Selectable text**: OpenTUI `<text selectable>` enables terminal selection. Add `selectable` to message content and other long read-only text (e.g. tool output, diff content, help text) so users can copy without extra steps.

### Colors

- [ ] **OT-12** — **Hex format**: Ensure all color props use `"#RRGGBB"` (with `#`). Audit `COLOR.*` and theme values; fix any that are passed without `#` (OpenTUI gotchas).
- [ ] **OT-13** — **Theme and scrollbars**: Pass theme-aware `scrollbarOptions` (and related `style` props) into `ScrollArea` / `<scrollbox>` so scrollbar track/thumb match app theme (e.g. from `theme.ts` or `COLOR`).

### Layout

- [ ] **OT-14** — **Flex and overflow**: Codebase already uses `minHeight={0}`, `overflow="hidden"`, and `width="100%"` in many places. Spot-check modals and ScrollArea parents so flex children that should shrink have `minHeight={0}` and scrollbox has explicit height.
- [ ] **OT-15** — **Modal centering**: Verify modal overlays (CommandPalette, RewindModal, etc.) use `position="absolute"`, `left={0}`, `top={0}`, `width="100%"`, `height="100%"`, and `justifyContent`/`alignItems` for centering per layout/patterns.md.
- [ ] **OT-16** — **Border API**: Codebase uses `border={["top"]}` / `border={["bottom"]}`. Confirm this is the supported React API (vs. `borderTop`/`borderBottom` in docs); if not, align with OpenTUI API.

### OpenTUI Features Not Yet Leveraged

- [ ] **OT-17** — **Exit cleanup**: In `cli.ts`, when the TUI has been created and an error occurs later, call `renderer.destroy()` before `process.exit(1)` so the terminal is restored (OpenTUI gotchas). When `createCliRenderer` throws (e.g. non-TTY), no renderer exists so `process.exit(1)` is acceptable; add a short comment.
- [ ] **OT-18** — **Focus and input**: When a modal or input is focused, ensure global `useKeyboard` does not handle keys that should go to the focused input (e.g. type-ahead). Follow keyboard REFERENCE: check “input focused” before handling global shortcuts.
- [ ] **OT-19** — **Tab-select (optional)**: For simpler tab UIs (e.g. single-row tabs), consider OpenTUI `<tab-select>`; SidebarTabBar’s multi-row/collapse can stay custom if needed.
- [ ] **OT-20** — **ASCII banner**: `AsciiBanner` already uses `<ascii-font>`; no change. Optionally expose font/size via config.

### Summary Table

| Area        | Task IDs   | Focus                                      |
|------------|------------|--------------------------------------------|
| Performance| OT-1–OT-4  | useTimeline, useKeyboard audit, scrollbox height, re-renders |
| Rendering  | OT-5–OT-8  | Root/layout chain, text attributes vs nested tags, diff, markdown |
| Resizing   | OT-9–OT-10 | useOnResize, breakpoints                   |
| Selection  | OT-11      | selectable on message and read-only text   |
| Colors     | OT-12–OT-13| Hex format, scrollbar theme               |
| Layout     | OT-14–OT-16| Flex/overflow, modal centering, border API |
| Features   | OT-17–OT-20| destroy before exit, focus vs global keys, tab-select, ascii-font |

---

*Last Updated: 2026-02-12*
*Sources: PLAN2.md (incomplete tasks) · MAGIC_LITERALS_TASKS.md · OpenTUI audit (Addendum E)*

---

## Addendum F: Competitive Inspiration (CC-1–CC-10, OC-1–OC-10)

> Tasks derived from Claude Code and OpenCode research (2026-02-12). Each task includes an impact rating
> for TOADSTOOL (1–10).

**Sources**:  
- https://github.com/anthropics/claude-code  
- https://github.com/anomalyco/opencode

### Claude Code (CC)

- [ ] **CC-1 (9/10)** — Add a first-class plugin registry + discovery UX for command/agent packs.
- [ ] **CC-2 (8/10)** — Expand entry points: terminal, IDE integration, and GitHub mention workflow.
- [ ] **CC-3 (7/10)** — Add `/bug` command to capture context and file an issue/export bundle.
- [ ] **CC-4 (7/10)** — Tighten install story with a single recommended path + platform options.
- [ ] **CC-5 (6/10)** — Add `/privacy` or docs page covering data usage and retention policy.
- [ ] **CC-6 (6/10)** — Centralize docs hub with setup, usage, data, and troubleshooting pages.
- [ ] **CC-7 (5/10)** — Add community entry point (Discord) and in-app link.
- [ ] **CC-8 (5/10)** — Clarify install method deprecations to reduce support burden.
- [ ] **CC-9 (5/10)** — Strengthen git-workflow UX (status/branch/PR tasks as first-class flows).
- [ ] **CC-10 (4/10)** — Tighten product narrative and one-line positioning across docs/CLI.

### OpenCode (OC)

- [ ] **OC-1 (9/10)** — Elevate provider-agnostic UX with clean switching and fallback policy.
- [ ] **OC-2 (9/10)** — Expand headless server mode into a client/server architecture roadmap.
- [ ] **OC-3 (8/10)** — Prioritize LSP integration (diagnostics, symbols, navigation) as core.
- [ ] **OC-4 (8/10)** — Package a desktop app wrapper for non-terminal users.
- [ ] **OC-5 (7/10)** — Highlight safe plan/build agent modes with clear permission prompts.
- [ ] **OC-6 (6/10)** — Add a default "general" subagent for complex searches/tasks.
- [ ] **OC-7 (6/10)** — Add multi-language docs coverage for broader adoption.
- [ ] **OC-8 (6/10)** — Provide robust installation matrix (script + brew/scoop/choco/nix).
- [ ] **OC-9 (5/10)** — Document deterministic install directory selection rules.
- [ ] **OC-10 (5/10)** — Showcase TUI-first UX with a dedicated demo/screenshot flow.

---

## Addendum G: Code Quality Audit (CQ)

> Audit of `src/` per code-quality skill: type safety at boundaries, component size, error handling. No `any` or ts-ignore; main issues: unsafe casts after JSON.parse / Object.entries, oversized components, silent catch blocks.

**Source**: `.claude/skills/code-quality/SKILL.md`  
**Status**: Tasks listed; not started.

### Summary

- **Code health**: Good with targeted debt. High-risk: store/persistence, provider stream parsers, MCP/theme/hooks config loaders, api-routes params.
- **Common patterns**: (1) `JSON.parse(...) as T` without Zod; (2) `Object.values`/`Object.entries` cast to domain types; (3) very large components (App ~979, slash-command-runner ~720); (4) bare `catch` with no logging.

### Findings (remediation tasks)

- [ ] **CQ-1** — **json-provider.ts**: Replace casts after JSON.parse and Object.values with Zod (SessionSnapshotSchema); type message/session lists from parsed schema.
- [ ] **CQ-2** — **app-store.ts**: Type set() updater return values explicitly; replace `Object.entries(state.messages) as Array<...>` with typed helpers or validated builders; remove redundant `as Partial<AppState>` / `as AppState["messages"]` where possible.
- [ ] **CQ-3** — **openai-provider.ts**: Parse SSE payloads with Zod schema for event/delta; remove `as Record<string, unknown>` and field casts.
- [ ] **CQ-4** — **anthropic-provider.ts**: Same as CQ-3 for stream event/delta.
- [ ] **CQ-5** — **openai-compatible-provider.ts**: Same as CQ-3 for SSE delta.
- [ ] **CQ-6** — **mcp-config-merger.ts**: Add Zod schema for MCP server entry; parse config into it instead of casting fields.
- [ ] **CQ-7** — **hooks-config-generator.ts**: Parse hooks file with schema (e.g. CursorHooksFileSchema); remove double cast (as unknown then as Record).
- [ ] **CQ-8** — **theme-loader.ts**: Use ThemeDefinitionSchema.parse(JSON.parse(content)) (or dedicated schema); remove `as ThemeDefinition`.
- [ ] **CQ-9** — **settings-manager.ts**: Parse with settings schema; use type guard for ErrnoException instead of `(error as NodeJS.ErrnoException)?.code`.
- [ ] **CQ-10** — **api-routes.ts**: Validate route params with SessionIdSchema (or parse); remove `params.id as SessionId`.
- [ ] **CQ-11** — **Sidebar.tsx**: Use type guard for `active` (e.g. isSidebarTab) instead of `active as SidebarTab` for indexOf.
- [ ] **CQ-12** — **BreadcrumbBar.tsx**: Validate or map status with default; remove `info.status as RepoWorkflowStatus` for label/color lookup.
- [ ] **CQ-13** — **MessageItem.tsx**: Type initial object as `{ durationText: string | null; ... }`; remove `null as string | null`.
- [ ] **CQ-14** — **cursor-to-acp-translator.ts**: Narrow event with type guard or event.type before use; remove `event as CursorToolCallCompletedEvent`.
- [ ] **CQ-15** — **hook-ipc-server.ts**: Use `error instanceof Error` (or guard) before emit; remove `error as Error`.
- [ ] **CQ-16** — **App.tsx**: Split into layout, view router, modal orchestrator; extract modal state; target no file over ~400 lines.
- [ ] **CQ-17** — **slash-command-runner.ts**: Split by command group/domain into separate modules; thin runner that delegates; extract shared types/helpers.
- [ ] **CQ-18** — **Sidebar.tsx**: Extract SidebarTabBar and per-tab content; optionally useSidebarKeyboard; reduce to ~300–400 lines.
- [ ] **CQ-19** — **Chat.tsx**: Extract input area, message list container, header; reduce size.
- [ ] **CQ-20** — **repo-workflow.ts**: In each `catch { return fallback }`, add logger.debug/warn with context (path, operation) before return.
- [ ] **CQ-21** — **Provider stream parsers** (openai, anthropic, openai-compatible): In catch that skips malformed SSE, add logger.debug with message and optional truncated chunk.
- [ ] **CQ-22** — **cursor-cli-connection.ts**: In inner catch after killFn, log error and optionally rethrow or emit; do not leave empty.
- [ ] **CQ-23** — **checkpoint-manager.ts** / **universal-loader.ts**: When rm() or file skip fails in catch, log warning or debug with path.
- [ ] **CQ-24** — **persistence-manager.ts**: Ensure snapshot parsed with schema that yields Message[] (or parse each message); remove `Object.values(snapshot.messages) as Message[]`.
- [ ] **CQ-25** — **plugin-system.ts**: Parse manifest with PluginManifestSchema; remove `JSON.parse(raw) as PluginManifest`.
- [ ] **CQ-26** — **beads-integration.ts**: Parse CLI output with Zod array schema; remove `JSON.parse(stdout) as Array<...>`.
- [ ] **CQ-27** — **pr-status.ts**: Use z.enum() or map with default for unknown values; remove toLowerCase() as PullRequestStatus/PrReviewStatus.
- [ ] **CQ-28** — **custom-tool-helper.ts**: Add type guard `isCustomToolDef(v): v is CustomToolDefinition` and narrow; remove cast.

### Remediation phases (overview)

| Phase | Focus | Task IDs |
|-------|--------|----------|
| 1 – Type safety at boundaries | Zod at JSON/API boundaries; type guards; remove unsafe casts | CQ-1–CQ-15, CQ-24–CQ-28 |
| 2 – Component size | Split App, slash-command-runner, Sidebar, Chat | CQ-16–CQ-19 |
| 3 – Error handling | Log in catch blocks; no empty catch in critical paths | CQ-20–CQ-23 |

---

## Addendum H: Deep Competitive Review & UX Audit (DC-1–DC-45)

> Deep review of TOADSTOOL against Claude Code (https://github.com/anthropics/claude-code) and
> OpenCode (https://github.com/anomalyco/opencode), plus codebase-level UX audit.
> Each task includes an impact rating (1–10) and source reference.

**Sources**:
- Claude Code docs: https://code.claude.com/docs/en/overview
- OpenCode docs: https://opencode.ai/docs
- Codebase audit of `src/ui/`, `src/store/`, `src/config/`

**Status**: Tasks listed for approval; not started.

---

### Category 1: Session Management & Navigation

- [ ] **DC-1 (9/10)** — **Session preview**: Add preview capability to `SessionsPopup`. Claude Code's session picker has a `P` key to preview session content before selecting. Currently our picker shows only title/description with no message preview. Implement a split-pane or expandable preview showing the last 5–10 messages.
  - *Source*: Claude Code `/resume` picker.

- [ ] **DC-2 (8/10)** — **Session delete/archive**: Add explicit session deletion or archival. Currently sessions can only be removed via background retention policy — there's no user-facing delete. Add `d` key in SessionsPopup and a `/delete` slash command with confirmation.
  - *Source*: Missing in TOADSTOOL; standard in both competitors.

- [ ] **DC-3 (7/10)** — **Session branch filter**: Add `B` key in SessionsPopup to filter sessions by current git branch. Claude Code's picker supports this. Store `gitBranch` on session creation and filter by it.
  - *Source*: Claude Code session picker.

- [ ] **DC-4 (7/10)** — **Session fork grouping**: When sessions are forked (via `/rewind` or checkpoint), group them under their root session in the picker with expand/collapse (`→`/`←`). Claude Code does this for forked sessions.
  - *Source*: Claude Code session picker.

- [ ] **DC-5 (6/10)** — **CLI resume by name**: Support `toad --resume <name>` and `toad --continue` flags to resume sessions from the command line. Claude Code has `claude --resume`, `claude --continue`, and `claude --from-pr`.
  - *Source*: Claude Code CLI.

- [ ] **DC-6 (5/10)** — **Session metadata**: Show message count, git branch, and elapsed time in session list entries. Both competitors show this metadata. Currently we show agent ID and timestamps but not message count or branch.
  - *Source*: Both competitors.

---

### Category 2: Input & Prompt Composition

- [ ] **DC-7 (9/10)** — **External editor integration**: Add `/editor` command that opens `$EDITOR` (or `$VISUAL`) with a temp file for composing long prompts. On save+close, the content is submitted as the user message. OpenCode has this; Claude Code supports `Ctrl+G` to edit plans in editor.
  - *Source*: OpenCode `/editor`.

- [ ] **DC-8 (8/10)** — **Image paste/drag-drop support**: Support pasting images (`Ctrl+V`) and drag-drop into the terminal. Claude Code supports drag-drop, paste, and file path references for images. Display thumbnails inline or as `[Image #1]` references.
  - *Source*: Claude Code image support.

- [ ] **DC-9 (7/10)** — **Shell output injection**: Support `!command` syntax in prompts to inject shell command output inline. OpenCode has this. E.g., `Fix the error in !git diff --name-only` would expand to the actual file list.
  - *Source*: OpenCode `!` prefix.

- [ ] **DC-10 (6/10)** — **InputWithAutocomplete decomposition**: `InputWithAutocomplete.tsx` is 546 lines. Extract autocomplete logic, suggestion rendering, and slash command parsing into separate modules. This is a component-size issue (similar to CQ-16–CQ-19 but for input).
  - *Source*: Codebase audit.

- [ ] **DC-11 (5/10)** — **Multi-line input indicator**: Show a visual indicator when input is in multi-line mode. Both competitors make it clear when you're composing a multi-line message vs. a single-line one.
  - *Source*: UX audit.

---

### Category 3: Tool Approval & Permissions

- [ ] **DC-12 (9/10)** — **Granular pattern-based permissions**: Upgrade permission system to support pattern-based rules per tool. OpenCode supports `"bash": { "*": "ask", "git *": "allow", "rm *": "deny" }` and `"edit": { "*.md": "allow", "*": "deny" }`. Currently our approval is binary (allow/ask/deny per tool).
  - *Source*: OpenCode permissions.

- [ ] **DC-13 (8/10)** — **"Always allow" from approval prompt**: When the tool approval prompt appears, add an `[A]lways allow` option (in addition to `[Y]es` and `[N]o`). Choosing "always" should remember the decision for this tool+pattern for the rest of the session (or permanently). OpenCode has `once`, `always`, `reject` options.
  - *Source*: OpenCode approval UX.

- [ ] **DC-14 (7/10)** — **Structured question UI**: Implement a `question` tool UI component for when the agent needs to ask the user structured questions. OpenCode has a dedicated UI: header, question text, selectable options, navigation between multiple questions before submit. Currently we have no equivalent — agents can only send text messages.
  - *Source*: OpenCode `question` tool.

- [ ] **DC-15 (6/10)** — **Permission mode indicator**: Make the current permission mode (normal / auto-accept / plan) more visible in the StatusFooter. Claude Code shows `⏵⏵ accept edits on` or `⏸ plan mode on` prominently. Our `Shift+Tab` cycling is functional but the mode isn't visually prominent enough.
  - *Source*: Claude Code permission modes.

---

### Category 4: Undo/Redo & Checkpoints

- [ ] **DC-16 (9/10)** — **Git-based file undo**: Upgrade `/undo` to revert both conversation messages AND file changes (git stash/revert). OpenCode's `/undo` reverts files to their state before the last agent turn, not just the conversation. Currently our undo only removes messages.
  - *Source*: OpenCode `/undo`.

- [ ] **DC-17 (7/10)** — **Redo support**: Add `/redo` command to re-apply the last undone action (messages + files). OpenCode supports multiple undo/redo levels. Currently we have no redo capability.
  - *Source*: OpenCode `/redo`.

- [ ] **DC-18 (6/10)** — **Checkpoint navigation in RewindModal**: Show a timeline/list of all checkpoints (not just "checkpoint X/N") with timestamps and brief descriptions of what changed. Allow selecting a specific checkpoint to jump to, rather than just cycling.
  - *Source*: OpenCode session timeline (`<leader>g`).

---

### Category 5: Theme System

- [ ] **DC-19 (8/10)** — **Custom theme JSON support**: Allow users to define custom themes as JSON files in `~/.config/toadstool/themes/` (user-wide) and `.toadstool/themes/` (project). Support the same hierarchy as OpenCode: built-in → user → project, with later overriding earlier.
  - *Source*: OpenCode custom themes.

- [ ] **DC-20 (8/10)** — **Expand built-in themes**: Add popular themes: `tokyonight`, `catppuccin`, `gruvbox`, `nord`, `one-dark`, `kanagawa`, `everforest`, `ayu`, `matrix`. OpenCode ships 10+ built-in themes. We have 4 (`default`, `midnight`, `sunrise`, `high-contrast`).
  - *Source*: OpenCode built-in themes.

- [ ] **DC-21 (7/10)** — **System/terminal-adaptive theme**: Add a `system` theme that adapts to terminal background color. Uses ANSI colors (0–15) for syntax highlighting and generates a grayscale from the terminal background for optimal contrast. Use `"none"` for text/bg to inherit terminal defaults.
  - *Source*: OpenCode `system` theme.

- [ ] **DC-22 (7/10)** — **Granular theme tokens**: Expand `ThemeColors` to include markdown tokens (`markdownHeading`, `markdownCode`, `markdownLink`, etc.), syntax tokens (`syntaxKeyword`, `syntaxString`, `syntaxFunction`, etc.), and diff tokens (`diffHighlightAdded`, `diffHighlightRemoved`, `diffLineNumber`, etc.). Currently we only have ~16 color keys.
  - *Source*: OpenCode theme JSON schema.

- [ ] **DC-23 (5/10)** — **Dark/light variant support**: Allow theme definitions to specify `{ "dark": "#hex", "light": "#hex" }` for each color, auto-selecting based on terminal background detection.
  - *Source*: OpenCode theme format.

---

### Category 6: Agent UX

- [ ] **DC-24 (8/10)** — **Per-agent color**: Assign each agent a distinct color (configurable) that appears in the sidebar, message headers, and status bar. OpenCode supports `"color"` per agent config. This helps visually distinguish which agent sent which message.
  - *Source*: OpenCode agent config.

- [ ] **DC-25 (7/10)** — **Quick agent cycle with Tab**: Add `Tab` key to cycle between primary agents (e.g., build ↔ plan). OpenCode uses `Tab` for this. Currently we use `Shift+Tab` to cycle permission modes, not agents. Consider making `Tab` cycle agents and keeping `Shift+Tab` for permission modes.
  - *Source*: OpenCode `agent_cycle`.

- [ ] **DC-26 (7/10)** — **Prominent plan/build mode indicator**: When in plan mode (read-only), show a clear banner or border color change (not just a status line label). Claude Code shows `⏸ plan mode on` and OpenCode shows the agent name in a distinct color with an icon. Users should never be confused about whether the agent can modify files.
  - *Source*: Both competitors.

- [ ] **DC-27 (6/10)** — **Effort level control**: Add an effort/thinking depth toggle (low/medium/high) accessible via `/effort` or a keybind. Claude Code's Opus 4.6 uses adaptive reasoning with configurable effort. This controls how deeply the model reasons before responding.
  - *Source*: Claude Code effort level.

---

### Category 7: Headless & Scripting

- [ ] **DC-28 (9/10)** — **Headless pipe mode**: Add `toad -p "prompt"` for non-interactive/headless operation. Accept stdin pipe, emit to stdout, and exit. Claude Code's `-p` flag is foundational for scripting, CI, and unix-style composition (e.g., `cat error.log | toad -p "explain this"`).
  - *Source*: Claude Code `-p` flag.

- [ ] **DC-29 (7/10)** — **Output format flag**: Support `--output-format text|json|stream-json` for headless mode. `text` = plain response, `json` = full message array with metadata, `stream-json` = NDJSON of events. Enables integration with other tools and CI.
  - *Source*: Claude Code `--output-format`.

- [ ] **DC-30 (6/10)** — **Permission mode flag**: Support `--permission-mode plan|normal|auto` from CLI to start sessions in a specific mode. Claude Code supports `--permission-mode plan` for safe read-only analysis.
  - *Source*: Claude Code `--permission-mode`.

---

### Category 8: Sharing & Export

- [ ] **DC-31 (7/10)** — **Session sharing**: Add `/share` command to generate a shareable link for the current conversation. OpenCode creates public links that anyone can view. Requires a lightweight backend or integration with a paste service.
  - *Source*: OpenCode `/share`.

- [ ] **DC-32 (6/10)** — **Markdown export**: Improve `/export` to produce clean, well-formatted Markdown with proper code blocks, tool call summaries, and metadata header (session ID, agent, model, timestamps). OpenCode exports to Markdown and can open in `$EDITOR`.
  - *Source*: OpenCode `/export`.

---

### Category 9: Code Intelligence & Tools

- [ ] **DC-33 (9/10)** — **LSP integration**: Add experimental LSP tool support: `goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `workspaceSymbol`. OpenCode has this as a core differentiator. Auto-detect and spawn language servers for TypeScript, Python, Go, Rust, etc. Gate behind `TOADSTOOL_EXPERIMENTAL_LSP=true`.
  - *Source*: OpenCode LSP tool.

- [ ] **DC-34 (7/10)** — **Custom tools**: Allow users to define custom tools in config (name, description, parameters, command). These become available to the agent like built-in tools. OpenCode supports this in `opencode.json`.
  - *Source*: OpenCode custom tools.

- [ ] **DC-35 (6/10)** — **Web search tool**: Add a built-in web search tool (via Exa, Tavily, or similar). Claude Code and OpenCode both have web search. Gate behind an API key or provider flag.
  - *Source*: Both competitors.

---

### Category 10: UI Polish & UX Improvements

- [ ] **DC-36 (8/10)** — **Scroll acceleration**: Implement macOS-style scroll acceleration in `ScrollArea` and `MessageList`. OpenCode has configurable `scroll_acceleration` and `scroll_speed`. Fast scrolling should accelerate; slow scrolling stays precise.
  - *Source*: OpenCode scroll config.

- [ ] **DC-37 (7/10)** — **Diff style options**: Add a config/command for switching diff rendering between `auto` (adapts to terminal width — unified for narrow, side-by-side for wide) and `stacked` (always unified). Currently we have one fixed diff style.
  - *Source*: OpenCode `diff_style`.

- [ ] **DC-38 (7/10)** — **Selectable text in messages**: Ensure message content, tool output, and diff content use OpenTUI's `<text selectable>` prop so users can copy text without extra steps. (Overlaps with OT-11.)
  - *Source*: OpenTUI + both competitors allow text selection.

- [ ] **DC-39 (6/10)** — **Verbose/thinking toggle**: Add `Alt+T` or `/thinking` to toggle visibility of the model's thinking/reasoning blocks. Claude Code has this with `Ctrl+O` for verbose mode. Currently we have `/thinking` but should ensure the toggle is quick and the visual treatment is clear (gray italic text).
  - *Source*: Claude Code verbose mode.

- [ ] **DC-40 (6/10)** — **Loading screen improvements**: Show more context during startup: connection status per harness, config load status, session hydration progress. Both competitors show clear progress during initialization.
  - *Source*: UX audit.

- [ ] **DC-41 (5/10)** — **Command palette scoring**: Improve fuzzy matching in `CommandPalette` with proper scoring (e.g., via `fuzzysort` like OpenCode) rather than simple `includes()` matching. Show match highlights in results.
  - *Source*: OpenCode uses `fuzzysort`.

- [ ] **DC-42 (5/10)** — **Keyboard shortcut cheatsheet**: Add a dedicated keybinds reference view (beyond HelpModal) that shows all shortcuts organized by category with current customizations. OpenCode has configurable keybinds with docs; Claude Code shows shortcuts in the session picker.
  - *Source*: Both competitors.

---

### Category 11: Plugin & Extension Architecture

- [ ] **DC-43 (8/10)** — **Plugin packaging**: Design a plugin manifest format that bundles skills, hooks, subagents, and MCP servers into a single installable unit with namespace isolation (e.g., `my-plugin:review`). Claude Code has a full plugin system with marketplaces.
  - *Source*: Claude Code plugins.

- [ ] **DC-44 (7/10)** — **Agent teams / multi-session coordination**: Add the ability to spawn multiple independent sessions that can coordinate via shared task lists and peer-to-peer messaging. Claude Code calls this "Agent Teams." Useful for parallel code review, research, and complex refactors.
  - *Source*: Claude Code agent teams.

- [ ] **DC-45 (6/10)** — **Hooks system**: Add lifecycle hooks that fire shell commands before/after specific events (tool execution, file edit, session start/end, compaction). Hooks run deterministically outside the LLM loop. Claude Code has pre/post hooks for tool execution and file edits.
  - *Source*: Claude Code hooks.

---

### Priority Summary Table

| Priority | Task IDs | Focus |
|----------|----------|-------|
| **Critical (9–10)** | DC-1, DC-7, DC-12, DC-16, DC-28, DC-33 | Session preview, external editor, granular permissions, git undo, headless mode, LSP |
| **High (7–8)** | DC-2, DC-3, DC-8, DC-9, DC-13, DC-14, DC-17, DC-19, DC-20, DC-24, DC-25, DC-26, DC-29, DC-31, DC-34, DC-36, DC-37, DC-43, DC-44 | Session mgmt, image input, approval UX, themes, agent UX, output formats, plugins |
| **Medium (5–6)** | DC-4, DC-5, DC-6, DC-10, DC-11, DC-15, DC-18, DC-21, DC-22, DC-23, DC-27, DC-30, DC-32, DC-35, DC-38, DC-39, DC-40, DC-41, DC-42, DC-45 | Polish, config, export, tools, accessibility |

### Relationship to Existing Addenda

| New Task | Overlaps With | Notes |
|----------|---------------|-------|
| DC-10 | CQ-16–CQ-19 | Component size; InputWithAutocomplete not yet tracked |
| DC-38 | OT-11 | Selectable text; same task, different source |
| DC-39 | `/thinking` exists | Toggle exists; UX improvement needed |
| DC-12 | CC-1, OC-5 | More specific than Addendum F tasks |
| DC-19–DC-23 | OC-10 | Concrete theme tasks vs. high-level OC-10 |
| DC-28–DC-30 | OC-2 | Concrete headless tasks vs. high-level OC-2 |
| DC-33 | OC-3 | Concrete LSP tasks vs. high-level OC-3 |

---

## Addendum I: Ecosystem & Component Library Audit (EC-1–EC-20)

> Audit of the [awesome-opentui](https://github.com/msmps/awesome-opentui) ecosystem and
> [Ink](https://github.com/vadimdemedes/ink) component patterns. Identifies reusable libraries,
> missing UI primitives, and UX patterns to adopt.

**Sources**:
- https://github.com/msmps/awesome-opentui
- https://github.com/vadimdemedes/ink (component ecosystem)
- OpenTUI packages: `@opentui-ui/toast`, `@opentui-ui/dialog`, `opentui-spinner`
- Community projects: critique, tokscale, pilotty

**Status**: Tasks listed for approval; not started.

---

### Direct Library Adoption

- [ ] **EC-1 (9/10)** — **Toast notifications (`@opentui-ui/toast`)**: Install and integrate `@opentui-ui/toast` (Sonner-inspired) for non-blocking feedback. Replace inline system messages for transient actions like "Session saved", "Copied to clipboard", "Settings updated", "Export complete". Currently we use `appendSystemMessage()` which adds permanent chat entries for ephemeral feedback.
  - *Source*: [opentui-ui](https://github.com/msmps/opentui-ui)
  - *Install*: `bun add @opentui-ui/toast`

- [ ] **EC-2 (8/10)** — **Dialog component (`@opentui-ui/dialog`)**: Install and integrate `@opentui-ui/dialog` for confirmation flows. Use for destructive actions (session delete, clear, reset), permission escalation, and multi-step approval workflows. Currently our modals are all hand-rolled with inconsistent patterns.
  - *Source*: [opentui-ui](https://github.com/msmps/opentui-ui)
  - *Install*: `bun add @opentui-ui/dialog`

- [ ] **EC-3 (7/10)** — **Animated spinner (`opentui-spinner`)**: Install and use `opentui-spinner` for loading states. Replace static text indicators ("Loading…", "Connecting…") with animated spinners using `cli-spinners` (80+ types: dots, bouncingBall, line, etc.). Use color generators (`createPulse()`, `createWave()`) for visual distinction between states (connecting = pulse blue, thinking = wave green).
  - *Source*: [opentui-spinner](https://github.com/msmps/opentui-spinner)
  - *Install*: `bun add opentui-spinner`

---

### Missing UI Primitives (Port from Ink Patterns)

- [ ] **EC-4 (8/10)** — **Table component**: Build a `<Table>` component for structured data display. Needed for: `/status` output, `/mcp` server list, `/agents` list, `/models` list, session stats, token usage. Port layout logic from [ink-table](https://github.com/maticzav/ink-table): auto-column-width, header row, padding, border styles. Use OpenTUI `<box>` with flex layout.
  - *Source*: ink-table pattern.

- [ ] **EC-5 (8/10)** — **Confirm input component**: Build a reusable `<ConfirmInput>` for yes/no/cancel flows. Currently `ToolCallApproval` has hardcoded Y/N/Esc handling. Extract a generic `<ConfirmInput onConfirm onCancel defaultValue>` that handles `y/Y/Enter → true`, `n/N/Esc → false`. Use for: session delete, clear conversation, permission changes, destructive slash commands.
  - *Source*: [ink-confirm-input](https://github.com/kevva/ink-confirm-input) pattern.

- [ ] **EC-6 (7/10)** — **Virtualized list**: Add viewport-based virtualization for large lists. `FileTree` (421 lines), `MessageList`, and `SessionsPopup` render all items even when off-screen. OpenTUI's `<scrollbox viewportCulling>` does basic culling, but a true virtual list only mounts visible items + buffer. Particularly important for sessions with 100+ messages or projects with large file trees.
  - *Source*: [ink-virtual-list](https://github.com/nicholasgasior/ink-virtual-list) pattern.

- [ ] **EC-7 (6/10)** — **Form component**: Build a composable `<Form>` wrapper for multi-field input flows. Needed for: `/config` settings, `/login` credentials, `/connect` provider setup, agent configuration. Compose OpenTUI `<input>`, `<select>`, and `<textarea>` with focus cycling (Tab/Shift+Tab between fields), validation, and submit/cancel handling.
  - *Source*: [ink-form](https://github.com/lukasbach/ink-form) pattern.

---

### UX Patterns from Ecosystem Projects

- [ ] **EC-8 (9/10)** — **Split-view diff**: Port the split-view (side-by-side) diff pattern from [critique](https://github.com/remorses/critique). Currently `DiffRenderer` only shows unified diff. Add a side-by-side view for wide terminals (auto-switch based on width, like DC-37). Include word-level diff highlighting within changed lines, not just line-level add/remove coloring.
  - *Source*: critique (split view + word-level diff + Shiki syntax highlighting).

- [ ] **EC-9 (8/10)** — **Diff file switcher**: When reviewing multi-file diffs, add a `Ctrl+P`-style file switcher (like critique) to jump between changed files. Currently diffs are shown inline in the message stream with no way to navigate between them.
  - *Source*: critique (Ctrl+P file switcher).

- [ ] **EC-10 (7/10)** — **Diff syntax highlighting**: Add syntax-aware highlighting to diff content. critique uses Shiki for 18+ languages. OpenTUI's `<code>` component supports Tree-sitter. Render diff hunks through `<code language="..." diff>` or apply syntax tokens to the added/removed lines in `DiffRenderer`.
  - *Source*: critique (Shiki highlighting in diffs).

- [ ] **EC-11 (7/10)** — **Multi-view tabbed navigation**: Adopt tokscale's view-switching pattern: number keys (1–4) or Tab/arrows to switch between major views. Apply to sidebar tabs — allow `1`–`6` to switch tabs directly (partially exists with `Ctrl+1`–`Ctrl+6` but the direct number-key pattern is faster when sidebar is focused).
  - *Source*: [tokscale](https://github.com/junhoyeo/tokscale) (1–4 view switching).

- [ ] **EC-12 (6/10)** — **Token usage sparkline**: Add a small sparkline or bar chart showing token usage per session in the sidebar or status footer. tokscale shows GitHub-style contribution graphs and sparklines for token usage over time. A simple sparkline in the status bar (▁▂▃▅▇) would give users a quick sense of context usage.
  - *Source*: tokscale (token usage charts); [ink-chart](https://github.com/pppp606/ink-chart) sparkline pattern.

---

### Agent Automation & Testability

- [ ] **EC-13 (7/10)** — **Pilotty compatibility**: Ensure TOADSTOOL works well with [pilotty](https://github.com/msmps/pilotty) — the terminal automation tool for AI agents. Pilotty can `spawn`, `snapshot`, `type`, `key`, and `click` in TUI apps. Add a `.pilotty/` config or SKILL.md so AI agents can drive TOADSTOOL sessions programmatically. This enables meta-agent patterns (agent that drives other agents).
  - *Source*: pilotty.

- [ ] **EC-14 (6/10)** — **`renderToString` for testing**: Leverage OpenTUI/React's string rendering capabilities for snapshot testing of UI components. Ink provides `renderToString()` for generating terminal output as a string. Build a test helper that renders components to string for unit test assertions without a real TTY.
  - *Source*: Ink `renderToString()`.

---

### Accessibility & Terminal Compatibility

- [ ] **EC-15 (7/10)** — **Screen reader / ARIA support**: Add basic ARIA attributes to interactive elements. Ink supports `aria-role`, `aria-state`, `aria-label`, `aria-hidden`. Check if OpenTUI's React reconciler supports these props; if so, add `aria-role="button"` to approval buttons, `aria-role="list"` to session/file lists, `aria-label` to progress indicators, `aria-hidden` on decorative elements.
  - *Source*: Ink ARIA support.

- [ ] **EC-16 (6/10)** — **Kitty keyboard protocol**: Enable enhanced keyboard input via the kitty keyboard protocol. Ink 6.7.0 supports `kittyKeyboard: { mode: 'auto' }` for terminals that support it (kitty, WezTerm, Ghostty). This enables: distinguishing `Ctrl+I` from `Tab`, detecting `Shift+Enter`, key release events, `Super`/`Hyper` modifiers. Check if OpenTUI supports this natively or if we need to add detection.
  - *Source*: Ink kitty keyboard protocol.

- [ ] **EC-17 (5/10)** — **Incremental rendering**: Investigate OpenTUI's rendering pipeline for incremental updates (only redraw changed lines). Ink 6.7.0 added `incrementalRendering: true` to reduce flicker for frequently updating UIs. If OpenTUI doesn't support this natively, measure whether our current rendering has visible flicker during streaming and document findings.
  - *Source*: Ink incremental rendering.

---

### Scroll & Navigation Enhancements

- [ ] **EC-18 (7/10)** — **Configure scroll acceleration**: Our `ScrollArea` already accepts `scrollAcceleration` from OpenTUI but it's never configured. Add configurable scroll acceleration to `app-config.ts` and pass it through to `ScrollArea` in `MessageList`, `FileTree`, and sidebar panels. Default to a macOS-style curve. (Overlaps with DC-36.)
  - *Source*: OpenTUI `ScrollAcceleration`; tokscale fast-scroll pattern.

- [ ] **EC-19 (6/10)** — **Fast scroll shortcut**: Add `Option+scroll` (or `Shift+↑/↓`) for 10x fast scroll in message lists and file trees. critique uses this pattern for reviewing long diffs. Map to `pageUp`/`pageDown`-style jumps.
  - *Source*: critique (Option+scroll = 10x speed).

- [ ] **EC-20 (5/10)** — **Gradient text for branding**: Use `gradient-string` for the ASCII banner and app title. [ink-gradient](https://github.com/vadimdemedes/ink-gradient) shows the pattern. Apply a subtle gradient to `AsciiBanner` for visual polish. Low priority but high visual impact for first impressions.
  - *Source*: ink-gradient.

---

### Priority Summary Table

| Priority | Task IDs | Focus |
|----------|----------|-------|
| **Critical (9)** | EC-1, EC-8 | Toast notifications, split-view diff |
| **High (7–8)** | EC-2, EC-3, EC-4, EC-5, EC-9, EC-10, EC-11, EC-13, EC-15, EC-18 | Dialog, spinner, table, confirm, diff UX, tabs, pilotty, ARIA, scroll |
| **Medium (5–6)** | EC-6, EC-7, EC-12, EC-14, EC-16, EC-17, EC-19, EC-20 | Virtual list, form, sparkline, testing, keyboard, rendering, gradient |

### Relationship to Existing Tasks

| New Task | Overlaps With | Notes |
|----------|---------------|-------|
| EC-8 | DC-37 | Split-view is the "auto" diff style from DC-37 |
| EC-18 | DC-36 | Scroll acceleration; same goal, different source |
| EC-6 | OT-3 | Scroll/list performance; virtualization goes further |
| EC-15 | — | New: accessibility not previously tracked |
| EC-5 | DC-13 | Confirm component supports "always allow" pattern |

---

*Last Updated: 2026-02-12*
*Sources: PLAN2.md (incomplete tasks) · MAGIC_LITERALS_TASKS.md · OpenTUI audit (Addendum E) · Competitive Inspiration (Addendum F) · Code quality audit (Addendum G) · Deep competitive review (Addendum H) · Ecosystem audit (Addendum I)*

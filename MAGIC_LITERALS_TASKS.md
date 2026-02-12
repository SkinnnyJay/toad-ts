# Magic Literals – Phased Tasks

Phases and checklists for remediating magic literals in `src/`. Update the change log at the bottom on each run.

---

## Phase 1: Block New Slop (lint + patterns)

- [ ] Ensure `scripts/check-magic-literals.ts` runs in CI (e.g. `bun run check:literals:strict`).
- [ ] Add patterns for `getEnvironment() === "test"`, `process.platform === "win32"`, and `.toLowerCase() === "true"` to detection script.
- [ ] Document allowed exceptions (ACP, marked) in script comments and in `.cursorrules`.
- [ ] Owner: ___________

---

## Phase 2: Centralize Domains

- [ ] **Env values:** Add `src/constants/env-values.ts` with `ENV_VALUE = { TEST: "test", ... } as const`.
- [ ] **Platform:** Ensure `PLATFORM` from `platform.ts` is the single source for darwin/win32/linux.
- [ ] **Provider stream:** Add `src/constants/provider-stream.ts` (or under `constants/`) for "[DONE]", "stop", "content_block_delta", "text_delta", "thinking_delta", "message_stop".
- [ ] **Permission wildcard:** Add `PERMISSION_PATTERN.WILDCARD = "*"` (or similar) in `permission-patterns.ts`.
- [ ] **Command palette row types:** Add `COMMAND_PALETTE_ROW_TYPE.SECTION_HEADER` / `COMMAND` in new or existing constants file.
- [ ] **Terminal names:** Add constants for "iTerm.app", "WezTerm" if used elsewhere; else keep local with comment.
- [ ] **Config placeholders:** Add `CONFIG_PLACEHOLDER.FILE = "$FILE"` (or in code-formatter config).
- [ ] **Limits/timeouts:** Add missing entries to `config/limits.ts` and `config/timeouts.ts` (cleanup interval, prompt TTL, integrity window, listAgents limit, input history size, clipboard debounce, LSP/beads timeout, rotate interval).
- [ ] Owner: ___________

---

## Phase 3: Replace Usage (codemod-friendly order)

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
- [ ] Owner: ___________

---

## Phase 4: Lock In (tests + CI)

- [ ] All new constant modules have types exported and used in Zod/domain where relevant.
- [ ] Run `bun run check:literals:strict` and fix any remaining violations.
- [ ] Add or update CI step to run `check:literals:strict` on every PR.
- [ ] Add unit tests for constant modules where behavior depends on literal values (e.g. env checks, platform).
- [ ] Owner: ___________

---

## Change log

- 2026-02-12: Initial audit of `src/`; findings added to todo list and MAGIC_LITERALS_REPORT.md.

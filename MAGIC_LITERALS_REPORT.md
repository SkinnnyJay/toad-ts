# Magic Literals Report – src/

**Scope:** `src/` (folder mode)  
**Date:** 2026-02-12

## Summary

Audit of `src/` for magic numbers, loose strings in control flow, and duplicated literals. The codebase already has strong centralization in `src/constants/` and `.cursorrules` allow external protocol types (ACP, marked). Remaining issues are mostly: raw env/platform/UI literals, a few magic numbers outside config, and error message strings.

## Ratings (0–100, letter grade)

| Category | Score | Grade |
|----------|--------|-------|
| **Literal Hygiene** | 18/25 | B |
| **Type Safety of Literals** | 20/25 | B+ |
| **DRY Centralization** | 19/25 | B |
| **Enforcement and Guardrails** | 16/25 | C+ |
| **Total** | **73/100** | C+ |

## Top 5 Offenders & Stop-the-Bleeding

1. **getEnvironment() === "test"** (5 files) – Add `ENV_VALUE.TEST` and use it everywhere to avoid typos and allow reuse.
2. **process.platform === "win32"** (2 files) – `PLATFORM` exists in `src/constants/platform.ts`; use `PLATFORM.WIN32`.
3. **Key handler literal in Sidebar** – `key.name === "]"` should use `KEY_NAME` (add `RIGHT_BRACKET`).
4. **Provider stream literals** – "[DONE]", "stop", "content_block_delta", etc. scattered in openai/anthropic providers; centralize in a stream/API constants module.
5. **Magic numbers outside config** – e.g. listAgents `limit: 100`, MAX_HISTORY_SIZE 200, debounce 100ms, CLEANUP_INTERVAL_MS, DEFAULT_TTL_MS, timeouts 3000; move to `config/limits.ts` or `config/timeouts.ts`.

## Findings Table

| Literal | Kind | Count | Where | Severity | Problem | Fix | Proposed Home |
|---------|------|-------|--------|----------|---------|-----|----------------|
| `"]"` | UI/key | 1 | Sidebar.tsx | High | Raw key name | Add KEY_NAME.RIGHT_BRACKET | key-names.ts |
| `"test"` (env) | STATUS | 5 | shell-session, sqlite-provider, session-stream, diff-worker-client, question | High | Loose env check | ENV_VALUE.TEST | constants/env-values.ts (new) |
| `"win32"` | STATUS | 2 | hooks-config-generator, hook-ipc-server | High | PLATFORM exists | Use PLATFORM.WIN32 | platform.ts |
| state/decision strings | STATUS | 6+ | repo-workflow.ts | High | Control flow literals | Constants for merged/closed/open/approved/etc. | repo-workflow-status or new |
| `"system"` / `"result"` | EVENT/type | 2 | cursor-cli-connection.ts | Medium | Event type literals | Const map for event types | cursor-event-types or new |
| `"section-header"` / `"command"` | TYPE_LITERAL | 6+ | CommandPalette.tsx | Medium | Row type literals | COMMAND_PALETTE_ROW_TYPE | constants/command-palette.ts (new) |
| `"selection"` / `"rewind"` | TYPE_LITERAL | 6+ | RewindModal.tsx | Medium | Kind literals | Use rewind-actions/checkpoint-direction | rewind-actions.ts |
| `"system"` (role) | STATUS | 2 | anthropic-provider.ts | Medium | MESSAGE_ROLE exists | Use MESSAGE_ROLE.SYSTEM | message-roles.ts |
| `"[DONE]"`, `"stop"`, etc. | EVENT | 8+ | openai*, anthropic* providers | High | Provider protocol literals | Stream/API constants | constants/provider-stream.ts (new) |
| `"reject_always"` / `"reject_once"` | STATUS | 2 | permissions.ts | High | PERMISSION_OPTION_KIND exists | Use constant | permission-option-kinds.ts |
| `"/help"` | ROUTE | 1 | StatusFooter.tsx | Low | Panel key | SLASH_COMMANDS.HELP or server path | slash-commands.ts |
| `"*"` (pattern) | REGEX/pattern | 2 | permission-modes, skill-permissions | Medium | Wildcard literal | PERMISSION_PATTERN.WILDCARD or similar | permission-patterns.ts |
| `"$FILE"` | UI_COPY/config | 1 | code-formatter.ts | Medium | Placeholder literal | CONFIG_PLACEHOLDER.FILE | config or constants |
| `".env.sample"` | STORAGE_KEY | 1 | init-generator.ts | Low | PROJECT_FILES exists | PROJECT_FILES.ENV_SAMPLE | project-files.ts |
| `"settings.json"` | STORAGE_KEY | 1 | hooks-loader.ts | Low | Config file name | Config constant | config-files.ts |
| `"/dev/null"` | FILE_PATH | 1 | patch.ts | Low | Sentinel path | FILE_PATHS or constants | file-paths.ts |
| `"true"` (alwaysMatch) | BOOLEAN_STRING | 1 | universal-loader.ts | Low | BOOLEAN_STRINGS exists | BOOLEAN_STRINGS.TRUE | boolean-strings.ts |
| `"iTerm.app"` / `"WezTerm"` | UI_COPY | 2 | image-renderer.ts | Medium | Terminal names | TERMINAL_NAME or similar | constants/terminal.ts (new) |
| `"http"` (transport) | ROUTE/type | 1 | cursor-cli-harness.ts | Low | Transport type | Constant | harness or cursor constants |
| `"agent"`/`"plan"`/`"ask"` | STATUS | 2 files | cursor-cli-agent-port, cli-agent.base | Medium | Mode literals | Use focus-target or sidebar-tabs | focus-target.ts |
| `".svg"` | UI_COPY | 1 | slash-command-actions.ts | Low | image-extensions exists | Use constant | image-extensions.ts |
| `".json"` | UI_COPY | 1 | theme-loader.ts | Low | Extension literal | Constant | config-files or format-modes |
| `"true"`/`"yes"`/`"1"` | BOOLEAN_STRING | 3 | cli-output-parser.ts | Medium | BOOLEAN_STRINGS exists | Use TRUTHY_STRINGS or BOOLEAN_STRINGS | boolean-strings.ts |
| `"Payload too large."` | ERROR | 1 | hook-ipc-server.ts | Medium | Error message | Error message constant | error-codes or agent-management-error-messages |
| `"No harnesses configured."` | ERROR | 1 | useSessionHydration.ts | Medium | Duplicate of harnessConfig | Use shared constant | harnessConfig or error messages |
| `.toLowerCase() === "true"` | BOOLEAN_STRING | 2 | ui-symbols, update-check | Low | BOOLEAN_STRINGS.TRUE | Helper or constant | boolean-strings.ts |
| `100` (listAgents limit) | MAGIC_NUMBER | 2 | SlashCommandHandler, App.tsx | Medium | Pagination limit | LIMIT.CLOUD_AGENTS_LIST or similar | config/limits.ts |
| `200` (MAX_HISTORY_SIZE) | MAGIC_NUMBER | 1 | useInputHistory.ts | Medium | Limit | LIMIT.INPUT_HISTORY | config/limits.ts |
| `100` (debounce ms) | MAGIC_NUMBER | 1 | useClipboardPaste.ts | Medium | Timeout | TIMEOUT or config | config/timeouts.ts |
| `60*60*1000` | MAGIC_NUMBER | 1 | background-cleanup.ts | Medium | Interval | CLEANUP_INTERVAL_MS in config | config/timeouts.ts |
| `5*60*1000` | MAGIC_NUMBER | 1 | prompt-cache.ts | Medium | TTL | In timeouts | config/timeouts.ts |
| `7*24*60*60*1000` | MAGIC_NUMBER | 1 | integrity-check.ts | Medium | Retention window | LIMIT or config | config/limits.ts |
| `200` (slice) | MAGIC_NUMBER | 1 | prompt-suggestions.ts | Low | LIMIT.STRING_TRUNCATE_LONG exists | Use LIMIT | limits.ts |
| `3000` (timeout) | MAGIC_NUMBER | 2 | lsp-client, beads-integration | Medium | Exec timeout | Config constant | config/timeouts.ts |
| `10*60*1000` | MAGIC_NUMBER | 1 | useRandomFact.ts | Low | Rotate interval | Config | config/limits or timeouts |
| ACP block types | TYPE_LITERAL | 5 | session-stream.ts | Low | Allowed external (ACP) | Document only | — |
| ACP tool statuses | TYPE_LITERAL | 3 | session-stream-mappers.ts | Low | Allowed external (ACP) | Document only | — |
| marked token types | TYPE_LITERAL | many | markdownStrategy.ts | Low | Allowed external (marked) | Document only | — |
| throw new Error("...") | ERROR | 40+ | many files | Medium | Scattered messages | Centralize in error-codes/messages | error-codes.ts + messages |

## Recommendations

- **Phase 1:** Use existing `scripts/check-magic-literals.ts` in CI; add env/platform/boolean literal patterns to script and run `check:literals:strict` in quality gate.
- **Phase 2:** Add `constants/env-values.ts` (ENV_VALUE.TEST), ensure PLATFORM used everywhere, add provider stream constants and permission wildcard constant.
- **Phase 3:** Replace usages file-by-file (keyboard → env/platform → providers → permissions → magic numbers → errors).
- **Phase 4:** Require `bun run check:literals:strict` to pass in CI; add unit tests for constant modules where valuable.

## Exceptions (documented, lower severity)

- **ACP SDK content block types** in `session-stream.ts`: `"text"`, `"resource_link"`, `"resource"`, `"image"`, `"audio"` – external protocol.
- **ACP SDK tool call statuses** in `session-stream-mappers.ts`: `"in_progress"`, `"completed"`, `"failed"` – external protocol.
- **marked library token types** in `markdownStrategy.ts` – external library; document in comment.
- **typeof x === "string"** and similar – JavaScript built-ins, acceptable.

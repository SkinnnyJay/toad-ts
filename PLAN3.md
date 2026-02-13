# Magic Literals Report – src/

**Scope:** `src/` (folder mode)  
**Date:** 2026-02-12

---

## Critical (fix first)

1. **Cursor CLI in default config but no adapter registered**  
   `defaultHarnessConfig.ts` includes a Cursor CLI harness (`cursor-cli`) in `harnesses`, and `useSessionHydration` builds `agentOptions` from that config. `App.tsx` and `headless-server.ts` only register Claude, Gemini, Codex, and Mock. Selecting "Cursor CLI" in the UI causes `harnessRegistry.get("cursor-cli")` to be undefined and shows "Harness adapter 'cursor-cli' not registered." **Fix:** Either (a) stop including Cursor in default config until the Cursor adapter exists (PLAN2 M7/M8), or (b) register a stub Cursor adapter that fails with a clear "Coming soon" message, and gate Cursor in default config behind a feature flag.

2. **scratchpad/plan.md missing**  
   `.cursorrules` say: "Read `scratchpad/plan.md` for current phase and tasks." The file does not exist (only `Plan0.md`, `PLAN1.md` exist under scratchpad). Current phase and task tracking are unclear. **Fix:** Add `scratchpad/plan.md` that points at PLAN2/PLAN3 and the current phase (e.g. "Phase 0 / M1 validation" or "Magic literals Phase 1"), or consolidate into one canonical plan file and update .cursorrules.

---

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

---

## Unfinished Tasks (from PLAN2 — Cursor CLI Harness)

Tasks below are unchecked items carried over from PLAN2.md Implementation Plan.

### Phase 0: Prerequisites (Complete Before Agent Starts)

**A. Git Hygiene (Critical)**

- [x] - P0-1 - Commit or stash all current changes (30+ modified files, 5+ untracked)
- [x] - P0-2 - Create feature branch: `git checkout -b feature/cursor-cli-harness`

**B. Environment Validation (M1 Blockers)**

- [x] - P0-3 - Verify `agent` binary installed: `which cursor-agent` or `which agent`
- [x] - P0-4 - Verify Cursor auth: `agent status` or `agent whoami` — capture output format
- [x] - P0-5 - Capture NDJSON fixture (simple prompt)
- [x] - P0-6 - Capture NDJSON fixture (tool use): Run a prompt that triggers file read/write tool calls
- [x] - P0-7 - Validate `--resume` across process invocations
- [x] - P0-8 - Validate `agent create-chat` → capture output, then test with `--resume <id>`
- [x] - P0-9 - Capture `agent models` output format → save to `__tests__/fixtures/cursor/models-output.txt`
- [x] - P0-10 - Capture `agent ls` output format → save to `__tests__/fixtures/cursor/ls-output.txt`
- [x] - P0-11 - Capture `agent status` output format → save to `__tests__/fixtures/cursor/status-output.txt`
- [x] - P0-12 - **CRITICAL — Architecture Decision**: Test hooks in `-p` (headless) mode

**C. Quality Gate Baseline**

- [x] - P0-13 - Run full quality gates and confirm green baseline
- [x] - P0-14 - Record any pre-existing failures (so they aren't attributed to new work)

**D. Fixture Directory Setup**

- [x] - P0-15 - Create fixture directories: `__tests__/fixtures/cursor/{ndjson,hooks,cloud-api}`

**E. Document Findings**

- [x] - P0-16 - Update `scratchpad/journal.md` with validation results
- [x] - P0-17 - If any open question yields a surprise, update the relevant milestone in this plan before starting

### Milestone 1: Research & Protocol Validation

- [x] - M1 - Validate `agent -p --output-format stream-json --stream-partial-output` locally
- [x] - M1 - Capture real NDJSON output samples for test fixtures
- [x] - M1 - Validate `--resume` across separate process invocations
- [x] - M1 - Validate `agent create-chat` returns usable ID
- [x] - M1 - Test hooks.json with a simple shim script
- [x] - M1 - Validate hook IPC latency (is Unix socket fast enough for real-time approval?)
- [x] - M1 - Test `agent models` output parsing
- [x] - M1 - Test `agent status` output parsing
- [x] - M1 - Test `agent ls` output parsing
- [x] - M1 - Test Cloud Agents API with `CURSOR_API_KEY`

### Milestone 2a: Zod Types & Stream Event Schemas (Types Only)

- [x] - M2a - Create `src/types/cli-agent.types.ts` — Generic CLI agent Zod schemas:
  - [x] - M2a - `CliAgentInstallInfoSchema` (binary name, path, version, installed flag)
  - [x] - M2a - `CliAgentAuthStatusSchema` (authenticated, method, email)
  - [x] - M2a - `CliAgentModelSchema` + `CliAgentModelsResponseSchema`
  - [x] - M2a - `CliAgentSessionSchema` (id, title, created, model, messageCount)
  - [x] - M2a - `CliAgentPromptInputSchema` (message, sessionId, model, mode, workspace, force, streaming)
  - [x] - M2a - `CliAgentPromptResultSchema` (text, sessionId, durationMs, toolCallCount)
  - [x] - M2a - `CliAgentCapabilitiesSchema` (feature flags: streaming, resume, modes, hooks, cloud, etc.)
  - [x] - M2a - `STREAM_EVENT_TYPE` constant + all `StreamEvent` schemas (discriminated union)
- [x] - M2a - Create `src/types/cursor-cli.types.ts` — Cursor-specific NDJSON Zod schemas:
  - [x] - M2a - `cursorSystemEvent` (system.init)
  - [x] - M2a - `cursorUserEvent` (user message echo)
  - [x] - M2a - `cursorAssistantEvent` (assistant message)
  - [x] - M2a - `cursorToolCallStartedEvent` (tool_call.started)
  - [x] - M2a - `cursorToolCallCompletedEvent` (tool_call.completed)
  - [x] - M2a - `cursorResultEvent` (result.success)
  - [x] - M2a - `cursorStreamEvent` (discriminated union of all Cursor events)
- [x] - M2a - Create `src/types/cursor-hooks.types.ts` — Hook event Zod schemas:
  - [x] - M2a - Common base fields schema (conversation_id, model, hook_event_name, etc.)
  - [x] - M2a - Input/output schemas for all 18 hook events
- [x] - M2a - Create `src/constants/cursor-event-types.ts` — NDJSON event type constants
- [x] - M2a - Create `src/constants/cursor-hook-events.ts` — Hook event name constants
- [x] - M2a - Unit tests for schema validation with real fixtures from P0 (>= 95% coverage)

### Milestone 2: Cursor Stream Parser (Channel 1)

- [x] - M2 - Create `src/types/cursor-cli.types.ts` — Zod schemas for all NDJSON events
  - [x] - M2 - `cursorSystemEvent` (system.init), `cursorUserEvent`, `cursorAssistantEvent`, `cursorToolCallStartedEvent`, `cursorToolCallCompletedEvent`, `cursorResultEvent`, `cursorStreamEvent` (discriminated union)
- [x] - M2 - Create `src/core/cursor/cursor-stream-parser.ts` — NDJSON line parser
- [x] - M2 - Handle partial line buffering (lines split across stdout chunks)
- [x] - M2 - Handle `--stream-partial-output` delta accumulation
- [x] - M2 - Emit typed events for each parsed Cursor event
- [x] - M2 - Error recovery for malformed JSON lines (log + skip)
- [x] - M2 - Implement streaming backpressure (pause parsing if downstream consumer is slow)
- [x] - M2 - Add configurable output size limit for accumulated text (default 50KB)
- [x] - M2 - Unit tests with real NDJSON fixtures (>= 95% coverage)

### Milestone 3: Cursor CLI Connection (Channel 1)

- [x] - M3 - Create `src/core/cursor/cursor-cli-connection.ts` — Process lifecycle manager
- [x] - M3 - Implement `spawn()` — Launch `agent -p` with correct flags
- [x] - M3 - Implement session tracking — Capture `session_id` from `system.init`
- [x] - M3 - Implement `--resume` support — Pass session ID on subsequent prompts
- [x] - M3 - Implement `createChat()` — Call `agent create-chat` for pre-created sessions
- [x] - M3 - Handle process exit codes and stderr capture
- [x] - M3 - Handle `CURSOR_API_KEY` and `--api-key` authentication
- [x] - M3 - Implement `verifyInstallation()` — Check `agent --version`
- [x] - M3 - Implement `verifyAuth()` — Run `agent status` and parse output
- [x] - M3 - Implement `listModels()` — Run `agent models` and parse output
- [x] - M3 - Implement `listSessions()` — Run `agent ls` and parse output
- [x] - M3 - Implement process group tracking (store PIDs of all spawned children)
- [x] - M3 - Kill entire process group on disconnect/SIGTERM (prevent orphaned processes)
- [x] - M3 - Handle Ctrl-C graceful shutdown (SIGINT → cleanup children → exit)
- [x] - M3 - Unit tests with mocked child processes (>= 95% coverage)

### Milestone 4: Protocol Translator (Channel 1 → AgentPort)

- [x] - M4 - Create `src/core/cursor/cursor-to-acp-translator.ts`
- [x] - M4 - Map `system.init` → connection state + capabilities
- [x] - M4 - Map `assistant` events → `SessionNotification` (agent_message_chunk)
- [x] - M4 - Map `assistant` partial deltas → streaming message chunks
- [x] - M4 - Map `tool_call.started` → tool use notification
- [x] - M4 - Map `tool_call.completed` → tool result notification
- [x] - M4 - Map `result.success` → prompt response resolution
- [x] - M4 - Map process errors → error events
- [x] - M4 - Handle tool type discrimination (readToolCall, writeToolCall, shellToolCall, etc.)
- [x] - M4 - Create constants in `src/constants/cursor-event-types.ts`
- [x] - M4 - Implement tool result truncation (configurable limit, default 50KB per result)
- [x] - M4 - Log warning when truncation occurs (include original size vs limit)
- [x] - M4 - Unit tests with fixture-based event sequences (>= 95% coverage)

### Milestone 5: Hook IPC Server (Channel 2)

- [x] - M5 - Create `src/core/cursor/hook-ipc-server.ts` — Unix socket / HTTP IPC server
- [x] - M5 - Define hook event Zod schemas for all hook input types:
  - [x] - M5 - `sessionStart`, `preToolUse`, `beforeShellExecution`, `beforeMCPExecution`, `beforeReadFile`, `afterFileEdit`, `afterAgentThought`, `afterAgentResponse`, `stop`, `subagentStart`/`subagentStop`, `postToolUse`/`postToolUseFailure`, common base fields
- [x] - M5 - Implement request routing (hook_event_name → handler)
- [x] - M5 - Implement permission request flow (preToolUse → TUI → response; timeout handling)
- [x] - M5 - Implement context injection flow (sessionStart → additional_context, env)
- [x] - M5 - Implement auto-continuation (stop → followup_message or empty)
- [x] - M5 - Cross-platform: Unix socket (macOS/Linux) + local HTTP fallback (Windows)
- [x] - M5 - Verify IPC server uses event-driven wake (NO setImmediate/setTimeout polling)
- [x] - M5 - Benchmark idle CPU usage of IPC server (target: <1% when waiting for hook events)
- [x] - M5 - Unit tests (>= 95% coverage)

### Milestone 6: Hooks Config Generator + Scripts (Channel 2)

- [x] - M6 - Create `src/core/cursor/hooks-config-generator.ts`
  - [x] - M6 - Generate hooks.json content based on TOADSTOOL config
  - [x] - M6 - Support project-level (`.cursor/hooks.json`) and user-level (`~/.cursor/hooks.json`)
  - [x] - M6 - Handle existing hooks.json (merge TOADSTOOL hooks with user hooks)
- [x] - M6 - Create hook shim script template (Node.js shim + Bash fallback shim; make executable)
- [x] - M6 - Implement `TOADSTOOL_HOOK_SOCKET` env var injection
- [x] - M6 - Implement hooks cleanup on disconnect (remove TOADSTOOL hooks, restore originals)
- [x] - M6 - Handle hook installation path resolution
- [x] - M6 - Unit tests (>= 95% coverage)

### Milestone 7: Cursor CLI Harness Adapter

- [x] - M7 - Create `src/core/cursor/cursor-cli-harness.ts` — `CursorCliHarnessAdapter` class
- [x] - M7 - Implement `connect()`: verify binary, verify auth, start Hook IPC server, install hooks.json + shims
- [x] - M7 - Implement `disconnect()`: kill child process, stop Hook IPC server, clean up hooks
- [x] - M7 - Implement `initialize()`: query models, return capabilities
- [x] - M7 - Implement `newSession()`: call `agent create-chat`, store for `--resume`
- [x] - M7 - Implement `prompt()`: spawn `agent -p`, wire NDJSON parser + translator, handle hook IPC, resolve on result
- [x] - M7 - Implement `authenticate()`: check CURSOR_API_KEY or agent status; guide to `agent login` if needed
- [x] - M7 - Implement `sessionUpdate()` → No-op
- [x] - M7 - Wire EventEmitter for state, sessionUpdate, permissionRequest, error
- [x] - M7 - Handle concurrent prompt guard (one active prompt)
- [x] - M7 - Handle graceful shutdown (SIGTERM → cleanup)
- [x] - M7 - Unit tests (>= 95% coverage)

### Milestone 8: Harness Registration & Config

- [x] - M8 - Add constants to `src/constants/harness-defaults.ts`: CURSOR_CLI_ID, CURSOR_CLI_NAME, CURSOR_COMMAND
- [x] - M8 - Add env key constants: TOADSTOOL_CURSOR_COMMAND, TOADSTOOL_CURSOR_ARGS, CURSOR_API_KEY, TOADSTOOL_HOOK_SOCKET
- [x] - M8 - Create `cursorCliHarnessAdapter` export
- [x] - M8 - Register in `src/ui/components/App.tsx` and `src/server/headless-server.ts`
- [x] - M8 - Update harness config schema for Cursor-specific options (model, mode, force, sandbox, browser, approveMcps)
- [x] - M8 - Update `.env.sample` with `CURSOR_API_KEY`
- [x] - M8 - Update `harnesses.json` example documentation
- [x] - M8 - Add feature flag `TOADSTOOL_CURSOR_CLI_ENABLED` (default: false during beta)
- [x] - M8 - Gate Cursor CLI adapter registration behind feature flag in App.tsx and headless-server.ts
- [x] - M8 - Document feature flag in `.env.sample` and README

### Milestone 9: Cloud Agents API Client (Channel 3)

- [x] - M9 - Create `src/core/cursor/cloud-agent-client.ts`
- [x] - M9 - Implement `listAgents()`, `getAgent(id)`, `getConversation(id)`, `launchAgent(params)`, `addFollowup(id, prompt)`, `stopAgent(id)`, `deleteAgent(id)`, `getApiKeyInfo()`, `listModels()`, `listRepositories()`
- [x] - M9 - Zod schemas for all API responses
- [x] - M9 - Rate limiting with exponential backoff; ETag caching support
- [x] - M9 - Create constants for API URLs, endpoints, status values
- [x] - M9 - Unit tests with mocked HTTP (>= 95% coverage)

### Milestone 10: Integration Testing

- [x] - M10 - Create test fixtures (NDJSON sessions, hook event sequences, Cloud API responses)
- [x] - M10 - Integration test: full prompt → NDJSON stream → response (mocked process)
- [x] - M10 - Integration test: multi-turn with `--resume` + `create-chat`
- [x] - M10 - Integration test: hook IPC permission flow, context injection, auto-continuation
- [x] - M10 - Integration test: cloud agent launch → status polling → conversation
- [x] - M10 - Integration test: error handling (auth failure, binary not found, process crash)
- [x] - M10 - Integration test: graceful shutdown mid-stream; model + mode selection
- [x] - M10 - Optional: E2E test with real Cursor CLI (env-gated)

### Milestone 11: TUI Integration & Polish

- [x] - M11 - Agent selector UI shows "Cursor CLI" option
- [x] - M11 - Streaming messages render correctly in chat view
- [x] - M11 - Tool activity (read, write, shell, MCP) displays in sidebar
- [x] - M11 - Permission approval prompts display for hook events (preToolUse, beforeShellExecution)
- [x] - M11 - Thinking/reasoning display from `afterAgentThought` hooks
- [x] - M11 - File edit tracking from `afterFileEdit` hooks → diff display
- [x] - M11 - Model picker populated from `agent models` / Cloud API
- [x] - M11 - Mode switching (Agent/Plan/Ask) via TUI toggle
- [x] - M11 - Cloud agent panel (list, status, follow-up, stop)
- [x] - M11 - Cloud dispatch (`&` prefix or slash command)
- [x] - M11 - Auth error handler (guide to `agent login`)
- [x] - M11 - Missing binary handler (show install instructions)
- [x] - M11 - MCP management UI (list servers, enable/disable)
- [x] - M11 - Session browser (list from `agent ls`, resume)
- [x] - M11 - Status bar: model name, mode, cloud agent count
- [x] - M11 - Performance: measure process spawn overhead (target < 500ms per turn)
- [x] - M11 - Performance: measure hook IPC roundtrip (target < 50ms)
- [x] - M11 - Documentation: README with Cursor CLI setup instructions
- [x] - M11 - Build inline diff view from `afterFileEdit` hook data (`old_string`/`new_string` diffs)
- [x] - M11 - Integrate diff display with existing `DiffRenderer` component
- [x] - M11 - Run full quality gate: lint, typecheck, test, build

---

## Execution Log (2026-02-13)

- Added dual shim support in `src/core/cursor/hooks-config-generator.ts` (Node + Bash fallback),
  with executable permissions and restoration cleanup for both shim files, to improve runtime
  flexibility in environments where Node is unavailable in hook execution context.
- Added user-level hook installation support (`~/.cursor/hooks.json`) via install-scope path
  resolution in `HooksConfigGenerator`, improving portability between project-scoped and
  user-scoped Cursor workflows.
- Added plan-parity aliases in `src/core/cursor/cloud-agent-client.ts`:
  `addFollowup()`, `listRepositories()`, and `getApiKeyInfo()` to match checklist contracts and
  keep backwards-compatible existing methods.
- Improved server utility behavior in `src/server/api-routes.ts` by replacing `listAgents`
  placeholder response with resolved harness-config agent list output for headless/API consumers.
- Replaced hardcoded Claude-specific load error copy in `src/ui/components/App.tsx` with
  agent-agnostic wording for clearer multi-harness UX.
- Centralized `"No harnesses configured."` into
  `src/harness/harnessConfig.ts` constant and reused it from
  `src/ui/hooks/useSessionHydration.ts` to reduce string-coupling fragility.
- Replaced raw Windows platform literal usage in `src/core/cursor/hook-ipc-server.ts` with
  `PLATFORM.WIN32` constant for literal hygiene consistency.
- Updated and expanded tests to verify new behavior in:
  - `__tests__/unit/core/cursor/hooks-config-generator.unit.test.ts`
  - `__tests__/unit/core/cursor/cloud-agent-client.unit.test.ts`
  - `__tests__/unit/core/cursor/cursor-cli-harness.unit.test.ts`
  - `__tests__/integration/core/cursor-harness.integration.test.ts`
- Follow-up literal hygiene hardening pass:
  - Added `src/constants/env-values.ts` and replaced direct `"test"` environment comparisons.
  - Removed direct `process.env` reads from `src/core/image-renderer.ts` by using `EnvManager`
    snapshot + env-key constants.
  - Added `src/constants/terminal-programs.ts` for terminal program literals.
  - Replaced sidebar raw `"]"` key literal with `KEY_NAME.RIGHT_BRACKET`.
  - Added `__tests__/unit/core/image-renderer.unit.test.ts` coverage for inline image support logic.
- Additional permission-literal hardening:
  - Expanded `src/constants/permission-option-kinds.ts` with
    `REJECT_ONCE` and `REJECT_ALWAYS`.
  - Replaced raw reject-kind checks in `src/tools/permissions.ts`.
  - Replaced bridge option-kind literals in `src/core/cli-agent/cli-agent.bridge.ts`.
- Additional UI row-kind literal hardening:
  - Added `src/constants/command-palette-row-types.ts`.
  - Added `src/constants/rewind-modal-option-kinds.ts`.
  - Replaced raw row/option discriminator strings in:
    - `src/ui/components/CommandPalette.tsx`
    - `src/ui/components/RewindModal.tsx`
- Additional wildcard/boolean/footer literal hardening:
  - Added `WILDCARD` to `src/constants/permission-patterns.ts`.
  - Replaced raw `"*"` checks in:
    - `src/core/permission-modes.ts`
    - `src/core/cross-tool/skill-permissions.ts`
  - Replaced `.toLowerCase() === "true"` checks with `BOOLEAN_STRINGS.TRUE` in:
    - `src/utils/update-check.ts`
    - `src/constants/ui-symbols.ts`
  - Replaced footer raw `"/help"` shortcut key with `SLASH_COMMAND.HELP`.
  - Added focused tests:
    - `__tests__/unit/core/skill-permissions.unit.test.ts`
    - `__tests__/unit/constants/ui-symbols.unit.test.ts`
- Additional provider stream literal hardening:
  - Added `src/constants/provider-stream.ts` for SSE markers and provider stream event strings.
  - Replaced raw provider-stream literals in:
    - `src/core/providers/openai-provider.ts`
    - `src/core/providers/openai-compatible-provider.ts`
    - `src/core/providers/anthropic-provider.ts`
  - Added focused test:
    - `__tests__/unit/constants/provider-stream.unit.test.ts`
- Additional cross-tool/platform literal hardening:
  - Reused existing `SETTINGS_JSON` from `src/constants/file-paths.ts`.
  - Replaced raw `"settings.json"` usage in:
    - `src/core/cross-tool/hooks-loader.ts`
  - Replaced raw `".env.sample"` literal in:
    - `src/core/cross-tool/init-generator.ts`
  - Replaced raw `"win32"` platform checks in:
    - `src/core/cli-agent/cli-agent-process-runner.ts`
- Additional non-Cursor error-message consolidation hardening:
  - Added `src/constants/server-response-messages.ts` for shared server API response text.
  - Replaced raw server response/error literals in:
    - `src/server/headless-server.ts`
    - `src/server/api-routes.ts`
- Additional HTTP status and hook IPC hardening:
  - Added `HTTP_STATUS_METHOD_NOT_ALLOWED` to `src/config/limits.ts`.
  - Added `METHOD_NOT_ALLOWED` in `src/constants/http-status.ts`.
  - Replaced derived `NOT_FOUND + 1` status usage in:
    - `src/core/cursor/hook-ipc-server.ts`
  - Replaced hook IPC raw method-error text with:
    - `SERVER_RESPONSE_MESSAGE.METHOD_NOT_ALLOWED`
  - Updated focused test:
    - `__tests__/unit/constants/http-status.unit.test.ts`
- Additional truthy-env literal hardening:
  - Replaced duplicated allow-escape truthy checks with `TRUTHY_STRINGS` in:
    - `src/core/fs-handler.ts`
    - `src/core/search/search-service.ts`
    - `src/core/terminal-handler.ts`
- Additional harness error-message hardening:
  - Added `src/harness/harness-error-messages.ts` for shared harness error formatting.
  - Replaced duplicated harness error strings in:
    - `src/agents/subagent-runner.ts`
    - `src/ui/hooks/useHarnessConnection.ts`
  - Added focused unit test:
    - `__tests__/unit/harness/harness-error-messages.unit.test.ts`
- Additional harness-config error hardening:
  - Extended `HARNESS_CONFIG_ERROR` with:
    - `NO_DEFAULT_HARNESS_CONFIGURED`
  - Replaced raw harness-config errors in `src/harness/harnessConfig.ts`:
    - `No default harness configured.` → `HARNESS_CONFIG_ERROR.NO_DEFAULT_HARNESS_CONFIGURED`
    - `Harness '<id>' not found.` → `formatHarnessNotFoundError(<id>)`
  - Extended harness error helper and test coverage:
    - `src/harness/harness-error-messages.ts` (`formatHarnessNotFoundError`)
    - `__tests__/unit/harness/harness-error-messages.unit.test.ts`
- Additional hook decision literal hardening:
  - Added `src/constants/hook-decision-keywords.ts` for allow/deny decision tokens.
  - Replaced raw decision strings in:
    - `src/hooks/hook-prompt-runner.ts`
  - Added focused test:
    - `__tests__/unit/constants/hook-decision-keywords.unit.test.ts`
- Additional harness config filename literal hardening:
  - Added `HARNESSES_JSON` to `src/constants/file-paths.ts`.
  - Replaced raw `"harnesses.json"` usage in:
    - `src/harness/harnessConfig.ts`
    - `__tests__/unit/harness/harness-config.unit.test.ts`
- Additional cursor event/mode literal hardening:
  - Replaced raw Cursor stream event type literals in:
    - `src/core/cursor/cursor-cli-connection.ts`
    - (`"system"`, `"result"` → `CURSOR_EVENT_TYPE.*`)
  - Replaced raw mode literal:
    - (`"agent"` → `CLI_AGENT_MODE.AGENT`) in `cursor-cli-connection.ts`
- Additional headless-server harness error deduplication:
  - Reused shared harness error formatters in:
    - `src/server/headless-server.ts`
  - Replaced:
    - `Unknown harness: <id>` → `formatHarnessNotConfiguredError(<id>)`
    - `No adapter registered for <id>` → `formatHarnessAdapterNotRegisteredError(<id>)`
- Additional server event literal hardening:
  - Added `STATE_UPDATE` to `src/constants/server-events.ts`.
  - Replaced raw `"state_update"` usage in:
    - `src/server/api-routes.ts` (`eventsStream`)
  - Expanded event schema coverage in:
    - `src/server/server-types.ts` (`serverEventSchema`)
  - Added focused test:
    - `__tests__/unit/constants/server-events.unit.test.ts`
- Additional env-value literal hardening (remaining `"test"` checks):
  - Replaced raw environment string comparisons in:
    - `src/store/persistence/sqlite-provider.ts`
    - `src/core/session-stream.ts`
  - (`"test"` → `ENV_VALUE.TEST`)
- Additional cross-tool boolean literal hardening:
  - Replaced raw `"true"` comparison in Cursor rules parser:
    - `src/core/cross-tool/universal-loader.ts`
  - (`alwaysMatch?.[1] === "true"` → `alwaysMatch?.[1] === BOOLEAN_STRINGS.TRUE`)
- Additional timeout literal hardening:
  - Added timeout constants in `src/config/timeouts.ts`:
    - `COMMAND_DISCOVERY_MS`
    - `BEADS_COMMAND_MS`
  - Replaced raw command timeout literals in:
    - `src/core/lsp-client.ts`
    - `src/core/beads-integration.ts`
- Additional GitHub CLI timeout literal hardening:
  - Added `GH_CLI_MS` in `src/config/timeouts.ts`.
  - Replaced raw `10_000` GH command timeouts in:
    - `src/core/repo-workflow.ts`
    - `src/core/pr-status.ts`
- Additional PR status test hardening:
  - Added focused unit coverage for `src/core/pr-status.ts`:
    - `__tests__/unit/core/pr-status.unit.test.ts`
  - Covered:
    - `gh pr view` parsing normalization
    - missing PR payload fallback (`null`)
    - command failure fallback (`null`)
    - status-color mapping behavior

---

## Code & Plan Review: 15 Fixes/Improvements by Severity

Review of the codebase and PLAN2/PLAN3 against .cursorrules and project goals. Categorized by severity.

### Critical

1. **Cursor CLI in default config but no adapter registered**  
   `defaultHarnessConfig.ts` includes a Cursor CLI harness (`cursor-cli`) in `harnesses`, and `useSessionHydration` builds `agentOptions` from that config. `App.tsx` and `headless-server.ts` only register Claude, Gemini, Codex, and Mock. Selecting "Cursor CLI" in the UI causes `harnessRegistry.get("cursor-cli")` to be undefined and shows "Harness adapter 'cursor-cli' not registered." **Fix:** Either (a) stop including Cursor in default config until the Cursor adapter exists (PLAN2 M7/M8), or (b) register a stub Cursor adapter that fails with a clear "Coming soon" message, and gate Cursor in default config behind a feature flag.

2. **scratchpad/plan.md missing**  
   `.cursorrules` say: "Read `scratchpad/plan.md` for current phase and tasks." The file does not exist (only `Plan0.md`, `PLAN1.md` exist under scratchpad). Current phase and task tracking are unclear. **Fix:** Add `scratchpad/plan.md` that points at PLAN2/PLAN3 and the current phase (e.g. "Phase 0 / M1 validation" or "Magic literals Phase 1"), or consolidate into one canonical plan file and update .cursorrules.

### High

3. **Direct `process.env` usage in `src/core/image-renderer.ts`**  
   `.cursorrules` and code-style rules: "Never read `process.env` directly (except in tests)." `supportsInlineImages()` uses `process.env.TERM_PROGRAM`, `process.env.TERM`, and `process.env.KITTY_PID`. **Fix:** Expose these via `Env` (or a small terminal-detection helper that uses Env) and use constants for `"iTerm.app"`, `"WezTerm"` (see PLAN3 Findings Table).

4. **Environment check literals `getEnvironment() === "test"` in 5 files**  
   `shell-session.ts`, `sqlite-provider.ts`, `session-stream.ts`, `diff-worker-client.ts`, `question.ts` use a raw `"test"` string. PLAN3 recommends `ENV_VALUE.TEST`. **Fix:** Add `src/constants/env-values.ts` with `ENV_VALUE = { TEST: "test", ... }` and use it everywhere to avoid typos and centralize env values.

5. **`process.platform === "win32"` instead of `PLATFORM.WIN32`**  
   PLAN3: two files (hooks-config-generator, hook-ipc-server) use raw `"win32"` while `src/constants/platform.ts` defines `PLATFORM`. **Fix:** Use `PLATFORM.WIN32` (and any other `platform.ts` constants) in those files for consistency and guardrails.

6. **Generic error copy: "Check that Claude CLI is installed"**  
   In `App.tsx`, when `loadError` is set, the fallback text says "Check that Claude CLI is installed and accessible" regardless of selected agent (Gemini, Codex, Cursor). **Fix:** Use the selected agent name (e.g. from `selectedAgent?.name`) or a generic line like "Check that the agent CLI is installed and accessible."

7. **"No harnesses configured." duplicated**  
   Thrown in `harnessConfig.ts` and compared as a string in `useSessionHydration.ts`. PLAN3: use a shared constant. **Fix:** Add an error message constant (e.g. in `constants/error-messages.ts` or `harnessConfig.ts`) and use it in both places so message and comparison stay in sync.

### Medium

8. **Magic numbers outside config**  
   PLAN3 and .cursorrules: move magic numbers to `config/limits.ts` or `config/timeouts.ts`. Examples: `useInputHistory.ts` has `MAX_HISTORY_SIZE = 200`; `background-cleanup.ts` has `CLEANUP_INTERVAL_MS = 60*60*1000`; `prompt-cache.ts` and `integrity-check.ts` have TTL/retention literals; `useClipboardPaste.ts` debounce 100ms; lsp-client/beads 3000ms timeout; `useRandomFact.ts` 10*60*1000. **Fix:** Add `LIMIT.INPUT_HISTORY`, `TIMEOUT.CLEANUP_INTERVAL_MS`, and other needed entries to `src/config/limits.ts` and `src/config/timeouts.ts`, then use them in code.

9. **Key handler literal in Sidebar**  
   `Sidebar.tsx` uses `key.name === "]"` for bracket navigation. PLAN3: add `KEY_NAME.RIGHT_BRACKET` to `key-names.ts`. **Fix:** Add `RIGHT_BRACKET: "]"` (and optionally `LEFT_BRACKET: "["` if used elsewhere) to `KEY_NAME` and use it in Sidebar.

10. **Permission option literals in `permissions.ts`**  
    `permissions.ts` uses `option.kind === "reject_always" || option.kind === "reject_once"` while `permission-option-kinds.ts` only exports `ALLOW_ONCE`/`ALLOW_ALWAYS`. **Fix:** Add `REJECT_ONCE` and `REJECT_ALWAYS` to `PERMISSION_OPTION_KIND` (if they are part of the domain) and use them in `selectOption` so control flow uses constants.

11. **Provider stream literals**  
    PLAN3: "[DONE]", "stop", "content_block_delta", etc. are scattered in OpenAI/Anthropic providers. **Fix:** Add `constants/provider-stream.ts` (or similar) with stream/API constants and use them in providers for consistency and easier protocol changes.

12. **Server `listAgents` returns empty array**  
    `src/server/api-routes.ts` has `listAgents` returning `{ agents: [] }`. PLAN2 M9 covers Cloud Agents API; until then this is a stub. **Fix:** Either document that this is intentionally empty until Cloud API is implemented, or return agents derived from harness config (e.g. configured harness list) so the endpoint is useful for IDE integration.

### Low

13. **Scattered `throw new Error("...")` messages**  
    PLAN3: 40+ files with inline error strings. **Fix:** Phase centralization in `error-codes.ts` + error message constants; start with high-traffic paths (harness, session, persistence) and permission/harness error strings.

14. **Literal hygiene and CI**  
    PLAN3 Phase 1: run `check:literals` (or `check:literals:strict`) in the quality gate; add env/platform/boolean patterns to `scripts/check-magic-literals.ts`. **Fix:** Wire `check:literals:strict` into pre-commit or CI and extend the script for the patterns above so regressions are caught.

15. **Simplify or document Cursor vs ACP**  
    Cursor CLI is not ACP-based; the default config presents it alongside ACP harnesses. **Fix:** Either remove Cursor from default config until M7/M8 (recommended in Critical #1), or add a short comment in `defaultHarnessConfig.ts` and README that "Cursor CLI" is listed for future use and requires the Cursor CLI harness implementation (PLAN2) to be functional.

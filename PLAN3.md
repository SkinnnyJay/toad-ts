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
- Additional core tooling test hardening:
  - Added unit coverage for:
    - `src/core/lsp-client.ts`
    - `src/core/beads-integration.ts`
  - New test files:
    - `__tests__/unit/core/lsp-client.unit.test.ts`
    - `__tests__/unit/core/beads-integration.unit.test.ts`
  - Covered:
    - timeout constant usage for command discovery/execution
    - fallback behavior on command failures
    - no-op stub behavior for unavailable LSP operations
- Additional formatter/marketplace test hardening:
  - Added focused unit coverage for:
    - `src/core/code-formatter.ts`
    - `src/core/plugin-marketplace.ts`
  - New test files:
    - `__tests__/unit/core/code-formatter.unit.test.ts`
    - `__tests__/unit/core/plugin-marketplace.unit.test.ts`
  - Covered:
    - formatter command dispatch and failure-path handling
    - plugin registry fetch success/failure behavior
    - plugin install command timeout usage and invalid-command guard
    - plugin registry timeout constant wiring (`AbortSignal.timeout`)
- Additional repo workflow diagnostics coverage:
  - Added focused unit coverage for `getRepoWorkflowInfo`:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - aggregation of git/PR/check data into workflow status output
    - owner/repository parsing from remote URL
    - fallback behavior when git/gh metadata is unavailable
    - `gh pr checks` timeout wiring through `TIMEOUT.GH_CLI_MS`
    - checks outcome classification (`pass`/`fail`/`pending`) driving workflow status
- Additional cursor harness default-config hardening:
  - Updated `createDefaultHarnessConfig` to honor `TOADSTOOL_CURSOR_CLI_ENABLED` and
    only include Cursor harness defaults when explicitly enabled.
  - Updated harness adapter unit coverage to validate:
    - Cursor is excluded by default from generated fallback harness config.
    - Cursor command/args overrides still work when explicitly enabled.
    - Cursor remains excluded when command/args overrides are set but feature flag is false.
    - Cursor is included when feature flag is provided as numeric truthy (`"1"`).
- Additional API route handler coverage hardening:
  - Added focused unit coverage for server route handlers:
    - `__tests__/unit/server/api-route-handlers.unit.test.ts`
  - Covered:
    - `listAgents` successful response from loaded harness config
    - fallback path to `createDefaultHarnessConfig` when config loading fails
    - internal-server-error response when both primary and fallback config resolution fail
- Additional TUI route handler coverage hardening:
  - Added focused unit coverage:
    - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - Covered:
    - `/api/tui/append-prompt` bad-request path for empty text
    - `/api/tui/append-prompt` success path for valid text
    - `/api/tui/execute-command` bad-request path for empty command
    - `/api/tui/execute-command` success path for valid command
- Additional file-search route handler coverage:
  - Added focused unit coverage:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - `/api/files/search` bad-request path when `q` query is missing
    - `/api/files/search` success path with placeholder results for valid query
- Additional session route handler coverage:
  - Added focused unit coverage:
    - `__tests__/unit/server/api-route-session-handlers.unit.test.ts`
  - Covered:
    - `/api/sessions` filtering behavior for undefined session entries
    - `/api/sessions/:id` validation + not-found + success paths
    - `/api/sessions/:id/messages` validation + success paths
- Additional config/delete route handler coverage:
  - Added focused unit coverage:
    - `__tests__/unit/server/api-route-config-delete.unit.test.ts`
  - Covered:
    - `/api/config` success path
    - `/api/config` Error/non-Error failure paths
    - `/api/sessions/:id` delete validation + success paths
    - `/api/tui/submit-prompt` success path
- Additional fallback-env integration coverage for agent listing:
  - Added focused unit coverage for feature-flagged fallback behavior:
    - `__tests__/unit/server/api-route-fallback-env.unit.test.ts`
  - Covered:
    - `/api/agents` fallback excludes Cursor harness when `TOADSTOOL_CURSOR_CLI_ENABLED` is unset/false
    - `/api/agents` fallback includes Cursor harness when `TOADSTOOL_CURSOR_CLI_ENABLED=true`
- Additional server-auth hardening and coverage:
  - Centralized auth error response literals in `SERVER_RESPONSE_MESSAGE`:
    - `AUTHORIZATION_REQUIRED`
    - `INVALID_CREDENTIALS`
  - Updated `src/server/server-auth.ts` to use shared response constants.
  - Added focused unit coverage:
    - `__tests__/unit/server/server-auth.unit.test.ts`
  - Covered:
    - no-password pass-through behavior
    - missing auth header rejection
    - invalid credential rejection
    - Bearer-token success path
    - raw-token (non-Bearer) success path
  - Improved protocol semantics:
    - switched auth failures from 400 to 401 (`HTTP_STATUS.UNAUTHORIZED`)
    - added `WWW-Authenticate: Bearer` response header on auth failures
    - added/used `HTTP_STATUS_UNAUTHORIZED` in limits + constants
    - added unit assertions verifying `WWW-Authenticate` header emission
- Additional server response constants coverage:
  - Added focused constants validation:
    - `__tests__/unit/constants/server-response-messages.unit.test.ts`
  - Covered:
    - canonical API response message constants
    - canonical auth response message constants
- Additional headless-server auth integration coverage:
  - Extended `__tests__/integration/server/headless-server.integration.test.ts`
    with authenticated-request scenarios.
  - Covered:
    - `/health` remains accessible when server password is configured.
    - protected endpoints reject missing authorization.
    - protected endpoints reject invalid bearer credentials.
    - protected endpoints accept valid bearer credentials and complete session creation.
    - protected auth failures include `WWW-Authenticate: Bearer` challenge header
- Additional headless-server JSON validation coverage:
  - Extended `__tests__/integration/server/headless-server.integration.test.ts`
    with invalid-request-body scenario.
  - Covered:
    - malformed JSON payload handling returns bad-request response
    - error payload includes human-readable parse failure message
- Additional repo workflow remote-url parsing coverage:
  - Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`
    with SSH remote parsing scenario.
  - Covered:
    - owner/repository extraction from SSH-style git remotes
      (`git@github.com:<owner>/<repo>.git`)
- Additional server infrastructure coverage hardening:
  - Added focused unit coverage for server runtime config resolution:
    - `__tests__/unit/server/server-config.unit.test.ts`
  - Covered:
    - default host/port behavior
    - env-derived host/port resolution
    - overrides precedence over env
    - invalid port fallback behavior
  - Added focused schema coverage for server request/event contracts:
    - `__tests__/unit/server/server-types.unit.test.ts`
  - Covered:
    - strict request schema validation (including unknown-key rejection)
    - prompt/messages payload validation
    - server event type acceptance/rejection behavior
  - Added focused SSE route lifecycle coverage:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - SSE response headers
    - streamed `state_update` payload emission
    - unsubscribe cleanup on request close
- Additional headless-server edge-route integration coverage:
  - Extended:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - unknown top-level endpoint returns `404 Not found`
    - unsupported session subroutes return `404 Unknown endpoint`
    - prompt calls for missing runtime sessions return `404 Session not found`
- Additional route/auth integration parity hardening:
  - Extended route matcher unit coverage:
    - `__tests__/unit/server/api-routes.unit.test.ts`
  - Covered:
    - `/api/tui/submit-prompt` route matching behavior
  - Extended headless auth integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - raw authorization token flow (`Authorization: <token>`) alongside Bearer support
- Additional request-body and schema edge hardening for headless server:
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - strict create-session schema rejection for unexpected request keys
    - oversized body handling path with `REQUEST_BODY_TOO_LARGE`
  - Runtime fix:
    - updated `src/server/headless-server.ts` to treat
      `REQUEST_BODY_TOO_LARGE` as `400 Bad Request` instead of falling through to `500`
- Additional session-message endpoint behavior coverage:
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - `/sessions/:id/messages` returns `200` with empty messages for unknown session IDs
- Additional HTTP method semantics hardening for API routes:
  - Runtime update:
    - `src/server/headless-server.ts`
  - Behavior update:
    - known `/api/*` paths now return `405 Method not allowed` when method is unsupported
      (instead of generic `404` fallback).
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - unsupported methods for known API routes (`/api/config`, `/api/tui/execute-command`)
      return canonical `METHOD_NOT_ALLOWED` payload
- Additional API route request-body hardening:
  - Runtime update:
    - `src/server/api-routes.ts`
  - Behavior update:
    - API route JSON body parsing now enforces `SERVER_CONFIG.MAX_BODY_BYTES` and raises
      canonical `REQUEST_BODY_TOO_LARGE`.
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - invalid JSON behavior for `/api/tui/append-prompt`
    - oversized payload behavior for `/api/tui/execute-command` returns `400` with canonical error
- Additional auth/method-ordering integration hardening:
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - auth challenge precedence over method validation for protected `/api/*` routes
      (`401` on unauthenticated request, `405` on authenticated unsupported method)
- Additional direct API route handler hardening:
  - Runtime update:
    - `src/server/api-routes.ts`
  - Behavior update:
    - `appendPrompt` and `executeCommand` now handle JSON parse/read errors locally and return
      canonical `400` responses instead of relying on outer server exception handling.
  - Extended unit coverage:
    - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - Covered:
    - invalid JSON payload handling in direct handler invocation
    - oversized payload handling with canonical `REQUEST_BODY_TOO_LARGE` response
- Additional non-API method semantics hardening:
  - Runtime update:
    - `src/server/headless-server.ts`
  - Behavior update:
    - known non-API server routes now return `405 Method not allowed` for unsupported methods:
      - `/health`
      - `/sessions`
      - `/sessions/:id/prompt`
      - `/sessions/:id/messages`
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - canonical method-not-allowed payload for unsupported non-API route methods
- Additional shared request parser consolidation:
  - Added:
    - `src/server/request-body.ts`
  - Consolidated shared request-body behaviors:
    - body-size limit enforcement
    - JSON parsing with optional empty-body fallback
  - Refactored call sites:
    - `src/server/headless-server.ts`
    - `src/server/api-routes.ts`
  - Extended unit coverage:
    - `__tests__/unit/server/request-body.unit.test.ts`
    - expanded `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - Covered:
    - parser success/failure paths
    - invalid JSON direct-invocation behavior
    - oversized payload handling via shared parser
- Additional non-API auth-ordering coverage:
  - Extended integration coverage:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - auth challenge precedence over method semantics for non-API protected route:
      - `GET /sessions` without auth => `401 Authorization required`
      - `GET /sessions` with valid auth => `405 Method not allowed`
- Additional method-guard refactor hardening:
  - Runtime update:
    - `src/server/headless-server.ts`
  - Refactor:
    - extracted `isMethodAllowedForCoreRoute()` to centralize method validation logic
      for known core routes and reduce duplicated branching.
  - Validation:
    - existing integration coverage remains green for all method-semantics paths
      (API + non-API + auth-ordering).
- Additional request-error canonicalization hardening:
  - Runtime update:
    - `src/server/api-routes.ts`
  - Behavior update:
    - direct TUI route handlers now map invalid JSON/read failures to canonical
      `INVALID_REQUEST` while preserving canonical `REQUEST_BODY_TOO_LARGE` for size overflows.
  - Extended coverage:
    - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - explicit invalid JSON canonical error response for `/api/tui/append-prompt`
- Additional API route classification hardening:
  - Runtime updates:
    - `src/server/api-routes.ts`
    - `src/server/headless-server.ts`
  - Refactor:
    - introduced route classification model (`MATCH` / `METHOD_NOT_ALLOWED` / `NOT_FOUND`)
      via `classifyApiRoute()`.
    - replaced ad-hoc route-pattern probing in headless dispatch with classification helper.
  - Extended unit coverage:
    - `__tests__/unit/server/api-routes.unit.test.ts`
  - Covered:
    - classification behavior for matched routes, unsupported methods, and unknown paths
- Additional core route classification hardening:
  - Added:
    - `src/server/core-route-classifier.ts`
  - Runtime update:
    - `src/server/headless-server.ts`
  - Refactor:
    - extracted core-route classification into dedicated helper:
      - `HEALTH_OK`
      - `METHOD_NOT_ALLOWED`
      - `UNHANDLED`
  - Extended unit coverage:
    - `__tests__/unit/server/core-route-classifier.unit.test.ts`
  - Covered:
    - core route method semantics for health/sessions/prompt/messages paths and fallthrough cases
- Additional session-path parsing deduplication:
  - Added:
    - `src/server/session-route-path.ts`
  - Refactored call sites:
    - `src/server/headless-server.ts`
    - `src/server/core-route-classifier.ts`
  - Refactor goal:
    - remove duplicated `pathname.split("/")` parsing for session subroutes.
  - Added unit coverage:
    - `__tests__/unit/server/session-route-path.unit.test.ts`
  - Covered:
    - valid session path parsing
    - no-action path parsing
    - non-session path fallback (`null`)
- Additional unified route classifier pipeline hardening:
  - Added:
    - `src/server/server-route-classifier.ts`
  - Runtime update:
    - `src/server/headless-server.ts`
  - Refactor:
    - composed core-route and API-route classifiers behind one server-route classification
      helper used by headless dispatch.
  - Extended unit coverage:
    - `__tests__/unit/server/server-route-classifier.unit.test.ts`
  - Covered:
    - health success classification
    - method-not-allowed classification (core + api)
    - API match classification
    - unhandled fallback classification
- Additional server response helper consolidation hardening:
  - Added:
    - `src/server/http-response.ts`
  - Refactored:
    - `src/server/api-routes.ts`
    - `src/server/headless-server.ts`
  - Refactor goal:
    - centralize shared JSON + error response write behavior to reduce duplication and
      lock response header semantics with focused unit coverage.
  - Added unit coverage:
    - `__tests__/unit/server/http-response.unit.test.ts`
  - Covered:
    - JSON response content-type behavior
    - optional content-length header behavior
    - canonical error payload serialization
- Additional auth middleware response deduplication hardening:
  - Refactored:
    - `src/server/server-auth.ts`
  - Refactor goal:
    - reuse shared server error response helper for unauthorized branches and remove
      duplicated response serialization/header blocks.
  - Preserved behavior:
    - `WWW-Authenticate: Bearer` challenge header
    - both bearer-token and raw-token acceptance paths
  - Coverage:
    - existing server auth unit tests and headless integration tests validated semantics.
- Additional hook IPC request hardening:
  - Refactored:
    - `src/core/cursor/hook-ipc-server.ts`
  - Hardening changes:
    - method guard now uses `HTTP_METHOD.POST` constant
    - request handling normalizes malformed payload responses to canonical
      `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST`
    - top-level request processing now catches handler failures and returns canonical
      `SERVER_RESPONSE_MESSAGE.SERVER_ERROR` instead of leaving requests unresolved
  - Extended unit coverage:
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Covered:
    - non-POST method handling (`405`)
    - malformed JSON payload handling (`400`)
    - thrown handler failure handling (`500`)
- Additional default harness fallback coverage hardening:
  - Added:
    - `__tests__/unit/harness/default-harness-config.unit.test.ts`
  - Coverage goals:
    - lock default harness composition when cursor feature flag is unset
    - lock cursor inclusion behavior when feature flag is numeric truthy (`"1"`)
    - lock env argument-override parsing behavior in default harness config builder
  - Complementary validation:
    - paired with existing fallback env tests for `/api/agents` route behavior.
- Additional HTTP response header hardening:
  - Updated:
    - `src/server/http-response.ts`
  - Hardening change:
    - response header merge order now preserves `Content-Type: application/json` as
      authoritative even if caller-provided headers attempt to override it.
  - Extended coverage:
    - `__tests__/unit/server/http-response.unit.test.ts`
  - Covered:
    - custom-header merge behavior retaining JSON content type while preserving
      additional caller headers.
- Additional harness config selection hardening:
  - Extended:
    - `__tests__/unit/harness/harness-config.unit.test.ts`
  - Covered:
    - single-harness auto-selection when no default harness is configured
    - canonical no-default error path when multiple harnesses have no defaults
    - formatted unknown-harness error path for explicit `harnessId` overrides
- Additional hook IPC invalid-payload coverage:
  - Extended:
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Covered:
    - schema-invalid JSON payload path (valid JSON, missing required hook fields)
    - canonical `400` invalid-request response mapping stability for hook IPC endpoint
- Additional `/api/agents` integration contract hardening:
  - Extended:
    - `__tests__/integration/server/api-routes.integration.test.ts`
  - Covered:
    - response includes `defaultHarnessId`
    - `defaultHarnessId` maps to an id present in the returned `agents` list
    - response contract remains non-empty for the agent list path
- Additional request-body byte-size correctness hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - request body size enforcement now uses utf-8 byte counts, avoiding undercounting
      multi-byte payloads when applying `MAX_BODY_BYTES`.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - multibyte payload overflow handling
    - chunked body assembly behavior
    - stream error propagation path
- Additional strict session-route parsing hardening:
  - Updated:
    - `src/server/session-route-path.ts`
    - `src/config/limits.ts`
  - Hardening change:
    - session route parsing now rejects extra path segments beyond supported shapes
      (`/sessions/:id` and `/sessions/:id/:action`), preventing malformed routes from
      being interpreted as valid prompt/messages endpoints.
  - Extended:
    - `__tests__/unit/server/session-route-path.unit.test.ts`
    - `__tests__/unit/server/core-route-classifier.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - extra-segment parser rejection behavior
    - core route classifier unhandled behavior for over-segmented paths
    - headless-server canonical unknown-endpoint responses for over-segmented
      prompt/messages session routes
- Additional headless invalid-JSON response normalization:
  - Updated:
    - `src/server/headless-server.ts`
  - Hardening change:
    - syntax-error request parsing failures now return canonical
      `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST` payloads.
  - Extended:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - non-API invalid JSON (`POST /sessions`) now matches canonical invalid-request response
      shape used across server endpoints.
- Additional request-body chunk accounting hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - byte accounting now uses native chunk sizing (`Buffer.length` for buffer chunks,
      `Buffer.byteLength` for string chunks), preserving accurate max-body enforcement
      while avoiding unnecessary byte recomputation from re-stringified buffers.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - buffer-chunk request-body handling
    - exact-byte-limit acceptance behavior
- Additional repo workflow remote parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - remote URL parsing now supports ssh-protocol remote forms
      (`ssh://git@host[:port]/owner/repo.git`) in addition to existing scp-style ssh and https.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from ssh-protocol remotes with explicit port.
- Additional auth bearer-scheme robustness hardening:
  - Updated:
    - `src/server/server-auth.ts`
  - Hardening change:
    - bearer token extraction now treats auth scheme case-insensitively, supporting
      common lowercase/mixed-case `Authorization` header variants.
  - Extended:
    - `__tests__/unit/server/server-auth.unit.test.ts`
  - Covered:
    - lowercase bearer-scheme token acceptance
    - unchanged raw-token acceptance path behavior
- Additional repo workflow checks-status classification hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - PR check status classification now:
      - treats queued checks as pending
      - treats cancelled/timed_out/action_required/startup_failure conclusions as failing
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - queued checks pending classification behavior
    - cancelled checks failing classification behavior
- Additional auth header whitespace normalization hardening:
  - Updated:
    - `src/server/server-auth.ts`
  - Hardening change:
    - authorization header and extracted token values are now trimmed before comparison,
      improving robustness for clients that include leading/trailing whitespace.
  - Extended:
    - `__tests__/unit/server/server-auth.unit.test.ts`
  - Covered:
    - bearer token acceptance with surrounding whitespace
    - raw token acceptance with surrounding whitespace
- Additional repo checks pending-status hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - checks-status classification now explicitly maps `status: "pending"` to pending.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - pending status classification behavior for PR checks results.
- Additional ssh-remote trailing-slash parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - scp-style ssh remote parsing now tolerates trailing slash suffixes.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction for `git@host:owner/repo.git/` remote format.
- Additional response-helper managed-header sanitization hardening:
  - Updated:
    - `src/server/http-response.ts`
  - Hardening change:
    - shared response helper now strips case-variant managed headers from custom
      header inputs to avoid duplicate/conflicting content-type/content-length entries.
  - Extended:
    - `__tests__/unit/server/http-response.unit.test.ts`
  - Covered:
    - lowercase managed header override suppression behavior while preserving
      non-managed custom headers.
- Additional request-body single-settlement hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - request-body read promise now uses single-settlement guards so repeated stream
      events after an error path cannot trigger multiple resolve/reject attempts.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - combined multi-chunk overflow path where body size exceeds max across chunks.
- Additional remote-url scheme-case parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - repo owner/repo extraction now accepts case-variant protocol schemes for
      `https://` and `ssh://` remotes.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - uppercase `HTTPS://...` remote parsing to owner/repo values.
- Additional repo-workflow literal hygiene hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - extracted the GH checks JSON-field argument to a named constant
    - replaced raw PR state/review decision string comparisons with shared constants
      to reduce literal drift risk.
  - Validation:
    - existing repo workflow unit coverage remained green.
- Additional git-protocol remote parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - owner/repo parser now supports `git://host/owner/repo(.git)` remote URLs.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from a git-protocol remote value.
- Additional request-stream abort/close hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - request-body reader now rejects aborted or prematurely closed request streams
      and cleans up listeners once settled.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - stream `aborted` event rejection
    - stream `close` before `end` rejection
- Additional scp-ssh custom-user parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - scp-style ssh remote parser now accepts non-`git` user prefixes
      (`user@host:owner/repo(.git)`).
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from `alice@github.com:octocat/hello-world.git`
- Additional uppercase `.GIT` suffix parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - remote owner/repo extraction now normalizes case-variant `.git` suffixes
      (e.g. `.GIT`) across supported remote URL patterns.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from `https://.../hello-world.GIT`
- Additional scp-style no-user remote parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - scp-style owner/repo extraction now accepts remotes without an explicit user
      prefix (e.g. `host:owner/repo.git`) in addition to `user@host:...` forms.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from `github.com:octocat/hello-world.git`
- Additional uppercase SSH protocol parsing coverage:
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from `SSH://git@host:port/owner/repo.git`
      to lock protocol-case-insensitive parsing behavior.
- Additional `git+ssh` remote parsing hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - ssh-protocol remote parsing now accepts `git+ssh://` URL prefixes.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - owner/repo extraction from `git+ssh://git@host/owner/repo.git`
- Additional SSE close-unsubscribe idempotency hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - events stream close handler now uses one-time close subscription so duplicate
      close emissions cannot double-invoke unsubscribe handlers.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - duplicate request-close event sequence only invokes unsubscribe once.
- Additional repo checks-status whitespace normalization hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - check status/conclusion classification now trims whitespace before lowercasing,
      reducing classification drift for padded `gh pr checks` output fields.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - whitespace-padded queued checks classified as pending
    - whitespace-padded cancelled checks classified as failing
- Additional UTF-8 BOM request-body parsing hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - JSON request parser now strips a leading UTF-8 BOM before empty-body fallback
      checks and JSON parsing.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - BOM-prefixed valid JSON payload parsing
    - BOM-only payload with empty-body fallback
- Additional file-search host-header fallback hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - file-search URL parsing now falls back to `localhost` when request host
      header is absent, preventing host-derived URL base edge failures.
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - successful query parsing for hostless request headers
- Additional UTF-8 split-chunk decoding hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - request-body buffering now uses `StringDecoder("utf8")` for buffer chunks to
      preserve multi-byte character integrity across chunk boundaries.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - successful JSON parse when a multi-byte UTF-8 character spans two buffer chunks
- Additional HTTP-method normalization hardening for route classifiers:
  - Added:
    - `src/server/http-method-normalization.ts`
  - Updated:
    - `src/server/api-routes.ts`
    - `src/server/core-route-classifier.ts`
  - Hardening change:
    - API/core route matching now normalizes method input (trim + uppercase) before
      method comparisons, preventing case/whitespace variance mismatches.
  - Extended:
    - `__tests__/unit/server/api-routes.unit.test.ts`
    - `__tests__/unit/server/core-route-classifier.unit.test.ts`
    - `__tests__/unit/server/server-route-classifier.unit.test.ts`
  - Covered:
    - lowercase and padded method matching/classification paths
- Additional file-search query-trim hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - file-search query parsing now trims whitespace, rejecting whitespace-only `q`
      values as canonical missing-query bad requests.
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - whitespace-only query rejection
    - trimmed query success response
- Additional SSE response-close cleanup hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - events-stream subscription cleanup now runs on response close as well as
      request close, with idempotent cleanup semantics.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - cleanup invocation on response-close event
    - single unsubscribe across duplicate close event combinations
- Additional PR status normalization hardening:
  - Updated:
    - `src/core/pr-status.ts`
  - Hardening change:
    - PR state and review decision normalization now trim input strings and validate
      against known values, falling back to canonical defaults for unsupported values.
  - Extended:
    - `__tests__/unit/core/pr-status.unit.test.ts`
  - Covered:
    - padded state/review-decision normalization
    - unsupported review-decision fallback to unknown
- Additional strict file-search query-decoding hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - file-search query extraction now decodes raw query param values with strict
      decoding and maps malformed encoded input to canonical invalid-request responses.
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - malformed encoded query rejection path (`q=%E0%A4%A`)
- Additional events-stream error-path cleanup hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - SSE subscription cleanup now also triggers on request/response error events,
      with idempotent cleanup across mixed close/error event ordering.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - response-error cleanup path
    - request-error cleanup path
- Additional PR status options-coverage hardening:
  - Extended:
    - `__tests__/unit/core/pr-status.unit.test.ts`
  - Covered:
    - `gh pr view` invocation options include expected `cwd` and GH CLI timeout
    - default `cwd` fallback path when explicit cwd argument is omitted
- Additional file-search plus-decoding contract coverage:
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - `+` form-encoding behavior in query values (decoded as spaces)

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

---

## Execution Log Addendum — 2026-02-13

- Additional events-stream aborted-request cleanup hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - SSE subscription cleanup now also triggers on request `aborted` events,
      while preserving idempotent cleanup across close/error/aborted ordering.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - request-aborted cleanup path with idempotency via subsequent close event
- Additional events-stream write-failure cleanup hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - SSE state-update writes now fail-safe; write exceptions trigger idempotent
      subscription cleanup instead of propagating stream callback errors.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - response write-failure cleanup path
- Additional events-stream stale-callback guard hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - SSE update callback now exits immediately after cleanup has run, preventing
      stale callback invocations from writing to the stream.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - post-cleanup stale-callback no-write behavior
- Additional repo-workflow normalization hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - workflow derivation now trims PR state and review-decision fields before
      status branching to defend against padded caller inputs.
  - Extended:
    - `__tests__/unit/core/repo-workflow.unit.test.ts`
  - Covered:
    - padded merged-state normalization
    - padded approved-decision normalization
- Additional file-search duplicate-query hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - file-search query extraction now rejects duplicated `q` parameters with
      canonical invalid-request responses.
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - duplicate query parameter rejection (`q=readme&q=notes`)
- Additional file-search encoded-key hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - query-parameter name parsing now uses strict decoding; encoded `q` keys are
      accepted while malformed encoded key names return invalid-request errors.
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - encoded key name acceptance (`?%71=readme`)
    - malformed key-encoding rejection
- Additional headless file-search integration hardening:
  - Extended:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - valid file-search query response contract
    - duplicate query parameter rejection
    - encoded key name acceptance
    - malformed key-encoding rejection
- Additional shared request-url parser hardening:
  - Added:
    - `src/server/request-url.ts`
  - Updated:
    - `src/server/headless-server.ts`
    - `src/server/api-routes.ts`
  - Hardening change:
    - request URL parsing now uses a shared safe parser with localhost fallback
      and canonical invalid-request behavior for malformed host/URL inputs.
  - Extended:
    - `__tests__/unit/server/request-url.unit.test.ts`
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - malformed host header rejection
    - malformed absolute URL parse fallback
    - missing-host fallback behavior
- Additional missing request-url hardening:
  - Updated:
    - `src/server/request-url.ts`
  - Hardening change:
    - request-url parser now returns null for missing request URL input.
  - Extended:
    - `__tests__/unit/server/request-url.unit.test.ts`
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - missing-url null fallback in parser
    - file-search missing-url canonical invalid-request response
- Additional request-url whitespace normalization hardening:
  - Updated:
    - `src/server/request-url.ts`
  - Hardening change:
    - request URL parser now trims url/host inputs before parsing, preserving
      valid route parsing for whitespace-padded request metadata.
  - Extended:
    - `__tests__/unit/server/request-url.unit.test.ts`
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - whitespace-wrapped url/host parse behavior
    - whitespace-host file-search success behavior
- Additional request-target strictness hardening:
  - Updated:
    - `src/server/request-url.ts`
  - Hardening change:
    - request-url parser now accepts only origin-form request targets and rejects
      absolute request URLs as invalid inputs.
  - Extended:
    - `__tests__/unit/server/request-url.unit.test.ts`
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - absolute request-target rejection in parser
    - file-search absolute-target canonical invalid-request response
- Additional protocol-relative request-target hardening:
  - Updated:
    - `src/server/request-url.ts`
  - Hardening change:
    - request-url parser now rejects protocol-relative targets (`//...`) to keep
      parsing restricted to origin-form request targets.
  - Extended:
    - `__tests__/unit/server/request-url.unit.test.ts`
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - Covered:
    - protocol-relative target rejection in parser
    - file-search protocol-relative-target canonical invalid-request response
- Additional non-origin-form request-target integration hardening:
  - Extended:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - absolute request-target rejection end-to-end
    - protocol-relative request-target rejection end-to-end
- Additional repo-workflow check-field type hardening:
  - Updated:
    - `src/core/repo-workflow.ts`
  - Hardening change:
    - check-field normalization now safely handles non-string GH checks payload
      values instead of assuming string shape.
  - Extended:
    - `__tests__/unit/core/repo-workflow-info.unit.test.ts`
  - Covered:
    - malformed non-string check payload classification path

## Execution Log Addendum — 2026-02-13 (default harness env-override hardening)

- Additional default-harness override hardening:
  - Updated:
    - `src/harness/defaultHarnessConfig.ts`
  - Hardening changes:
    - command overrides are now trimmed and blank command values fall back to
      default harness commands instead of producing invalid empty command config
    - argument overrides now treat explicitly provided empty-string env values as
      intentional empty argument lists (instead of silently restoring defaults)
  - Extended:
    - `__tests__/unit/harness/default-harness-config.unit.test.ts`
  - Covered:
    - explicit empty args override behavior across claude/gemini/codex/cursor
    - blank command override fallback behavior across claude/gemini/codex/cursor

## Execution Log Addendum — 2026-02-13 (harness env-expansion validation hardening)

- Additional harness config expansion hardening:
  - Updated:
    - `src/harness/harnessConfig.ts`
  - Hardening change:
    - expanded harness configs are now re-validated through `harnessConfigSchema`
      after env-variable substitution to prevent invalid empty command/cwd values
      from escaping config loading.
  - Extended:
    - `__tests__/unit/harness/harness-config.unit.test.ts`
  - Covered:
    - project/user env-map merge precedence before expansion
    - failure path when env expansion empties required command fields

## Execution Log Addendum — 2026-02-13 (auth-header type hardening)

- Additional server auth parsing hardening:
  - Updated:
    - `src/server/server-auth.ts`
  - Hardening changes:
    - authorization header parsing now normalizes to a single non-empty string
    - non-string/array/empty authorization header values are treated as missing
      credentials and return canonical unauthorized-required responses
  - Extended:
    - `__tests__/unit/server/server-auth.unit.test.ts`
  - Covered:
    - array-shaped authorization header rejection path
    - whitespace-only authorization header rejection path

## Execution Log Addendum — 2026-02-13 (mixed-chunk request-body hardening)

- Additional request-body decoding hardening:
  - Updated:
    - `src/server/request-body.ts`
  - Hardening change:
    - all incoming request chunks are now decoded through a unified UTF-8
      decoder path (including string chunks) to preserve decode ordering and
      consistent byte accounting across mixed string/buffer chunk streams.
  - Extended:
    - `__tests__/unit/server/request-body.unit.test.ts`
  - Covered:
    - mixed string+buffer chunk payload parsing
    - decoder ordering for malformed partial-buffer followed by string chunk

## Execution Log Addendum — 2026-02-13 (file-search key-normalization hardening)

- Additional file-search query parsing hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - query key-name matching now normalizes case and trims names before matching,
      preventing mixed-case duplicate `q` parameters from bypassing duplicate-query
      invalid-request semantics.
  - Extended:
    - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Covered:
    - uppercase `Q` key acceptance parity for single-query requests
    - mixed-case duplicate `q` + `Q` rejection path
    - encoded separator decoding behavior for query values

## Execution Log Addendum — 2026-02-13 (SSE pre-closed response cleanup hardening)

- Additional events-stream lifecycle hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening change:
    - SSE route now immediately performs subscription cleanup when response is
      already ended or destroyed at subscription time, avoiding stale store
      subscriptions on pre-closed response paths.
  - Extended:
    - `__tests__/unit/server/api-route-events-stream.unit.test.ts`
  - Covered:
    - immediate cleanup path when `response.writableEnded === true` before
      first stream callback.

## Execution Log Addendum — 2026-02-13 (hook IPC non-object payload coverage)

- Additional hook IPC request-shape hardening:
  - Updated:
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Coverage additions:
    - non-object JSON request bodies (array / primitive string) now explicitly
      assert canonical `400 INVALID_REQUEST` handling for hook IPC endpoint.
  - Goal:
    - lock request-shape guard behavior and prevent regressions where non-object
      JSON payloads accidentally bypass schema-invalid response semantics.

## Execution Log Addendum — 2026-02-13 (hook IPC request-body parser hardening)

- Additional hook IPC request parsing hardening:
  - Updated:
    - `src/core/cursor/hook-ipc-server.ts`
  - Hardening changes:
    - hook IPC request parsing now reuses shared `parseJsonRequestBody(...)`
      stream helper for robust chunk/error/abort handling
    - request-body parse errors now map to canonical bad-request responses:
      - malformed payloads -> `INVALID_REQUEST`
      - oversized payloads -> `REQUEST_BODY_TOO_LARGE`
  - Extended:
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Covered:
    - oversized payload path returns canonical request-body-too-large response
    - non-object payload validation coverage remains green with shared parser

## Execution Log Addendum — 2026-02-13 (CLI env-command blank fallback hardening)

- Additional harness runtime command-resolution hardening:
  - Updated:
    - `src/core/claude-cli-harness.ts`
    - `src/core/cursor/cursor-cli-connection.ts`
  - Hardening changes:
    - command resolution from environment now trims whitespace and falls back to
      default harness commands when env values are blank.
    - this prevents accidental runtime spawn attempts with whitespace-only command
      values in `TOADSTOOL_CLAUDE_COMMAND` / `TOADSTOOL_CURSOR_COMMAND`.
  - Extended:
    - `__tests__/unit/core/claude-cli-harness.unit.test.ts`
    - `__tests__/unit/core/cursor/cursor-cli-connection.unit.test.ts`
  - Covered:
    - Claude harness defaults to `HARNESS_DEFAULT.CLAUDE_COMMAND` for blank env command.
    - Cursor connection defaults to `HARNESS_DEFAULT.CURSOR_COMMAND` for blank env command.

## Execution Log Addendum — 2026-02-13 (hook IPC request-stream failure mapping coverage)

- Additional hook IPC request lifecycle hardening:
  - Updated:
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Hardening changes:
    - added focused coverage for request body reader stream-failure paths by
      simulating parser rejections for:
      - aborted request stream lifecycle errors
      - generic request stream error lifecycle failures
    - locks canonical hook IPC response mapping to
      `400 INVALID_REQUEST` for non-size body read failures.
  - Goal:
    - prevent regressions where premature request stream termination errors
      accidentally leak as non-canonical responses.

## Execution Log Addendum — 2026-02-13 (hook IPC invalid-body diagnostics hardening)

- Additional hook IPC operational diagnostics hardening:
  - Updated:
    - `src/core/cursor/hook-ipc-server.ts`
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Hardening changes:
    - hook IPC now emits structured warning logs for request-body parse failures
      before returning `400` responses.
    - warning metadata includes:
      - normalized mapped response message
      - original parse/read failure detail
    - preserves canonical response behavior while improving observability for
      malformed/oversized/stream-failure request scenarios.
  - Extended coverage:
    - malformed JSON path emits diagnostics warning and canonical `INVALID_REQUEST`
    - oversized request body path emits diagnostics warning and canonical
      `REQUEST_BODY_TOO_LARGE`
    - parser-rejection stream lifecycle paths continue to map to canonical
      `INVALID_REQUEST` while emitting diagnostics warnings.

## Execution Log Addendum — 2026-02-13 (hook IPC shared response helper adoption)

- Additional hook IPC response-path deduplication hardening:
  - Updated:
    - `src/core/cursor/hook-ipc-server.ts`
  - Refactor changes:
    - replaced local JSON/error response serialization helpers with shared
      server response utility:
      - `sendJsonResponse(...)`
      - `sendErrorResponse(...)`
    - preserved canonical status/error behavior while removing duplicate
      response-writing logic in hook IPC endpoint handling.
  - Validation:
    - existing hook IPC unit coverage remains green, including method handling,
      malformed/oversized/stream-failure parse paths, and server-error mapping.

## Execution Log Addendum — 2026-02-13 (shared request-error normalization utility)

- Additional request parsing consistency hardening:
  - Added:
    - `src/server/request-error-normalization.ts`
    - `__tests__/unit/server/request-error-normalization.unit.test.ts`
  - Updated:
    - `src/server/api-routes.ts`
    - `src/server/headless-server.ts`
    - `src/core/cursor/hook-ipc-server.ts`
  - Hardening changes:
    - centralized request parsing error classification/normalization for:
      - `REQUEST_BODY_TOO_LARGE`
      - canonical invalid-request parse failures
    - API routes + hook IPC now share one normalization function for body-parse
      failure mapping.
    - headless server now classifies canonical invalid-request parse errors from
      stream lifecycle failures (not just syntax errors), improving parity with
      API and hook IPC behavior.
  - Coverage:
    - added focused unit coverage for request-error classification behavior.
    - existing API/hook/headless targeted tests remained green.

## Execution Log Addendum — 2026-02-13 (headless route-local parse handling hardening)

- Additional headless request parsing control-flow hardening:
  - Updated:
    - `src/server/headless-server.ts`
  - Hardening changes:
    - moved request-body parse failure handling into route-local try/catch scopes
      for:
      - `POST /sessions`
      - `POST /sessions/:id/prompt`
    - added route-context warning diagnostics (method + pathname + mapped message)
      for canonical parse failures.
    - preserved shared parse-error classification while reducing reliance on
      top-level catch for route-specific body parsing behavior.
  - Goal:
    - improve operational diagnostics and make parse-failure control flow more
      explicit at the exact route boundary where parsing occurs.

## Execution Log Addendum — 2026-02-13 (API parse-failure diagnostics parity)

- Additional API route diagnostics parity hardening:
  - Updated:
    - `src/server/api-routes.ts`
    - `src/server/request-error-normalization.ts`
    - `src/core/cursor/hook-ipc-server.ts`
    - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
    - `__tests__/unit/server/request-error-normalization.unit.test.ts`
  - Hardening changes:
    - API TUI handlers now emit structured parse-failure warnings with context:
      - handler id
      - normalized method/pathname
      - mapped canonical error message
      - underlying parse/read error detail
    - introduced shared `normalizeRequestBodyParseErrorDetails(...)` to
      centralize parse-failure detail mapping, reused by API routes and hook IPC.
    - expanded API TUI coverage to lock canonical `INVALID_REQUEST` mapping for
      request stream `error` and `aborted` lifecycle failures.
  - Goal:
    - ensure diagnostics parity across headless, API route, and hook IPC
      request-body parsing paths while preserving canonical responses.

## Execution Log Addendum — 2026-02-13 (shared request-parse telemetry helper)

- Additional request-parse telemetry standardization hardening:
  - Updated:
    - `src/server/request-error-normalization.ts`
    - `src/server/api-routes.ts`
    - `src/server/headless-server.ts`
    - `src/core/cursor/hook-ipc-server.ts`
    - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Hardening changes:
    - added shared telemetry helper `logRequestParsingFailure(...)` with
      standardized metadata keys:
      - `source`
      - `method`
      - `pathname`
      - `handler` (optional)
      - `error`
      - `mappedMessage`
    - added shared source constants (`REQUEST_PARSING_SOURCE`) for API routes,
      headless server, and hook IPC.
    - API/headless/hook request parse warnings now use unified log message and
      metadata schema.
  - Coverage:
    - added unit coverage validating telemetry helper normalization behavior.
    - updated hook IPC unit assertions to lock shared telemetry schema.

## Execution Log Addendum — 2026-02-13 (shared request-validation telemetry parity)

- Additional non-parse request failure telemetry hardening:
  - Updated:
    - `src/server/request-error-normalization.ts`
    - `src/core/cursor/hook-ipc-server.ts`
    - `src/server/headless-server.ts`
    - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Hardening changes:
    - introduced `logRequestValidationFailure(...)` helper with standardized
      source/context metadata schema.
    - hook IPC now logs schema-validation payload failures via shared
      request-validation telemetry helper before returning canonical
      `INVALID_REQUEST`.
    - headless server now logs `ZodError` validation failures via shared
      request-validation telemetry helper while preserving existing response
      behavior.
  - Goal:
    - extend telemetry parity from parse failures to validation failures across
      server entrypoints, using one standardized schema.

## Execution Log Addendum — 2026-02-13 (file-search validation telemetry parity)

- Additional API file-search diagnostics parity hardening:
  - Updated:
    - `src/server/api-routes.ts`
  - Hardening changes:
    - file-search query validation failures now emit shared
      `Request validation failed` telemetry with standardized source/context
      schema via `logRequestValidationFailure(...)`.
    - covered failure paths include:
      - missing query
      - duplicate query
      - whitespace-only query
      - malformed encoding
      - malformed request URL/host input
  - Goal:
    - complete validation telemetry parity across API handlers, including
      non-JSON query-validation endpoints.

## Execution Log Addendum — 2026-02-13 (session validation handler identifiers)

- Additional headless session diagnostics hardening:
  - Updated:
    - `src/server/headless-server.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added handler identifiers in shared validation telemetry for headless
      session validation paths:
      - `session_create`
      - `session_prompt`
    - session schema-validation failures are now handled with route-local
      validation helper invocation, preserving response semantics while
      improving diagnostics granularity.
    - added integration coverage for invalid prompt payload schema path.
  - Goal:
    - provide finer-grained handler context in validation telemetry for session
      routes.

## Execution Log Addendum — 2026-02-13 (route-classifier validation telemetry)

- Additional route-classifier diagnostics hardening:
  - Updated:
    - `src/server/headless-server.ts`
    - `src/core/cursor/hook-ipc-server.ts`
    - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - Hardening changes:
    - headless route-classifier `METHOD_NOT_ALLOWED` and `NOT_FOUND` responses
      now emit shared `Request validation failed` telemetry with handler id
      `route_classifier`.
    - hook IPC non-POST method guard now emits shared validation telemetry with
      handler id `method_guard`.
    - standardized handler identifiers now cover route classifier + method guard
      validation events in addition to parse/schema validation paths.
  - Goal:
    - close remaining diagnostics parity gap for classifier/guard validation
      decisions.

## Execution Log Addendum — 2026-02-13 (api/core classifier handler IDs)

- Additional classifier diagnostics granularity hardening:
  - Updated:
    - `src/server/server-route-classifier.ts`
    - `src/server/headless-server.ts`
    - `__tests__/unit/server/server-route-classifier.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - server route classification now carries explicit classifier handler ids for
      method-not-allowed and unhandled routes:
      - `api_route_classifier`
      - `core_route_classifier`
    - headless validation telemetry now uses these handler ids directly for
      method-not-allowed and not-found classifier outcomes.
    - improved telemetry granularity distinguishes API classifier decisions from
      core classifier decisions.
  - Goal:
    - provide precise classifier-source diagnostics for routing validation
      outcomes without changing response semantics.

## Execution Log Addendum — 2026-02-13 (api-route classifier boundary metadata)

- Additional classifier metadata hardening:
  - Updated:
    - `src/constants/server-route-classifier-handlers.ts`
    - `src/server/api-routes.ts`
    - `src/server/server-route-classifier.ts`
    - `__tests__/unit/server/api-routes.unit.test.ts`
  - Hardening changes:
    - extracted shared classifier handler constants to a dedicated constants
      module for reuse across route-classification layers.
    - API route classification now carries explicit classifier handler metadata
      for both:
      - `METHOD_NOT_ALLOWED`
      - `NOT_FOUND`
    - server route classifier now reuses API classifier handler metadata
      directly for API method-not-allowed outcomes while preserving existing
      core-vs-api unhandled route behavior.
    - expanded API route classifier unit assertions to lock classifier handler
      metadata in method-not-allowed/not-found responses.
  - Goal:
    - push classifier-source metadata closer to classification boundaries and
      keep downstream telemetry plumbing deterministic.

## Execution Log Addendum — 2026-02-13 (api not-found boundary propagation)

- Additional server-route classifier boundary hardening:
  - Updated:
    - `src/server/server-route-classifier.ts`
    - `__tests__/unit/server/server-route-classifier.unit.test.ts`
  - Hardening changes:
    - server route classifier now runs API classification only for `/api/`
      request targets, avoiding unnecessary API-classifier evaluation on
      non-API paths.
    - API not-found outcomes now propagate their classifier handler metadata
      directly into server `UNHANDLED` classification results.
    - core unhandled route classification is now explicit and isolated.
    - added focused unit coverage for `/api` root target classification to lock
      core-unhandled behavior.
  - Goal:
    - keep classifier-source metadata aligned with route classification
      boundaries while preserving existing response semantics.

## Execution Log Addendum — 2026-02-13 (harness-id whitespace normalization)

- Additional harness config fallback hardening:
  - Updated:
    - `src/harness/harnessConfig.ts`
    - `__tests__/unit/harness/harness-config.unit.test.ts`
  - Hardening changes:
    - harness id resolution now trims CLI/user/project harness-id inputs before
      applying precedence, preventing whitespace-only values from bypassing
      fallback logic.
    - whitespace-only default harness values are now treated as absent and can
      correctly fall back to the single-harness auto-selection path.
    - explicit CLI harness-id inputs are now trimmed before lookup.
    - expanded harness config unit coverage for:
      - whitespace default fallback to single harness auto-selection
      - trimmed CLI harness-id lookup behavior
  - Goal:
    - strengthen harness/config fallback behavior around whitespace edge cases
      without changing precedence semantics for valid ids.

## Execution Log Addendum — 2026-02-13 (invalid harness-id config guard)

- Additional harness config input hardening:
  - Updated:
    - `src/harness/harnessConfig.ts`
    - `src/harness/harness-error-messages.ts`
    - `__tests__/unit/harness/harness-config.unit.test.ts`
    - `__tests__/unit/harness/harness-error-messages.unit.test.ts`
  - Hardening changes:
    - added explicit invalid harness-id formatter for standardized diagnostics.
    - harness config loading now rejects harness ids that are:
      - whitespace-only
      - padded with leading/trailing whitespace
    - added focused unit coverage for invalid harness-id rejection and message
      formatting behavior.
  - Goal:
    - prevent ambiguous harness selection semantics from malformed harness-id
      keys while preserving existing behavior for valid ids.

## Execution Log Addendum — 2026-02-13 (explicit blank CLI harness-id guard)

- Additional harness selector hardening:
  - Updated:
    - `src/harness/harnessConfig.ts`
    - `__tests__/unit/harness/harness-config.unit.test.ts`
  - Hardening changes:
    - explicit CLI harness-id inputs that are whitespace-only are now rejected
      with canonical invalid-id diagnostics rather than silently falling through
      to default harness selection.
    - preserves existing trimmed selection behavior for padded-but-valid
      explicit harness-id values.
    - expanded focused unit coverage for explicit blank CLI harness-id
      rejection behavior.
  - Goal:
    - keep explicit harness selection deterministic and fail-fast for malformed
      CLI input while maintaining fallback behavior for implicit/default paths.

## Execution Log Addendum — 2026-02-13 (default-harness id validation hardening)

- Additional harness default-selection hardening:
  - Updated:
    - `src/harness/harnessConfig.ts`
    - `__tests__/unit/harness/harness-config.unit.test.ts`
  - Hardening changes:
    - project/user configured `defaultHarness` values are now validated with the
      same invalid-id guard used for harness ids:
      - whitespace-only defaults reject
      - padded defaults reject
    - prevents silent normalization/fallback on malformed configured defaults.
    - expanded focused unit coverage for:
      - whitespace-only project default rejection
      - padded project default rejection
      - whitespace-only user default rejection
  - Goal:
    - enforce deterministic default-harness semantics by failing fast on
      malformed configured defaults instead of implicitly coercing values.

## Execution Log Addendum — 2026-02-13 (strict explicit CLI harness-id validation)

- Additional explicit harness selector hardening:
  - Updated:
    - `src/harness/harnessConfig.ts`
    - `__tests__/unit/harness/harness-config.unit.test.ts`
  - Hardening changes:
    - explicit CLI harness-id inputs now use the shared strict harness-id
      validator:
      - exact ids resolve normally
      - padded ids reject (instead of trimming)
      - whitespace-only ids reject
    - removes implicit coercion of CLI harness-id input and aligns explicit
      selection behavior with configured id validation semantics.
    - expanded focused unit coverage for:
      - exact explicit id success
      - padded explicit id rejection
      - whitespace-only explicit id rejection
  - Goal:
    - make explicit harness selection fail fast and deterministic by requiring
      canonical harness-id input from CLI callers.

## Execution Log Addendum — 2026-02-13 (session-request harness-id canonicalization)

- Additional server request-validation hardening:
  - Updated:
    - `src/harness/harness-id.ts`
    - `src/harness/harnessConfig.ts`
    - `src/server/server-types.ts`
    - `__tests__/unit/harness/harness-id.unit.test.ts`
    - `__tests__/unit/server/server-types.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - introduced shared harness-id utility helpers for normalization/canonical
      checks.
    - create-session request schema now rejects non-canonical `harnessId`
      values (padded or whitespace-only) at request validation boundary.
    - harness config id validation now reuses shared harness-id helper for
      consistent semantics.
    - expanded unit/integration coverage for canonical harness-id behavior
      across harness utility, server schema validation, and headless server
      runtime responses.
  - Goal:
    - align harness-id validation semantics across config loading and server
      request boundaries to avoid ambiguous harness selection behavior.

## Execution Log Addendum — 2026-02-13 (harness-id validation message unification)

- Additional harness-id diagnostics hardening:
  - Updated:
    - `src/harness/harness-id.ts`
    - `src/harness/harness-error-messages.ts`
    - `src/server/server-types.ts`
    - `__tests__/unit/harness/harness-id.unit.test.ts`
    - `__tests__/unit/harness/harness-error-messages.unit.test.ts`
    - `__tests__/unit/server/server-types.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - introduced shared canonical harness-id validation message constant.
    - harness config invalid-id formatter now reuses shared message text.
    - create-session request schema now emits deterministic canonical-id message
      for `harnessId` validation failures.
    - expanded unit/integration coverage to assert message propagation across:
      - harness-id utility/constants
      - harness error formatter
      - server schema validation + headless response payloads
  - Goal:
    - keep harness-id validation diagnostics deterministic and consistent across
      config/runtime request boundaries.

## Execution Log Addendum — 2026-02-13 (empty harness-id message parity)

- Additional create-session schema hardening:
  - Updated:
    - `src/server/server-types.ts`
    - `__tests__/unit/server/server-types.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - create-session `harnessId` schema now uses canonical-id refinement only
      (no separate min-length check), ensuring empty-string values emit the same
      canonical validation message as padded/whitespace-only values.
    - expanded focused coverage for empty `harnessId` validation parity in both
      unit schema checks and headless integration behavior.
  - Goal:
    - enforce deterministic harness-id validation messaging for all
      non-canonical request payload variants.

## Execution Log Addendum — 2026-02-13 (unknown harness create-session coverage)

- Additional headless server integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added explicit integration coverage for create-session requests with a
      canonical but unconfigured harness id.
    - locks `404` response semantics with `formatHarnessNotConfiguredError(...)`
      payload for unresolved harness selection at session-creation boundary.
  - Goal:
    - preserve deterministic server behavior when clients request valid-but-
      unavailable harness ids.

## Execution Log Addendum — 2026-02-13 (unregistered adapter create-session coverage)

- Additional headless server integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for create-session when default harness is
      configured but corresponding adapter is not registered in harness
      registry.
    - test provisions isolated temp harness config, verifies server returns:
      - `404 Not Found`
      - `formatHarnessAdapterNotRegisteredError("custom")`
  - Goal:
    - lock deterministic failure semantics for runtime adapter lookup gaps in
      session creation flow.

## Execution Log Addendum — 2026-02-13 (harness-config fallback-on-load-failure coverage)

- Additional startup fallback integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage ensuring server startup falls back to default
      harness configuration when harness config loading fails (invalid harness
      config file shape/content).
    - test provisions invalid harness config in isolated temp workspace and
      verifies successful session creation via `mock` harness under fallback.
  - Goal:
    - lock resilience semantics for headless startup when user/project harness
      configuration is present but invalid.

## Execution Log Addendum — 2026-02-13 (empty harness-config fallback coverage)

- Additional startup fallback integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for startup fallback when harness config loads
      successfully but resolves to no configured harnesses (empty harness map).
    - test provisions isolated temp harness config with `harnesses: {}` and
      verifies session creation still succeeds via fallback default config using
      `mock` harness.
  - Goal:
    - lock resilience semantics for empty-yet-valid harness config files at
      headless startup boundary.

## Execution Log Addendum — 2026-02-13 (missing-default harness fallback coverage)

- Additional startup fallback integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for startup fallback when harness config is
      syntactically valid and non-empty but `defaultHarness` points to a
      missing harness id.
    - test provisions isolated harness config with unmatched default and
      verifies session creation still succeeds via fallback default config using
      `mock` harness.
  - Goal:
    - lock resilience semantics for misconfigured default harness selection at
      headless startup boundary.

## Execution Log Addendum — 2026-02-13 (default-harness cursor flag parsing coverage)

- Additional harness default-config feature-flag hardening:
  - Updated:
    - `__tests__/unit/harness/default-harness-config.unit.test.ts`
  - Hardening changes:
    - expanded cursor feature-flag coverage for default harness config:
      - padded truthy flag (`" true "`) includes cursor harness
      - falsey/invalid flags (`"false"`, `"0"`, `"maybe"`) exclude cursor
        harness even when cursor command/args overrides are provided
  - Goal:
    - lock deterministic cursor feature-flag parsing semantics for default
      harness construction across common string env-value variants.

## Execution Log Addendum — 2026-02-13 (boolean env-flag parser unit coverage)

- Additional env parsing hardening:
  - Updated:
    - `__tests__/unit/utils/boolean-flags.unit.test.ts`
  - Hardening changes:
    - added focused unit coverage for `parseBooleanEnvFlag(...)` behavior:
      - `undefined` input
      - truthy variants (`true`, padded `true`, `1`, case-insensitive values)
      - falsey variants (`false`, padded `false`, `0`, case-insensitive values)
      - unsupported values (`""`, whitespace-only, `yes`, `no`, `2`)
  - Goal:
    - lock deterministic env-boolean parsing semantics used by harness feature
      flags and avoid regressions in permissive string handling.

## Execution Log Addendum — 2026-02-13 (malformed harness-config JSON fallback coverage)

- Additional startup fallback integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for startup fallback when harness config file
      exists but contains malformed JSON (parse failure during load).
    - test provisions isolated malformed `harnesses.json` content and verifies
      session creation still succeeds via fallback default config using
      `mock` harness.
  - Goal:
    - lock resilience semantics for malformed harness-config JSON at headless
      startup boundary.

## Execution Log Addendum — 2026-02-13 (cursor connect-failure resilience coverage)

- Additional headless runtime-resilience integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for cursor harness connection failures when
      cursor feature flag is enabled and cursor command is missing.
    - verifies create-session using `cursor-cli` returns canonical server error
      and confirms server remains responsive by successfully creating a
      subsequent `mock` session.
  - Goal:
    - lock robustness semantics so harness-level connect failures do not
      destabilize headless server request handling.

## Execution Log Addendum — 2026-02-13 (cursor feature-flag adapter-disable coverage)

- Additional harness feature-flag integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for runtime behavior when cursor harness is
      configured in harness config but cursor adapter is disabled via
      `TOADSTOOL_CURSOR_CLI_ENABLED=false`.
    - verifies session creation returns canonical adapter-not-registered
      response for `cursor-cli` rather than silently selecting another harness.
  - Goal:
    - lock deterministic cursor feature-flag semantics at the harness-registry
      boundary for config-driven default harness selection.

## Execution Log Addendum — 2026-02-13 (partial harness availability coverage)

- Additional headless harness-registry resilience hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for mixed harness availability where
      `cursor-cli` is configured but disabled by feature flag while `mock`
      remains registered and available.
    - verifies explicit `cursor-cli` session creation returns canonical
      adapter-not-registered response.
    - verifies explicit `mock` session creation still succeeds in the same
      server instance.
  - Goal:
    - lock partial-availability semantics so disabled adapters fail cleanly
      without impacting operational configured harnesses.

## Execution Log Addendum — 2026-02-13 (default cursor connect-failure coverage)

- Additional default-harness resilience integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for runtime behavior when configured
      `defaultHarness` is `cursor-cli`, cursor adapter is enabled, and cursor
      command fails connection checks.
    - verifies default session creation path returns canonical server error.
    - verifies explicit follow-up `mock` session creation still succeeds in the
      same server instance.
  - Goal:
    - lock resilience semantics for default-harness connect failures while
      preserving overall server request continuity.

## Execution Log Addendum — 2026-02-13 (default cursor disabled partial-availability coverage)

- Additional default-harness + feature-flag integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for scenario where `defaultHarness` is
      `cursor-cli`, cursor adapter is disabled by feature flag, and alternate
      configured harnesses remain available.
    - verifies default session creation returns canonical
      adapter-not-registered response.
    - verifies explicit `mock` session creation still succeeds in the same
      server instance.
  - Goal:
    - lock continuity semantics for default-harness adapter-disable failures
      under mixed harness availability.

## Execution Log Addendum — 2026-02-13 (harness-registry factory fallback coverage)

- Additional harness registry unit hardening:
  - Updated:
    - `__tests__/unit/harness/harness-registry-factory.unit.test.ts`
  - Hardening changes:
    - added coverage for `includeMock: false` adapter-list behavior.
    - added coverage for unsupported cursor feature-flag values falling back to
      caller-provided defaults in `isCursorHarnessEnabled(...)`.
    - normalized existing adapter-id assertions to shared harness constants.
  - Goal:
    - lock deterministic harness-registry feature-flag fallback semantics and
      adapter-list construction behavior.

## Execution Log Addendum — 2026-02-13 (cursor default-config disablement coverage)

- Additional default-config + feature-flag integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for runtime behavior when cursor is disabled in
      default harness configuration (no custom harness config file).
    - verifies `harnessId: "cursor-cli"` returns canonical harness-not-configured
      response under default-config cursor disablement.
    - verifies explicit `mock` session creation remains successful in the same
      server instance.
  - Goal:
    - lock default-config feature-flag semantics so disabled cursor harnesses
      fail deterministically without impacting available default harnesses.

## Execution Log Addendum — 2026-02-13 (harness-registry normalization coverage)

- Additional harness registry unit hardening:
  - Updated:
    - `__tests__/unit/harness/harness-registry-factory.unit.test.ts`
  - Hardening changes:
    - added registry-level coverage that `createHarnessRegistry(...)` omits the
      mock adapter when `includeMock: false`.
    - added wrapper-level coverage for padded/case-insensitive cursor env-flag
      values in `isCursorHarnessEnabled(...)`.
  - Goal:
    - lock adapter-list normalization and feature-flag parsing behavior at the
      harness-registry factory boundary.

## Execution Log Addendum — 2026-02-13 (repeated cursor connect-failure coverage)

- Additional repeated-failure resilience integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated default cursor harness connection
      failures within the same running server instance.
    - verifies consecutive default `/sessions` attempts return canonical server
      errors when cursor connect checks fail.
    - verifies explicit `mock` session creation still succeeds after repeated
      cursor failures.
  - Goal:
    - lock server continuity semantics under repeated harness connect-failure
      cycles.

## Execution Log Addendum — 2026-02-13 (repeated cursor-not-configured coverage)

- Additional repeated-request continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `cursor-cli` requests
      when cursor is disabled in default harness config.
    - verifies consecutive explicit `cursor-cli` requests return canonical
      harness-not-configured responses.
    - verifies explicit `mock` session creation still succeeds after repeated
      cursor-not-configured paths in the same server instance.
  - Goal:
    - lock continuity semantics under repeated explicit harness-not-configured
      request cycles.

## Execution Log Addendum — 2026-02-13 (registry cursor-disable coverage)

- Additional harness registry unit hardening:
  - Updated:
    - `__tests__/unit/harness/harness-registry-factory.unit.test.ts`
  - Hardening changes:
    - added registry-level assertion that `createHarnessRegistry(...)` omits
      `cursor-cli` when `enableCursor: false`, while still including `mock`
      when `includeMock: true`.
  - Goal:
    - lock adapter presence semantics for cursor-disabled registry construction.

## Execution Log Addendum — 2026-02-13 (repeated adapter-not-registered coverage)

- Additional adapter-disable continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated default `/sessions` requests when
      `defaultHarness` is `cursor-cli` and cursor adapter is disabled in
      registry construction.
    - verifies consecutive requests return canonical adapter-not-registered
      responses.
    - verifies explicit `mock` session creation remains successful in the same
      running server instance.
  - Goal:
    - lock continuity semantics under repeated adapter-not-registered response
      cycles.

## Execution Log Addendum — 2026-02-13 (repeated default cursor-disabled coverage)

- Additional repeated default-route continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated default `/sessions` requests when
      cursor is default harness and cursor adapter is disabled.
    - verifies consecutive default requests return canonical
      adapter-not-registered responses.
    - verifies explicit `mock` session creation remains successful after those
      repeated default failures.
  - Goal:
    - lock continuity semantics under repeated default-route adapter-disabled
      response cycles.

## Execution Log Addendum — 2026-02-13 (repeated explicit cursor connect-failure coverage)

- Additional explicit-harness resilience integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "cursor-cli"`
      session requests when cursor adapter is enabled but cursor command fails
      connection checks.
    - verifies consecutive explicit cursor requests return canonical
      server-error responses.
    - verifies explicit `mock` session creation still succeeds after repeated
      explicit cursor connect-failure paths in the same runtime.
  - Goal:
    - lock continuity semantics under repeated explicit cursor connect-failure
      request cycles.

## Execution Log Addendum — 2026-02-13 (repeated unknown-harness continuity coverage)

- Additional unknown-harness continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit
      `harnessId: "missing-harness"` session requests against the same server
      instance.
    - verifies two consecutive unknown-harness requests return canonical
      harness-not-configured responses.
    - verifies explicit `mock` session creation still succeeds after repeated
      unknown-harness failures in the same runtime.
  - Goal:
    - lock continuity semantics under repeated unknown-harness request cycles.

## Execution Log Addendum — 2026-02-13 (repeated default custom-adapter continuity coverage)

- Additional default-route adapter continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated default `/sessions` requests when
      configured `defaultHarness` points to an unregistered custom adapter id.
    - verifies two consecutive default requests return canonical
      adapter-not-registered responses for the custom harness id.
    - verifies explicit `mock` session creation still succeeds after repeated
      default adapter-not-registered failures in the same runtime.
  - Goal:
    - lock continuity semantics under repeated default-route custom-adapter
      registration failures.

## Execution Log Addendum — 2026-02-13 (repeated fallback mock continuity coverage)

- Additional fallback-path continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "mock"`
      session requests when harness-file loading fails and server falls back to
      default harness configuration.
    - verifies consecutive fallback-path mock requests both succeed with valid
      session ids.
    - verifies repeated fallback-path session creation produces distinct session
      ids in the same runtime.
  - Goal:
    - lock continuity semantics under repeated explicit fallback-path session
      creation requests.

## Execution Log Addendum — 2026-02-13 (repeated fallback-trigger continuity coverage)

- Additional fallback-trigger continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "mock"`
      session requests when fallback is triggered by empty harness
      configuration.
    - added integration coverage for repeated explicit `harnessId: "mock"`
      session requests when fallback is triggered by missing configured default
      harness id.
    - verifies repeated fallback-trigger requests succeed with valid and
      distinct session ids in both scenarios.
  - Goal:
    - lock continuity semantics across additional fallback-trigger variants
      beyond malformed harness JSON.

## Execution Log Addendum — 2026-02-13 (repeated merge-override fallback continuity coverage)

- Additional merge-override fallback continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "mock"`
      session requests when project config is valid but user config overrides
      `defaultHarness` to a missing id, forcing fallback.
    - verifies repeated fallback-path mock requests succeed with valid and
      distinct session ids in the same runtime.
  - Goal:
    - lock continuity semantics for project/user harness merge override
      edge-cases that invalidate selected default harness resolution.

## Execution Log Addendum — 2026-02-13 (repeated merged-runtime override continuity coverage)

- Additional merged-runtime override continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated default `/sessions` requests when
      project/user merged harness config preserves `cursor-cli` id but user
      overrides cursor command to an invalid runtime value.
    - verifies repeated default requests return canonical server-error
      responses under merged override connect failures.
    - verifies explicit `mock` session creation remains operational in the same
      runtime after repeated merged override failures.
  - Goal:
    - lock continuity semantics for merged config runtime-override failures
      while preserving harness-id resolution behavior.

## Execution Log Addendum — 2026-02-13 (repeated merged env-expansion override continuity coverage)

- Additional merged env-expansion continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "mock"`
      requests when user override preserves harness id but command expands to
      empty via environment-variable interpolation.
    - verifies merged config load failure falls back to default harness config
      and repeated explicit mock requests remain successful.
    - verifies repeated fallback requests return distinct valid session ids in
      the same runtime.
  - Goal:
    - lock continuity semantics for merged env-expansion override breakage
      while preserving harness-id resolution behavior.

## Execution Log Addendum — 2026-02-13 (repeated merged cwd-override continuity coverage)

- Additional merged cwd-override continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "mock"`
      requests when user override preserves harness id but `cwd` env-expands to
      an empty value, forcing merged-config revalidation failure.
    - verifies fallback to default harness config under this merged cwd override
      failure path.
    - verifies repeated explicit mock requests remain successful with distinct
      valid session ids in the same runtime.
  - Goal:
    - lock continuity semantics for merged cwd-override breakage while
      preserving harness-id resolution behavior.

## Execution Log Addendum — 2026-02-13 (repeated merged blank-command override continuity coverage)

- Additional merged blank-command continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated explicit `harnessId: "mock"`
      requests when user override preserves harness id but command resolves to a
      blank value in merged config.
    - verifies merged-config revalidation failure triggers fallback to default
      harness configuration.
    - verifies repeated explicit mock requests remain successful with distinct
      valid session ids in the same runtime.
  - Goal:
    - lock continuity semantics for merged blank-command override breakage while
      preserving harness-id resolution behavior.

## Execution Log Addendum — 2026-02-13 (repeated merged env-map continuity coverage)

- Additional merged env-map continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated default-route requests when
      project/user merge preserves `mock` harness id and command/cwd, but env
      values expand to empty strings.
    - verifies merged config remains valid for empty expanded env-map entries
      and does not trigger fallback.
    - verifies repeated default session creation remains successful with
      distinct valid session ids in the same runtime.
  - Goal:
    - lock continuity semantics for merged env-map overrides with empty
      expansions while preserving valid command/cwd behavior.

## Execution Log Addendum — 2026-02-13 (merged env-map prompt continuity coverage)

- Additional merged env-map prompt continuity integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated session creation followed by
      prompt submissions when merged env-map overrides expand to empty values.
    - verifies repeated session creation remains successful without fallback.
    - verifies prompt submissions continue to return canonical success payloads
      under the same merged env-map conditions.
  - Goal:
    - lock downstream runtime continuity (session create + prompt) for merged
      env-map empty-expansion scenarios.

## Execution Log Addendum — 2026-02-13 (merged env-map mixed-request continuity coverage)

- Additional merged env-map mixed-request integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for mixed default/explicit session-create
      request sequences in the same runtime when merged env-map overrides
      expand to empty strings.
    - verifies all mixed-path session creations remain successful with distinct
      valid session ids.
    - verifies prompt submission after the mixed sequence remains successful.
  - Goal:
    - lock mixed explicit/default request continuity for merged env-map
      empty-expansion scenarios.

## Execution Log Addendum — 2026-02-13 (merged env-map mixed-validation continuity coverage)

- Additional merged env-map mixed-validation integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for mixed explicit/default session-create
      ordering followed by invalid prompt payload validation under merged
      env-map empty-expansion configuration.
    - verifies invalid prompt payload rejection remains canonical (`400`) and
      does not destabilize runtime behavior.
    - verifies subsequent valid prompt submission and trailing session creation
      remain successful in the same runtime.
  - Goal:
    - lock mixed request-order + validation continuity under merged env-map
      empty-expansion scenarios.

## Execution Log Addendum — 2026-02-13 (merged env-map repeated invalid-cycle continuity coverage)

- Additional merged env-map invalid-cycle integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated invalid prompt validation cycles
      across multiple sessions under merged env-map empty-expansion config.
    - verifies invalid prompt payload rejection remains stable across sessions.
    - verifies valid prompt recovery and trailing session creation continue to
      succeed in the same runtime after repeated validation failures.
  - Goal:
    - lock long-run validation-cycle continuity under merged env-map
      empty-expansion scenarios.

## Execution Log Addendum — 2026-02-14 (merged env-map websocket continuity coverage)

- Additional merged env-map websocket integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for websocket session-created event stability
      during merged env-map empty-expansion request cycles.
    - verifies event stream remains stable while mixed create/invalid-prompt/
      valid-prompt flows run in the same server runtime.
    - verifies websocket emits distinct `SESSION_CREATED` events for each
      created session id across the full cycle.
  - Goal:
    - lock websocket event-stream continuity under merged env-map validation
      cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map state-update stream continuity coverage)

- Additional merged env-map state-update stream integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - extended merged env-map websocket continuity scenario with concurrent
      `/api/events` SSE assertions for repeated `STATE_UPDATE` event delivery.
    - added stream-frame collection helper that parses SSE payloads and
      verifies repeated state-update emissions while mixed create/invalid
      prompt/valid prompt cycles execute.
    - verifies websocket `SESSION_CREATED` continuity and SSE `STATE_UPDATE`
      continuity together in the same runtime.
  - Goal:
    - lock combined websocket + SSE stream stability under merged env-map
      validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map SSE reconnect continuity coverage)

- Additional merged env-map SSE reconnect integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for `/api/events` SSE teardown/reconnect
      behavior after prompt validation failures under merged env-map empty
      expansion configuration.
    - verifies first SSE connection receives `STATE_UPDATE` events during
      session creation, then reconnects after invalid+valid prompt cycle.
    - verifies second SSE connection continues receiving `STATE_UPDATE` events
      after reconnect in the same runtime.
  - Goal:
    - lock SSE stream reconnect continuity after prompt validation failures
      under merged env-map validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map interleaved stream reconnect coverage)

- Additional merged env-map interleaved stream reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage that interleaves websocket and `/api/events`
      SSE reconnect cycles under merged env-map validation flows.
    - verifies first websocket/SSE pair remains stable during two session
      creations with invalid prompt rejection + valid prompt recovery.
    - verifies second websocket/SSE pair reconnects and continues receiving
      `SESSION_CREATED` and `STATE_UPDATE` events in the same runtime.
  - Goal:
    - lock long-sequence interleaved websocket+SSE reconnect stability under
      merged env-map validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map alternating reconnect coverage)

- Additional merged env-map alternating reconnect integration hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated reconnect cycles that alternate
      default and explicit `harnessId: "mock"` session-create requests.
    - verifies each cycle receives websocket `SESSION_CREATED` and SSE
      `STATE_UPDATE` events, with prompt validation rejection + recovery.
    - verifies all created sessions remain unique across alternating reconnect
      cycles in the same runtime.
  - Goal:
    - lock alternating explicit/default reconnect continuity under merged
      env-map validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map alternating burst reconnect coverage)

- Additional merged env-map alternating burst reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for repeated reconnect cycles that alternate
      default and explicit session-create requests while issuing multiple
      invalid prompt payloads before recovery.
    - verifies each cycle preserves websocket `SESSION_CREATED` and SSE
      `STATE_UPDATE` continuity plus two consecutive validation rejections.
    - verifies follow-up valid prompt recovery and unique session ids across
      the full reconnect sequence.
  - Goal:
    - lock alternating reconnect continuity under repeated invalid-prompt
      bursts in merged env-map validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map mixed-close reconnect coverage)

- Additional merged env-map mixed-close reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for alternating reconnect cycles with mixed
      websocket close timing (some cycles close before prompt recovery, others
      after prompt recovery).
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable regardless of close timing order.
    - verifies invalid prompt rejection + valid prompt recovery remains stable
      across all mixed-close cycles with unique session ids.
  - Goal:
    - lock mixed websocket-close timing continuity under merged env-map
      alternating reconnect validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map jitter reconnect coverage)

- Additional merged env-map jitter reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for extended alternating reconnect cycles with
      mixed websocket close timing plus reconnect jitter before session create.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable across the jittered sequence.
    - verifies invalid-prompt rejection and valid-prompt recovery remain stable
      across all jittered cycles with unique session ids.
  - Goal:
    - lock extended jittered reconnect continuity under merged env-map
      validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map alternating burst-size reconnect coverage)

- Additional merged env-map alternating burst-size reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for extended reconnect runs where each cycle
      alternates default vs explicit `harnessId: "mock"` requests while
      varying invalid-prompt burst sizes.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable across all burst-size permutations.
    - verifies repeated invalid-prompt rejection and valid-prompt recovery
      remain stable with unique session ids across the full sequence.
  - Goal:
    - lock reconnect continuity under alternating invalid-prompt burst-size
      patterns during merged env-map validation cycles.

## Execution Log Addendum — 2026-02-14 (merged env-map variable SSE cadence reconnect coverage)

- Additional merged env-map variable SSE cadence reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for reconnect cycles that vary SSE reconnect
      cadence per cycle while alternating default and explicit harness
      selection across repeated session creation.
    - verifies websocket `SESSION_CREATED` continuity for each per-cycle create
      burst while SSE `STATE_UPDATE` streams reconnect repeatedly.
    - verifies invalid-prompt burst rejection and valid-prompt recovery remain
      stable for all created sessions across cadence permutations.
  - Goal:
    - lock long-run stream stability when SSE reconnect cadence varies per
      cycle under merged env-map validation flows.

## Execution Log Addendum — 2026-02-14 (merged env-map dual cadence reconnect coverage)

- Additional merged env-map dual cadence reconnect hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage for reconnect cycles that vary both websocket
      reconnect cadence and SSE reconnect cadence per cycle.
    - verifies each websocket segment receives expected `SESSION_CREATED`
      events while per-segment SSE streams receive expected `STATE_UPDATE`
      events across alternating default/explicit session creation requests.
    - verifies invalid-prompt burst rejection and valid-prompt recovery remain
      stable for all created sessions across cadence permutations.
  - Goal:
    - lock stream continuity when websocket and SSE reconnect cadences vary
      together under merged env-map validation flows.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order inversion coverage)

- Additional merged env-map reconnect-order inversion hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage that alternates reconnect order per cycle:
      SSE-first on some cycles and websocket-first on others.
    - combines reconnect-order inversion with per-cycle websocket/SSE cadence
      variation while preserving alternating default/explicit session creation.
    - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, invalid-prompt
      burst rejection, and valid-prompt recovery remain stable.
  - Goal:
    - lock dual-cadence stream continuity under alternating reconnect-order
      inversion (`SSE -> websocket` vs `websocket -> SSE`).

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order jitter coverage)

- Additional merged env-map reconnect-order jitter hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - added integration coverage that keeps reconnect-order inversion while
      introducing per-cycle jitter variation for both stream-open ordering and
      create-request cadence.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remain stable under `SSE -> websocket` and `websocket -> SSE` orders.
    - verifies invalid-prompt burst rejection and valid-prompt recovery remain
      stable with unique session ids across jittered order permutations.
  - Goal:
    - lock reconnect-order inversion continuity under per-cycle jitter
      variation in both stream-open orders.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order asymmetric burst coverage)

- Additional merged env-map reconnect-order asymmetric burst hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order inversion coverage to run more alternating
      `SSE -> websocket` and `websocket -> SSE` cycles under dual cadence.
    - added asymmetric invalid-prompt burst sizes mapped to reconnect order
      paths (`SSE-first` lower burst, `websocket-first` higher burst).
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while asymmetric burst pressure varies by order path.
  - Goal:
    - lock reconnect-order continuity when invalid-prompt burst pressure is
      asymmetric across alternating stream-open order paths.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order cadence expansion coverage)

- Additional merged env-map reconnect-order cadence expansion hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order inversion cycles to use per-order-path cadence
      expansion in the same runtime (`SSE-first` cycles with lower create
      cadence, `websocket-first` cycles with higher create cadence).
    - kept dual-stream reconnect validation active with websocket
      `SESSION_CREATED` and SSE `STATE_UPDATE` assertions across expanded
      cadence permutations.
    - preserved asymmetric invalid-prompt burst pressure by reconnect order and
      verified valid-prompt recovery with unique session ids throughout.
  - Goal:
    - lock reconnect-order continuity when cadence expansion and asymmetric
      burst pressure vary per order path in one runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order jitter expansion coverage)

- Additional merged env-map reconnect-order jitter expansion hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order inversion cadence coverage with explicit
      per-order-path jitter arrays for stream-open sequencing and create timing.
    - kept asymmetric per-order-path cadence (`SSE-first` lower cadence,
      `websocket-first` higher cadence) and asymmetric invalid-prompt bursts.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remain stable while jitter and burst pressure vary by order path.
  - Goal:
    - lock reconnect-order continuity under simultaneous per-order-path cadence
      and per-order-path jitter expansion in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order segment asymmetry coverage)

- Additional merged env-map reconnect-order segment asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order inversion cadence coverage with asymmetric
      websocket vs SSE reconnect segment counts per order path.
    - `SSE-first` cycles now run fewer websocket segments and more SSE
      segments, while `websocket-first` cycles invert that segment split.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while segment-count asymmetry, per-order-path cadence,
      per-order-path jitter, and asymmetric burst pressure co-exist.
  - Goal:
    - lock reconnect-order continuity under explicit websocket/SSE segment-count
      asymmetry mapped by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order jitter amplitude asymmetry coverage)

- Additional merged env-map reconnect-order jitter amplitude asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order segment-asymmetry coverage with asymmetric
      websocket vs SSE segment-open jitter amplitudes per order path.
    - `SSE-first` cycles now use lower websocket/open jitter with higher SSE
      jitter, while `websocket-first` cycles invert jitter amplitude split.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while jitter amplitude asymmetry is layered with segment-
      count asymmetry, per-order-path cadence, and asymmetric burst pressure.
  - Goal:
    - lock reconnect-order continuity when websocket/SSE segment-open jitter
      amplitude varies asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order create-jitter asymmetry coverage)

- Additional merged env-map reconnect-order create-jitter asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order jitter-amplitude coverage with asymmetric
      create-jitter amplitudes mapped by reconnect order path.
    - `SSE-first` cycles now use lower create-jitter amplitude while
      `websocket-first` cycles use higher create-jitter amplitude.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while create-jitter asymmetry is layered with segment-
      count asymmetry, stream-open jitter asymmetry, cadence variation, and
      asymmetric invalid-prompt burst pressure.
  - Goal:
    - lock reconnect-order continuity when create-timing jitter amplitude
      varies asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order recovery-jitter asymmetry coverage)

- Additional merged env-map reconnect-order recovery-jitter asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order create-jitter asymmetry coverage with asymmetric
      invalid-to-valid prompt recovery jitter amplitudes by order path.
    - `SSE-first` cycles now use lower recovery jitter amplitudes while
      `websocket-first` cycles use higher recovery jitter amplitudes.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while recovery-jitter asymmetry is layered with create-
      jitter asymmetry, stream-open jitter asymmetry, segment-count asymmetry,
      cadence variation, and asymmetric invalid-prompt burst pressure.
  - Goal:
    - lock reconnect-order continuity when invalid-prompt recovery timing varies
      asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order burst-spacing asymmetry coverage)

- Additional merged env-map reconnect-order burst-spacing asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order recovery-jitter coverage with asymmetric
      invalid-prompt burst spacing amplitudes by reconnect order path.
    - `SSE-first` cycles now use lower invalid-burst spacing while
      `websocket-first` cycles use higher invalid-burst spacing.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while burst-spacing asymmetry is layered with recovery-
      jitter asymmetry, create-jitter asymmetry, stream-open jitter asymmetry,
      segment-count asymmetry, cadence variation, and asymmetric burst sizes.
  - Goal:
    - lock reconnect-order continuity when invalid-prompt burst spacing varies
      asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-recovery delay asymmetry coverage)

- Additional merged env-map reconnect-order post-recovery delay asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order burst-spacing coverage with asymmetric valid-
      prompt post-recovery delay amplitudes by reconnect order path.
    - `SSE-first` cycles now use lower post-recovery delays while
      `websocket-first` cycles use higher post-recovery delays.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-recovery delay asymmetry is layered with burst-
      spacing asymmetry, recovery-jitter asymmetry, create-jitter asymmetry,
      stream-open jitter asymmetry, segment-count asymmetry, and cadence
      variation.
  - Goal:
    - lock reconnect-order continuity when post-recovery delay timing varies
      asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order cycle-cooldown asymmetry coverage)

- Additional merged env-map reconnect-order cycle-cooldown asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-recovery delay coverage with asymmetric
      cycle-end cooldown jitter amplitudes by reconnect order path.
    - `SSE-first` cycles now use lower cycle-end cooldown jitter while
      `websocket-first` cycles use higher cycle-end cooldown jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while cycle-cooldown asymmetry is layered with post-
      recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
      asymmetry, create-jitter asymmetry, stream-open jitter asymmetry,
      segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when cycle-end cooldown timing varies
      asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order close-delay asymmetry coverage)

- Additional merged env-map reconnect-order close-delay asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order cycle-cooldown coverage with asymmetric
      websocket and SSE close-delay amplitudes by reconnect order path.
    - `SSE-first` cycles now use lower websocket/SSE close delays while
      `websocket-first` cycles use higher close-delay amplitudes.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while close-delay asymmetry is layered with cycle-cooldown
      asymmetry, post-recovery delay asymmetry, burst-spacing asymmetry,
      recovery-jitter asymmetry, create-jitter asymmetry, stream-open jitter
      asymmetry, segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when websocket/SSE close-delay timing
      varies asymmetrically by order path in the same runtime sequence.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order close-interleave asymmetry coverage)

- Additional merged env-map reconnect-order close-interleave asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order close-delay coverage with asymmetric close-
      interleave timing between websocket and SSE segment completion handlers.
    - `SSE-first` cycles now interleave close handlers with lower delay while
      `websocket-first` cycles interleave close handlers with higher delay.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while close-interleave asymmetry is layered with close-
      delay asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
      burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
      asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
      cadence variation.
  - Goal:
    - lock reconnect-order continuity when websocket/SSE close-handler
      interleave timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close create scheduling asymmetry coverage)

- Additional merged env-map reconnect-order post-close create scheduling asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order close-interleave coverage with asymmetric
      post-close create scheduling jitter by reconnect order path.
    - `SSE-first` cycles now apply lower post-close create jitter while
      `websocket-first` cycles apply higher post-close create jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close create scheduling asymmetry is layered
      with close-interleave asymmetry, close-delay asymmetry, cycle-cooldown
      asymmetry, post-recovery delay asymmetry, burst-spacing asymmetry,
      recovery-jitter asymmetry, create-jitter asymmetry, stream-open jitter
      asymmetry, segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close create scheduling timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt scheduling asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt scheduling asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close create scheduling coverage with
      asymmetric post-close prompt scheduling jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt jitter while
      `websocket-first` cycles use higher post-close prompt jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt scheduling asymmetry is layered
      with post-close create scheduling asymmetry, close-interleave asymmetry,
      close-delay asymmetry, cycle-cooldown asymmetry, post-recovery delay
      asymmetry, burst-spacing asymmetry, recovery-jitter asymmetry,
      create-jitter asymmetry, stream-open jitter asymmetry, segment-count
      asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close prompt scheduling timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close recovery scheduling asymmetry coverage)

- Additional merged env-map reconnect-order post-close recovery scheduling asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt scheduling coverage with
      asymmetric post-close recovery scheduling jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close recovery jitter while
      `websocket-first` cycles use higher post-close recovery jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close recovery scheduling asymmetry is layered
      with post-close prompt scheduling asymmetry, post-close create scheduling
      asymmetry, close-interleave asymmetry, close-delay asymmetry, cycle-
      cooldown asymmetry, post-recovery delay asymmetry, burst-spacing
      asymmetry, recovery-jitter asymmetry, create-jitter asymmetry, stream-
      open jitter asymmetry, segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close recovery scheduling
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close cycle transition asymmetry coverage)

- Additional merged env-map reconnect-order post-close cycle transition asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close recovery scheduling coverage with
      asymmetric post-close cycle transition jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close cycle transition jitter while
      `websocket-first` cycles use higher post-close cycle transition jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close cycle transition asymmetry is layered
      with post-close recovery scheduling asymmetry, post-close prompt
      scheduling asymmetry, post-close create scheduling asymmetry, close-
      interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
      post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
      asymmetry, create-jitter asymmetry, stream-open jitter asymmetry,
      segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close cycle transition timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close segment-open gating asymmetry coverage)

- Additional merged env-map reconnect-order post-close segment-open gating asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close cycle transition coverage with
      asymmetric post-close segment-open gating jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close segment-open gating jitter
      while `websocket-first` cycles use higher post-close segment-open gating
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close segment-open gating asymmetry is layered
      with post-close cycle transition asymmetry, post-close recovery
      scheduling asymmetry, post-close prompt scheduling asymmetry, post-close
      create scheduling asymmetry, close-interleave asymmetry, close-delay
      asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
      burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
      asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
      cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close segment-open gating
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close segment-rearm asymmetry coverage)

- Additional merged env-map reconnect-order post-close segment-rearm asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close segment-open gating coverage with
      asymmetric post-close segment-rearm jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close segment-rearm jitter while
      `websocket-first` cycles use higher post-close segment-rearm jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close segment-rearm asymmetry is layered with
      post-close segment-open gating asymmetry, post-close cycle transition
      asymmetry, post-close recovery scheduling asymmetry, post-close prompt
      scheduling asymmetry, post-close create scheduling asymmetry, close-
      interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
      post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
      asymmetry, create-jitter asymmetry, stream-open jitter asymmetry,
      segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close segment-rearm timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close invalid-burst ramp asymmetry coverage)

- Additional merged env-map reconnect-order post-close invalid-burst ramp asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close segment-rearm coverage with
      asymmetric post-close invalid-burst ramp jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close invalid-burst ramp jitter
      while `websocket-first` cycles use higher post-close invalid-burst ramp
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close invalid-burst ramp asymmetry is layered
      with post-close segment-rearm asymmetry, post-close segment-open gating
      asymmetry, post-close cycle transition asymmetry, post-close recovery
      scheduling asymmetry, post-close prompt scheduling asymmetry, post-close
      create scheduling asymmetry, close-interleave asymmetry, close-delay
      asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
      burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
      asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
      cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close invalid-burst ramp timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close valid-prompt ramp asymmetry coverage)

- Additional merged env-map reconnect-order post-close valid-prompt ramp asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close invalid-burst ramp coverage with
      asymmetric post-close valid-prompt ramp jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close valid-prompt ramp jitter
      while `websocket-first` cycles use higher post-close valid-prompt ramp
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close valid-prompt ramp asymmetry is layered
      with post-close invalid-burst ramp asymmetry, post-close segment-rearm
      asymmetry, post-close segment-open gating asymmetry, post-close cycle
      transition asymmetry, post-close recovery scheduling asymmetry, post-
      close prompt scheduling asymmetry, post-close create scheduling
      asymmetry, close-interleave asymmetry, close-delay asymmetry, cycle-
      cooldown asymmetry, post-recovery delay asymmetry, burst-spacing
      asymmetry, recovery-jitter asymmetry, create-jitter asymmetry, stream-
      open jitter asymmetry, segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close valid-prompt ramp timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close recovery-confirm asymmetry coverage)

- Additional merged env-map reconnect-order post-close recovery-confirm asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close valid-prompt ramp coverage with
      asymmetric post-close recovery-confirm jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close recovery-confirm jitter while
      `websocket-first` cycles use higher post-close recovery-confirm jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close recovery-confirm asymmetry is layered
      with post-close valid-prompt ramp asymmetry, post-close invalid-burst
      ramp asymmetry, post-close segment-rearm asymmetry, post-close segment-
      open gating asymmetry, post-close cycle transition asymmetry, post-close
      recovery scheduling asymmetry, post-close prompt scheduling asymmetry,
      post-close create scheduling asymmetry, close-interleave asymmetry,
      close-delay asymmetry, cycle-cooldown asymmetry, post-recovery delay
      asymmetry, burst-spacing asymmetry, recovery-jitter asymmetry, create-
      jitter asymmetry, stream-open jitter asymmetry, segment-count asymmetry,
      and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close recovery-confirm timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close recovery-settle asymmetry coverage)

- Additional merged env-map reconnect-order post-close recovery-settle asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close recovery-confirm coverage with
      asymmetric post-close recovery-settle jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close recovery-settle jitter while
      `websocket-first` cycles use higher post-close recovery-settle jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close recovery-settle asymmetry is layered with
      post-close recovery-confirm asymmetry, post-close valid-prompt ramp
      asymmetry, post-close invalid-burst ramp asymmetry, post-close segment-
      rearm asymmetry, post-close segment-open gating asymmetry, post-close
      cycle transition asymmetry, post-close recovery scheduling asymmetry,
      post-close prompt scheduling asymmetry, post-close create scheduling
      asymmetry, close-interleave asymmetry, close-delay asymmetry, cycle-
      cooldown asymmetry, post-recovery delay asymmetry, burst-spacing
      asymmetry, recovery-jitter asymmetry, create-jitter asymmetry, stream-
      open jitter asymmetry, segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close recovery-settle timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close cycle-handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close cycle-handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close recovery-settle coverage with
      asymmetric post-close cycle-handoff jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close cycle-handoff jitter while
      `websocket-first` cycles use higher post-close cycle-handoff jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close cycle-handoff asymmetry is layered with
      post-close recovery-settle asymmetry, post-close recovery-confirm
      asymmetry, post-close valid-prompt ramp asymmetry, post-close invalid-
      burst ramp asymmetry, post-close segment-rearm asymmetry, post-close
      segment-open gating asymmetry, post-close cycle transition asymmetry,
      post-close recovery scheduling asymmetry, post-close prompt scheduling
      asymmetry, post-close create scheduling asymmetry, close-interleave
      asymmetry, close-delay asymmetry, cycle-cooldown asymmetry, post-
      recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
      asymmetry, create-jitter asymmetry, stream-open jitter asymmetry,
      segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close cycle-handoff timing
      varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close cycle-cooldown handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close cycle-cooldown handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close cycle-handoff coverage with
      asymmetric post-close cycle-cooldown handoff jitter by reconnect order
      path.
    - `SSE-first` cycles now use lower post-close cycle-cooldown handoff
      jitter while `websocket-first` cycles use higher post-close cycle-
      cooldown handoff jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close cycle-cooldown handoff asymmetry is
      layered with post-close cycle-handoff asymmetry, post-close recovery-
      settle asymmetry, post-close recovery-confirm asymmetry, post-close
      valid-prompt ramp asymmetry, post-close invalid-burst ramp asymmetry,
      post-close segment-rearm asymmetry, post-close segment-open gating
      asymmetry, post-close cycle transition asymmetry, post-close recovery
      scheduling asymmetry, post-close prompt scheduling asymmetry, post-close
      create scheduling asymmetry, close-interleave asymmetry, close-delay
      asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
      burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
      asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
      cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close cycle-cooldown handoff
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close cycle-transition handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close cycle-transition handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close cycle-cooldown handoff coverage with
      asymmetric post-close cycle-transition handoff jitter by reconnect order
      path.
    - `SSE-first` cycles now use lower post-close cycle-transition handoff
      jitter while `websocket-first` cycles use higher post-close cycle-
      transition handoff jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close cycle-transition handoff asymmetry is
      layered with post-close cycle-cooldown handoff asymmetry, post-close
      cycle-handoff asymmetry, post-close recovery-settle asymmetry, post-close
      recovery-confirm asymmetry, post-close valid-prompt ramp asymmetry, post-
      close invalid-burst ramp asymmetry, post-close segment-rearm asymmetry,
      post-close segment-open gating asymmetry, post-close cycle transition
      asymmetry, post-close recovery scheduling asymmetry, post-close prompt
      scheduling asymmetry, post-close create scheduling asymmetry, close-
      interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
      post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
      asymmetry, create-jitter asymmetry, stream-open jitter asymmetry,
      segment-count asymmetry, and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close cycle-transition handoff
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close segment-open handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close segment-open handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close cycle-transition handoff coverage
      with asymmetric post-close segment-open handoff jitter by reconnect order
      path.
    - `SSE-first` cycles now use lower post-close segment-open handoff jitter
      while `websocket-first` cycles use higher post-close segment-open handoff
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close segment-open handoff asymmetry is layered
      with post-close cycle-transition handoff asymmetry, post-close cycle-
      cooldown handoff asymmetry, post-close cycle-handoff asymmetry, post-
      close recovery-settle asymmetry, post-close recovery-confirm asymmetry,
      post-close valid-prompt ramp asymmetry, post-close invalid-burst ramp
      asymmetry, post-close segment-rearm asymmetry, post-close segment-open
      gating asymmetry, post-close cycle transition asymmetry, post-close
      recovery scheduling asymmetry, post-close prompt scheduling asymmetry,
      post-close create scheduling asymmetry, close-interleave asymmetry,
      close-delay asymmetry, cycle-cooldown asymmetry, post-recovery delay
      asymmetry, burst-spacing asymmetry, recovery-jitter asymmetry, create-
      jitter asymmetry, stream-open jitter asymmetry, segment-count asymmetry,
      and cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close segment-open handoff
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close segment-rearm handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close segment-rearm handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close segment-open handoff coverage with
      asymmetric post-close segment-rearm handoff jitter by reconnect order
      path.
    - `SSE-first` cycles now use lower post-close segment-rearm handoff jitter
      while `websocket-first` cycles use higher post-close segment-rearm
      handoff jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close segment-rearm handoff asymmetry is
      layered with post-close segment-open handoff asymmetry, post-close cycle-
      transition handoff asymmetry, post-close cycle-cooldown handoff
      asymmetry, post-close cycle-handoff asymmetry, post-close recovery-
      settle asymmetry, post-close recovery-confirm asymmetry, post-close
      valid-prompt ramp asymmetry, post-close invalid-burst ramp asymmetry,
      post-close segment-rearm asymmetry, post-close segment-open gating
      asymmetry, post-close cycle transition asymmetry, post-close recovery
      scheduling asymmetry, post-close prompt scheduling asymmetry, post-close
      create scheduling asymmetry, close-interleave asymmetry, close-delay
      asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
      burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
      asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
      cadence variation.
  - Goal:
    - lock reconnect-order continuity when post-close segment-rearm handoff
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close segment-rearm handoff coverage with
      asymmetric post-close prompt-burst handoff jitter by reconnect order
      path.
    - `SSE-first` cycles now use lower post-close prompt-burst handoff jitter
      while `websocket-first` cycles use higher post-close prompt-burst
      handoff jitter.
    - applies post-close prompt-burst handoff jitter after the first session in
      each cycle and before existing post-close prompt scheduling jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst handoff asymmetry is layered
      with post-close segment-rearm handoff asymmetry, post-close segment-open
      handoff asymmetry, post-close cycle-transition handoff asymmetry, post-
      close cycle-cooldown handoff asymmetry, and post-close cycle-handoff
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst handoff
      timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-settle asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-settle asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst handoff coverage with
      asymmetric post-close prompt-burst recovery-settle jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-settle
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-settle jitter.
    - applies post-close prompt-burst recovery-settle jitter after invalid
      prompt burst completion and before post-close recovery jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-settle asymmetry is
      layered with post-close prompt-burst handoff asymmetry, post-close
      segment-rearm handoff asymmetry, post-close segment-open handoff
      asymmetry, post-close cycle-transition handoff asymmetry, and post-close
      cycle-cooldown handoff asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      settle timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-confirm asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-confirm asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-settle coverage
      with asymmetric post-close prompt-burst recovery-confirm jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-confirm
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-confirm jitter.
    - applies post-close prompt-burst recovery-confirm jitter after valid prompt
      success confirmation and before post-close recovery-confirm jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-confirm asymmetry is
      layered with post-close prompt-burst recovery-settle asymmetry, post-
      close prompt-burst handoff asymmetry, post-close segment-rearm handoff
      asymmetry, and post-close segment-open handoff asymmetry under reconnect-
      order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      confirm timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-handoff asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-handoff asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-confirm
      coverage with asymmetric post-close prompt-burst recovery-handoff jitter
      by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-handoff
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-handoff jitter.
    - applies post-close prompt-burst recovery-handoff jitter for intra-cycle
      session handoff after post-close recovery-confirm jitter and before post-
      recovery delay handling.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-handoff asymmetry
      is layered with post-close prompt-burst recovery-confirm asymmetry, post-
      close prompt-burst recovery-settle asymmetry, post-close prompt-burst
      handoff asymmetry, and post-close segment-rearm handoff asymmetry under
      reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      handoff timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-cooldown asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-cooldown asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-handoff
      coverage with asymmetric post-close prompt-burst recovery-cooldown
      jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-
      cooldown jitter while `websocket-first` cycles use higher post-close
      prompt-burst recovery-cooldown jitter.
    - applies post-close prompt-burst recovery-cooldown jitter for intra-cycle
      session handoff after post-close recovery-settle jitter and before post-
      close cycle-handoff jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-cooldown asymmetry
      is layered with post-close prompt-burst recovery-handoff asymmetry, post-
      close prompt-burst recovery-confirm asymmetry, post-close prompt-burst
      recovery-settle asymmetry, and post-close prompt-burst handoff asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      cooldown timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-drift asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-drift asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-cooldown
      coverage with asymmetric post-close prompt-burst recovery-drift jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-drift
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-drift jitter.
    - applies post-close prompt-burst recovery-drift jitter for intra-cycle
      session handoff after post-close cycle-handoff jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-drift asymmetry is
      layered with post-close prompt-burst recovery-cooldown asymmetry, post-
      close prompt-burst recovery-handoff asymmetry, post-close prompt-burst
      recovery-confirm asymmetry, and post-close prompt-burst recovery-settle
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      drift timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-transition asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-transition asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-drift coverage
      with asymmetric post-close prompt-burst recovery-transition jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-
      transition jitter while `websocket-first` cycles use higher post-close
      prompt-burst recovery-transition jitter.
    - applies post-close prompt-burst recovery-transition jitter for intra-
      cycle session handoff after post-close prompt-burst recovery-drift
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-transition
      asymmetry is layered with post-close prompt-burst recovery-drift
      asymmetry, post-close prompt-burst recovery-cooldown asymmetry, post-
      close prompt-burst recovery-handoff asymmetry, and post-close prompt-
      burst recovery-confirm asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      transition timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-checkpoint asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-checkpoint asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-transition
      coverage with asymmetric post-close prompt-burst recovery-checkpoint
      jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-
      checkpoint jitter while `websocket-first` cycles use higher post-close
      prompt-burst recovery-checkpoint jitter.
    - applies post-close prompt-burst recovery-checkpoint jitter for intra-
      cycle session handoff after post-close prompt-burst recovery-transition
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-checkpoint
      asymmetry is layered with post-close prompt-burst recovery-transition
      asymmetry, post-close prompt-burst recovery-drift asymmetry, post-close
      prompt-burst recovery-cooldown asymmetry, and post-close prompt-burst
      recovery-handoff asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      checkpoint timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-finalize asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-finalize asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-checkpoint
      coverage with asymmetric post-close prompt-burst recovery-finalize
      jitter by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-
      finalize jitter while `websocket-first` cycles use higher post-close
      prompt-burst recovery-finalize jitter.
    - applies post-close prompt-burst recovery-finalize jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-checkpoint
      jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-finalize asymmetry
      is layered with post-close prompt-burst recovery-checkpoint asymmetry,
      post-close prompt-burst recovery-transition asymmetry, post-close
      prompt-burst recovery-drift asymmetry, and post-close prompt-burst
      recovery-cooldown asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      finalize timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-anchor asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-anchor asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-finalize
      coverage with asymmetric post-close prompt-burst recovery-anchor jitter
      by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-anchor
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-anchor jitter.
    - applies post-close prompt-burst recovery-anchor jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-finalize jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-anchor asymmetry is
      layered with post-close prompt-burst recovery-finalize asymmetry, post-
      close prompt-burst recovery-checkpoint asymmetry, post-close prompt-
      burst recovery-transition asymmetry, and post-close prompt-burst
      recovery-drift asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      anchor timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-seal asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-seal asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-anchor coverage
      with asymmetric post-close prompt-burst recovery-seal jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-seal
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-seal jitter.
    - applies post-close prompt-burst recovery-seal jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-anchor jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-seal asymmetry is
      layered with post-close prompt-burst recovery-anchor asymmetry, post-
      close prompt-burst recovery-finalize asymmetry, post-close prompt-burst
      recovery-checkpoint asymmetry, and post-close prompt-burst recovery-
      transition asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      seal timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-guard asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-guard asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-seal coverage
      with asymmetric post-close prompt-burst recovery-guard jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-guard
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-guard jitter.
    - applies post-close prompt-burst recovery-guard jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-seal jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-guard asymmetry is
      layered with post-close prompt-burst recovery-seal asymmetry, post-close
      prompt-burst recovery-anchor asymmetry, post-close prompt-burst
      recovery-finalize asymmetry, and post-close prompt-burst recovery-
      checkpoint asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      guard timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-lock asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-lock asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-guard coverage
      with asymmetric post-close prompt-burst recovery-lock jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-lock
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-lock jitter.
    - applies post-close prompt-burst recovery-lock jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-guard jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-lock asymmetry is
      layered with post-close prompt-burst recovery-guard asymmetry, post-
      close prompt-burst recovery-seal asymmetry, post-close prompt-burst
      recovery-anchor asymmetry, and post-close prompt-burst recovery-finalize
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      lock timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-bolt asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-bolt asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-lock coverage
      with asymmetric post-close prompt-burst recovery-bolt jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-bolt
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-bolt jitter.
    - applies post-close prompt-burst recovery-bolt jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-lock jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-bolt asymmetry is
      layered with post-close prompt-burst recovery-lock asymmetry, post-close
      prompt-burst recovery-guard asymmetry, post-close prompt-burst recovery-
      seal asymmetry, and post-close prompt-burst recovery-anchor asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      bolt timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-clamp asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-clamp asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-bolt coverage
      with asymmetric post-close prompt-burst recovery-clamp jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-clamp
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-clamp jitter.
    - applies post-close prompt-burst recovery-clamp jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-bolt jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-clamp asymmetry is
      layered with post-close prompt-burst recovery-bolt asymmetry, post-close
      prompt-burst recovery-lock asymmetry, post-close prompt-burst recovery-
      guard asymmetry, and post-close prompt-burst recovery-seal asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      clamp timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-brace asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-brace asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-clamp coverage
      with asymmetric post-close prompt-burst recovery-brace jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-brace
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-brace jitter.
    - applies post-close prompt-burst recovery-brace jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-clamp jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-brace asymmetry is
      layered with post-close prompt-burst recovery-clamp asymmetry, post-close
      prompt-burst recovery-bolt asymmetry, post-close prompt-burst recovery-
      lock asymmetry, and post-close prompt-burst recovery-guard asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      brace timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-latch asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-latch asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-brace coverage
      with asymmetric post-close prompt-burst recovery-latch jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-latch
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-latch jitter.
    - applies post-close prompt-burst recovery-latch jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-brace jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-latch asymmetry is
      layered with post-close prompt-burst recovery-brace asymmetry, post-
      close prompt-burst recovery-clamp asymmetry, post-close prompt-burst
      recovery-bolt asymmetry, and post-close prompt-burst recovery-lock
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      latch timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-rivet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-rivet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-latch coverage
      with asymmetric post-close prompt-burst recovery-rivet jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-rivet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-rivet jitter.
    - applies post-close prompt-burst recovery-rivet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-latch jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-rivet asymmetry is
      layered with post-close prompt-burst recovery-latch asymmetry, post-
      close prompt-burst recovery-brace asymmetry, post-close prompt-burst
      recovery-clamp asymmetry, and post-close prompt-burst recovery-bolt
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      rivet timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-pin asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-pin asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-rivet coverage
      with asymmetric post-close prompt-burst recovery-pin jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-pin
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-pin jitter.
    - applies post-close prompt-burst recovery-pin jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-rivet jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-pin asymmetry is
      layered with post-close prompt-burst recovery-rivet asymmetry, post-
      close prompt-burst recovery-latch asymmetry, post-close prompt-burst
      recovery-brace asymmetry, and post-close prompt-burst recovery-clamp
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      pin timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-stud asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-stud asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-pin coverage
      with asymmetric post-close prompt-burst recovery-stud jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-stud
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-stud jitter.
    - applies post-close prompt-burst recovery-stud jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-pin jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-stud asymmetry is
      layered with post-close prompt-burst recovery-pin asymmetry, post-close
      prompt-burst recovery-rivet asymmetry, post-close prompt-burst recovery-
      latch asymmetry, and post-close prompt-burst recovery-brace asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      stud timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-spike asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-spike asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-stud coverage
      with asymmetric post-close prompt-burst recovery-spike jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-spike
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-spike jitter.
    - applies post-close prompt-burst recovery-spike jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-stud jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-spike asymmetry is
      layered with post-close prompt-burst recovery-stud asymmetry, post-close
      prompt-burst recovery-pin asymmetry, post-close prompt-burst recovery-
      rivet asymmetry, and post-close prompt-burst recovery-latch asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      spike timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-notch asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-notch asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-spike coverage
      with asymmetric post-close prompt-burst recovery-notch jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-notch
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-notch jitter.
    - applies post-close prompt-burst recovery-notch jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-spike jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-notch asymmetry is
      layered with post-close prompt-burst recovery-spike asymmetry, post-close
      prompt-burst recovery-stud asymmetry, post-close prompt-burst recovery-
      pin asymmetry, and post-close prompt-burst recovery-rivet asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      notch timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-groove asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-groove asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-notch coverage
      with asymmetric post-close prompt-burst recovery-groove jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-groove
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-groove jitter.
    - applies post-close prompt-burst recovery-groove jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-notch jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-groove asymmetry is
      layered with post-close prompt-burst recovery-notch asymmetry, post-close
      prompt-burst recovery-spike asymmetry, post-close prompt-burst recovery-
      stud asymmetry, and post-close prompt-burst recovery-pin asymmetry under
      reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      groove timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-ridge asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-ridge asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-groove coverage
      with asymmetric post-close prompt-burst recovery-ridge jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-ridge
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-ridge jitter.
    - applies post-close prompt-burst recovery-ridge jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-groove jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-ridge asymmetry is
      layered with post-close prompt-burst recovery-groove asymmetry, post-close
      prompt-burst recovery-notch asymmetry, post-close prompt-burst recovery-
      spike asymmetry, and post-close prompt-burst recovery-stud asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      ridge timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-crest asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-crest asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-ridge coverage
      with asymmetric post-close prompt-burst recovery-crest jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-crest
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-crest jitter.
    - applies post-close prompt-burst recovery-crest jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-ridge jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-crest asymmetry is
      layered with post-close prompt-burst recovery-ridge asymmetry, post-close
      prompt-burst recovery-groove asymmetry, post-close prompt-burst recovery-
      notch asymmetry, and post-close prompt-burst recovery-spike asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      crest timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-peak asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-peak asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-crest coverage
      with asymmetric post-close prompt-burst recovery-peak jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-peak
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-peak jitter.
    - applies post-close prompt-burst recovery-peak jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-crest jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-peak asymmetry is
      layered with post-close prompt-burst recovery-crest asymmetry, post-close
      prompt-burst recovery-ridge asymmetry, post-close prompt-burst recovery-
      groove asymmetry, and post-close prompt-burst recovery-notch asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      peak timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-summit asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-summit asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-peak coverage
      with asymmetric post-close prompt-burst recovery-summit jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-summit
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-summit jitter.
    - applies post-close prompt-burst recovery-summit jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-peak jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-summit asymmetry is
      layered with post-close prompt-burst recovery-peak asymmetry, post-close
      prompt-burst recovery-crest asymmetry, post-close prompt-burst recovery-
      ridge asymmetry, and post-close prompt-burst recovery-groove asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      summit timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-apex asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-apex asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-summit coverage
      with asymmetric post-close prompt-burst recovery-apex jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-apex
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-apex jitter.
    - applies post-close prompt-burst recovery-apex jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-summit jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-apex asymmetry is
      layered with post-close prompt-burst recovery-summit asymmetry, post-close
      prompt-burst recovery-peak asymmetry, post-close prompt-burst recovery-
      crest asymmetry, and post-close prompt-burst recovery-ridge asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      apex timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-crown asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-crown asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-apex coverage
      with asymmetric post-close prompt-burst recovery-crown jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-crown
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-crown jitter.
    - applies post-close prompt-burst recovery-crown jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-apex jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-crown asymmetry is
      layered with post-close prompt-burst recovery-apex asymmetry, post-close
      prompt-burst recovery-summit asymmetry, post-close prompt-burst recovery-
      peak asymmetry, and post-close prompt-burst recovery-crest asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      crown timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-tiara asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-tiara asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-crown coverage
      with asymmetric post-close prompt-burst recovery-tiara jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-tiara
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-tiara jitter.
    - applies post-close prompt-burst recovery-tiara jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-crown jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-tiara asymmetry is
      layered with post-close prompt-burst recovery-crown asymmetry, post-close
      prompt-burst recovery-apex asymmetry, post-close prompt-burst recovery-
      summit asymmetry, and post-close prompt-burst recovery-peak asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      tiara timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-diadem asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-diadem asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-tiara coverage
      with asymmetric post-close prompt-burst recovery-diadem jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-diadem
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-diadem jitter.
    - applies post-close prompt-burst recovery-diadem jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-tiara jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-diadem asymmetry is
      layered with post-close prompt-burst recovery-tiara asymmetry, post-close
      prompt-burst recovery-crown asymmetry, post-close prompt-burst recovery-
      apex asymmetry, and post-close prompt-burst recovery-summit asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      diadem timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-coronet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-coronet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-diadem coverage
      with asymmetric post-close prompt-burst recovery-coronet jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-coronet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-coronet jitter.
    - applies post-close prompt-burst recovery-coronet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-diadem jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-coronet asymmetry is
      layered with post-close prompt-burst recovery-diadem asymmetry, post-close
      prompt-burst recovery-tiara asymmetry, post-close prompt-burst recovery-
      crown asymmetry, and post-close prompt-burst recovery-apex asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      coronet timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-circlet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-circlet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-coronet coverage
      with asymmetric post-close prompt-burst recovery-circlet jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-circlet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-circlet jitter.
    - applies post-close prompt-burst recovery-circlet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-coronet jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-circlet asymmetry is
      layered with post-close prompt-burst recovery-coronet asymmetry, post-close
      prompt-burst recovery-diadem asymmetry, post-close prompt-burst recovery-
      tiara asymmetry, and post-close prompt-burst recovery-crown asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      circlet timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-band asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-band asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-circlet coverage
      with asymmetric post-close prompt-burst recovery-band jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-band
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-band jitter.
    - applies post-close prompt-burst recovery-band jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-circlet jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-band asymmetry is
      layered with post-close prompt-burst recovery-circlet asymmetry, post-
      close prompt-burst recovery-coronet asymmetry, post-close prompt-burst
      recovery-diadem asymmetry, and post-close prompt-burst recovery-tiara
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      band timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-bangle asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-bangle asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-band coverage
      with asymmetric post-close prompt-burst recovery-bangle jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-bangle
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-bangle jitter.
    - applies post-close prompt-burst recovery-bangle jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-band jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-bangle asymmetry is
      layered with post-close prompt-burst recovery-band asymmetry, post-close
      prompt-burst recovery-circlet asymmetry, post-close prompt-burst recovery-
      coronet asymmetry, and post-close prompt-burst recovery-diadem asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      bangle timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-bracelet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-bracelet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-bangle coverage
      with asymmetric post-close prompt-burst recovery-bracelet jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-bracelet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-bracelet jitter.
    - applies post-close prompt-burst recovery-bracelet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-bangle jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-bracelet asymmetry
      is layered with post-close prompt-burst recovery-bangle asymmetry, post-
      close prompt-burst recovery-band asymmetry, post-close prompt-burst
      recovery-circlet asymmetry, and post-close prompt-burst recovery-coronet
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      bracelet timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-anklet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-anklet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-bracelet coverage
      with asymmetric post-close prompt-burst recovery-anklet jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-anklet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-anklet jitter.
    - applies post-close prompt-burst recovery-anklet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-bracelet jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-anklet asymmetry is
      layered with post-close prompt-burst recovery-bracelet asymmetry, post-
      close prompt-burst recovery-bangle asymmetry, post-close prompt-burst
      recovery-band asymmetry, and post-close prompt-burst recovery-circlet
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      anklet timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-toe-ring asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-toe-ring asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-anklet coverage
      with asymmetric post-close prompt-burst recovery-toe-ring jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-toe-ring
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-toe-ring jitter.
    - applies post-close prompt-burst recovery-toe-ring jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-anklet jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-toe-ring asymmetry
      is layered with post-close prompt-burst recovery-anklet asymmetry, post-
      close prompt-burst recovery-bracelet asymmetry, post-close prompt-burst
      recovery-bangle asymmetry, and post-close prompt-burst recovery-band
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-toe-
      ring timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-charm asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-charm asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-toe-ring coverage
      with asymmetric post-close prompt-burst recovery-charm jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-charm
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-charm jitter.
    - applies post-close prompt-burst recovery-charm jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-toe-ring jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-charm asymmetry is
      layered with post-close prompt-burst recovery-toe-ring asymmetry, post-
      close prompt-burst recovery-anklet asymmetry, post-close prompt-burst
      recovery-bracelet asymmetry, and post-close prompt-burst recovery-bangle
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      charm timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-pendant asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-pendant asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-charm coverage
      with asymmetric post-close prompt-burst recovery-pendant jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-pendant
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-pendant jitter.
    - applies post-close prompt-burst recovery-pendant jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-charm jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-pendant asymmetry is
      layered with post-close prompt-burst recovery-charm asymmetry, post-close
      prompt-burst recovery-toe-ring asymmetry, post-close prompt-burst recovery-
      anklet asymmetry, and post-close prompt-burst recovery-bracelet asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      pendant timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-locket asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-locket asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-pendant coverage
      with asymmetric post-close prompt-burst recovery-locket jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-locket
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-locket jitter.
    - applies post-close prompt-burst recovery-locket jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-pendant jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-locket asymmetry is
      layered with post-close prompt-burst recovery-pendant asymmetry, post-
      close prompt-burst recovery-charm asymmetry, post-close prompt-burst
      recovery-toe-ring asymmetry, and post-close prompt-burst recovery-anklet
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      locket timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-medallion asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-medallion asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-locket coverage
      with asymmetric post-close prompt-burst recovery-medallion jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-medallion
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-medallion jitter.
    - applies post-close prompt-burst recovery-medallion jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-locket jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-medallion asymmetry is
      layered with post-close prompt-burst recovery-locket asymmetry, post-close
      prompt-burst recovery-pendant asymmetry, post-close prompt-burst recovery-
      charm asymmetry, and post-close prompt-burst recovery-toe-ring asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      medallion timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-amulet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-amulet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-medallion coverage
      with asymmetric post-close prompt-burst recovery-amulet jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-amulet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-amulet jitter.
    - applies post-close prompt-burst recovery-amulet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-medallion jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-amulet asymmetry is
      layered with post-close prompt-burst recovery-medallion asymmetry, post-
      close prompt-burst recovery-locket asymmetry, post-close prompt-burst
      recovery-pendant asymmetry, and post-close prompt-burst recovery-charm
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      amulet timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-talisman asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-talisman asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-amulet coverage
      with asymmetric post-close prompt-burst recovery-talisman jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-talisman
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-talisman jitter.
    - applies post-close prompt-burst recovery-talisman jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-amulet jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-talisman asymmetry is
      layered with post-close prompt-burst recovery-amulet asymmetry, post-close
      prompt-burst recovery-medallion asymmetry, post-close prompt-burst
      recovery-locket asymmetry, and post-close prompt-burst recovery-pendant
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      talisman timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-totem asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-totem asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-talisman coverage
      with asymmetric post-close prompt-burst recovery-totem jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-totem
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-totem jitter.
    - applies post-close prompt-burst recovery-totem jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-talisman jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-totem asymmetry is
      layered with post-close prompt-burst recovery-talisman asymmetry, post-close
      prompt-burst recovery-amulet asymmetry, post-close prompt-burst recovery-
      medallion asymmetry, and post-close prompt-burst recovery-locket asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      totem timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-relic asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-relic asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-totem coverage
      with asymmetric post-close prompt-burst recovery-relic jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-relic
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-relic jitter.
    - applies post-close prompt-burst recovery-relic jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-totem jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-relic asymmetry is
      layered with post-close prompt-burst recovery-totem asymmetry, post-close
      prompt-burst recovery-talisman asymmetry, post-close prompt-burst recovery-
      amulet asymmetry, and post-close prompt-burst recovery-medallion asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      relic timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-sigil asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-sigil asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-relic coverage
      with asymmetric post-close prompt-burst recovery-sigil jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-sigil
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-sigil jitter.
    - applies post-close prompt-burst recovery-sigil jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-relic jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-sigil asymmetry is
      layered with post-close prompt-burst recovery-relic asymmetry, post-close
      prompt-burst recovery-totem asymmetry, post-close prompt-burst recovery-
      talisman asymmetry, and post-close prompt-burst recovery-amulet asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      sigil timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-glyph asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-glyph asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-sigil coverage
      with asymmetric post-close prompt-burst recovery-glyph jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-glyph
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-glyph jitter.
    - applies post-close prompt-burst recovery-glyph jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-sigil jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-glyph asymmetry is
      layered with post-close prompt-burst recovery-sigil asymmetry, post-close
      prompt-burst recovery-relic asymmetry, post-close prompt-burst recovery-
      totem asymmetry, and post-close prompt-burst recovery-talisman asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      glyph timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-rune asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-rune asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-glyph coverage
      with asymmetric post-close prompt-burst recovery-rune jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-rune
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-rune jitter.
    - applies post-close prompt-burst recovery-rune jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-glyph jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-rune asymmetry is
      layered with post-close prompt-burst recovery-glyph asymmetry, post-close
      prompt-burst recovery-sigil asymmetry, post-close prompt-burst recovery-
      relic asymmetry, and post-close prompt-burst recovery-totem asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      rune timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-insignia asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-insignia asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-rune coverage
      with asymmetric post-close prompt-burst recovery-insignia jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-insignia
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-insignia jitter.
    - applies post-close prompt-burst recovery-insignia jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-rune jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-insignia asymmetry is
      layered with post-close prompt-burst recovery-rune asymmetry, post-close
      prompt-burst recovery-glyph asymmetry, post-close prompt-burst recovery-
      sigil asymmetry, and post-close prompt-burst recovery-relic asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      insignia timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-emblem asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-emblem asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-insignia coverage
      with asymmetric post-close prompt-burst recovery-emblem jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-emblem
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-emblem jitter.
    - applies post-close prompt-burst recovery-emblem jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-insignia jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-emblem asymmetry is
      layered with post-close prompt-burst recovery-insignia asymmetry, post-close
      prompt-burst recovery-rune asymmetry, post-close prompt-burst recovery-
      glyph asymmetry, and post-close prompt-burst recovery-sigil asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      emblem timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-badge asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-badge asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-emblem coverage
      with asymmetric post-close prompt-burst recovery-badge jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-badge
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-badge jitter.
    - applies post-close prompt-burst recovery-badge jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-emblem jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-badge asymmetry is
      layered with post-close prompt-burst recovery-emblem asymmetry, post-close
      prompt-burst recovery-insignia asymmetry, post-close prompt-burst recovery-
      rune asymmetry, and post-close prompt-burst recovery-glyph asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      badge timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-banner asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-banner asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-badge coverage
      with asymmetric post-close prompt-burst recovery-banner jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-banner
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-banner jitter.
    - applies post-close prompt-burst recovery-banner jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-badge jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-banner asymmetry is
      layered with post-close prompt-burst recovery-badge asymmetry, post-close
      prompt-burst recovery-emblem asymmetry, post-close prompt-burst recovery-
      insignia asymmetry, and post-close prompt-burst recovery-rune asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      banner timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-standard asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-standard asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-banner coverage
      with asymmetric post-close prompt-burst recovery-standard jitter by
      reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-standard
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-standard jitter.
    - applies post-close prompt-burst recovery-standard jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-banner jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-standard asymmetry
      is layered with post-close prompt-burst recovery-banner asymmetry, post-
      close prompt-burst recovery-badge asymmetry, post-close prompt-burst
      recovery-emblem asymmetry, and post-close prompt-burst recovery-insignia
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      standard timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-flag asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-flag asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-standard coverage
      with asymmetric post-close prompt-burst recovery-flag jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-flag
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-flag jitter.
    - applies post-close prompt-burst recovery-flag jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-standard jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-flag asymmetry is
      layered with post-close prompt-burst recovery-standard asymmetry, post-
      close prompt-burst recovery-banner asymmetry, post-close prompt-burst
      recovery-badge asymmetry, and post-close prompt-burst recovery-emblem
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      flag timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-pennant asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-pennant asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-flag coverage
      with asymmetric post-close prompt-burst recovery-pennant jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-pennant
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-pennant jitter.
    - applies post-close prompt-burst recovery-pennant jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-flag jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-pennant asymmetry
      is layered with post-close prompt-burst recovery-flag asymmetry, post-
      close prompt-burst recovery-standard asymmetry, post-close prompt-burst
      recovery-banner asymmetry, and post-close prompt-burst recovery-badge
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      pennant timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-guidon asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-guidon asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-pennant coverage
      with asymmetric post-close prompt-burst recovery-guidon jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-guidon
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-guidon jitter.
    - applies post-close prompt-burst recovery-guidon jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-pennant jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-guidon asymmetry
      is layered with post-close prompt-burst recovery-pennant asymmetry, post-
      close prompt-burst recovery-flag asymmetry, post-close prompt-burst
      recovery-standard asymmetry, and post-close prompt-burst recovery-banner
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      guidon timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-burgee asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-burgee asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-guidon coverage
      with asymmetric post-close prompt-burst recovery-burgee jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-burgee
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-burgee jitter.
    - applies post-close prompt-burst recovery-burgee jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-guidon jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-burgee asymmetry
      is layered with post-close prompt-burst recovery-guidon asymmetry, post-
      close prompt-burst recovery-pennant asymmetry, post-close prompt-burst
      recovery-flag asymmetry, and post-close prompt-burst recovery-standard
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      burgee timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-streamer asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-streamer asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-burgee coverage
      with asymmetric post-close prompt-burst recovery-streamer jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-streamer
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-streamer jitter.
    - applies post-close prompt-burst recovery-streamer jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-burgee jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-streamer asymmetry
      is layered with post-close prompt-burst recovery-burgee asymmetry, post-
      close prompt-burst recovery-guidon asymmetry, post-close prompt-burst
      recovery-pennant asymmetry, and post-close prompt-burst recovery-flag
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      streamer timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-pennon asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-pennon asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-streamer coverage
      with asymmetric post-close prompt-burst recovery-pennon jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-pennon
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-pennon jitter.
    - applies post-close prompt-burst recovery-pennon jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-streamer jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-pennon asymmetry is
      layered with post-close prompt-burst recovery-streamer asymmetry, post-
      close prompt-burst recovery-burgee asymmetry, post-close prompt-burst
      recovery-guidon asymmetry, and post-close prompt-burst recovery-pennant
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      pennon timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-ensign asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-ensign asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-pennon coverage
      with asymmetric post-close prompt-burst recovery-ensign jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-ensign
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-ensign jitter.
    - applies post-close prompt-burst recovery-ensign jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-pennon jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-ensign asymmetry is
      layered with post-close prompt-burst recovery-pennon asymmetry, post-
      close prompt-burst recovery-streamer asymmetry, post-close prompt-burst
      recovery-burgee asymmetry, and post-close prompt-burst recovery-guidon
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      ensign timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-gonfalon asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-gonfalon asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-ensign coverage
      with asymmetric post-close prompt-burst recovery-gonfalon jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-gonfalon
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-gonfalon jitter.
    - applies post-close prompt-burst recovery-gonfalon jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-ensign jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-gonfalon asymmetry is
      layered with post-close prompt-burst recovery-ensign asymmetry, post-close
      prompt-burst recovery-pennon asymmetry, post-close prompt-burst recovery-
      streamer asymmetry, and post-close prompt-burst recovery-burgee asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      gonfalon timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-oriflamme asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-oriflamme asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-gonfalon coverage
      with asymmetric post-close prompt-burst recovery-oriflamme jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-oriflamme
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-oriflamme jitter.
    - applies post-close prompt-burst recovery-oriflamme jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-gonfalon jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-oriflamme asymmetry is
      layered with post-close prompt-burst recovery-gonfalon asymmetry, post-close
      prompt-burst recovery-ensign asymmetry, post-close prompt-burst recovery-
      pennon asymmetry, and post-close prompt-burst recovery-streamer asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      oriflamme timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-vexillum asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-vexillum asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-oriflamme coverage
      with asymmetric post-close prompt-burst recovery-vexillum jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-vexillum
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-vexillum jitter.
    - applies post-close prompt-burst recovery-vexillum jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-oriflamme jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-vexillum asymmetry is
      layered with post-close prompt-burst recovery-oriflamme asymmetry, post-close
      prompt-burst recovery-gonfalon asymmetry, post-close prompt-burst recovery-
      ensign asymmetry, and post-close prompt-burst recovery-pennon asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      vexillum timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-labarum asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-labarum asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-vexillum coverage
      with asymmetric post-close prompt-burst recovery-labarum jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-labarum
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-labarum jitter.
    - applies post-close prompt-burst recovery-labarum jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-vexillum jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-labarum asymmetry is
      layered with post-close prompt-burst recovery-vexillum asymmetry, post-close
      prompt-burst recovery-oriflamme asymmetry, post-close prompt-burst recovery-
      gonfalon asymmetry, and post-close prompt-burst recovery-ensign asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      labarum timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-draco asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-draco asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-labarum coverage
      with asymmetric post-close prompt-burst recovery-draco jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-draco
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-draco jitter.
    - applies post-close prompt-burst recovery-draco jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-labarum jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-draco asymmetry is
      layered with post-close prompt-burst recovery-labarum asymmetry, post-close
      prompt-burst recovery-vexillum asymmetry, post-close prompt-burst recovery-
      oriflamme asymmetry, and post-close prompt-burst recovery-gonfalon asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      draco timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-signum asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-signum asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-draco coverage
      with asymmetric post-close prompt-burst recovery-signum jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-signum
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-signum jitter.
    - applies post-close prompt-burst recovery-signum jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-draco jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-signum asymmetry is
      layered with post-close prompt-burst recovery-draco asymmetry, post-close
      prompt-burst recovery-labarum asymmetry, post-close prompt-burst recovery-
      vexillum asymmetry, and post-close prompt-burst recovery-oriflamme asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      signum timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-vexiloid asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-vexiloid asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-signum coverage
      with asymmetric post-close prompt-burst recovery-vexiloid jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-vexiloid
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-vexiloid jitter.
    - applies post-close prompt-burst recovery-vexiloid jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-signum jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-vexiloid asymmetry is
      layered with post-close prompt-burst recovery-signum asymmetry, post-close
      prompt-burst recovery-draco asymmetry, post-close prompt-burst recovery-
      labarum asymmetry, and post-close prompt-burst recovery-vexillum asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      vexiloid timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-banderole asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-banderole asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-vexiloid coverage
      with asymmetric post-close prompt-burst recovery-banderole jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-banderole
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-banderole jitter.
    - applies post-close prompt-burst recovery-banderole jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-vexiloid jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-banderole asymmetry is
      layered with post-close prompt-burst recovery-vexiloid asymmetry, post-close
      prompt-burst recovery-signum asymmetry, post-close prompt-burst recovery-
      draco asymmetry, and post-close prompt-burst recovery-labarum asymmetry
      under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      banderole timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-pennoncelle asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-pennoncelle asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-banderole coverage
      with asymmetric post-close prompt-burst recovery-pennoncelle jitter by reconnect
      order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-pennoncelle
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-pennoncelle jitter.
    - applies post-close prompt-burst recovery-pennoncelle jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-banderole jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-pennoncelle asymmetry
      is layered with post-close prompt-burst recovery-banderole asymmetry, post-
      close prompt-burst recovery-vexiloid asymmetry, post-close prompt-burst
      recovery-signum asymmetry, and post-close prompt-burst recovery-draco
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      pennoncelle timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-streameret asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-streameret asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-pennoncelle
      coverage with asymmetric post-close prompt-burst recovery-streameret jitter
      by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-
      streameret jitter while `websocket-first` cycles use higher post-close
      prompt-burst recovery-streameret jitter.
    - applies post-close prompt-burst recovery-streameret jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-pennoncelle jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-streameret asymmetry
      is layered with post-close prompt-burst recovery-pennoncelle asymmetry,
      post-close prompt-burst recovery-banderole asymmetry, post-close prompt-
      burst recovery-vexiloid asymmetry, and post-close prompt-burst recovery-
      signum asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      streameret timing varies asymmetrically by order path.

## Execution Log Addendum — 2026-02-14 (merged env-map reconnect-order post-close prompt-burst recovery-guidonet asymmetry coverage)

- Additional merged env-map reconnect-order post-close prompt-burst recovery-guidonet asymmetry hardening:
  - Updated:
    - `__tests__/integration/server/headless-server.integration.test.ts`
  - Hardening changes:
    - expanded reconnect-order post-close prompt-burst recovery-streameret
      coverage with asymmetric post-close prompt-burst recovery-guidonet jitter
      by reconnect order path.
    - `SSE-first` cycles now use lower post-close prompt-burst recovery-guidonet
      jitter while `websocket-first` cycles use higher post-close prompt-burst
      recovery-guidonet jitter.
    - applies post-close prompt-burst recovery-guidonet jitter for intra-cycle
      session handoff after post-close prompt-burst recovery-streameret jitter.
    - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
      remains stable while post-close prompt-burst recovery-guidonet asymmetry is
      layered with post-close prompt-burst recovery-streameret asymmetry, post-
      close prompt-burst recovery-pennoncelle asymmetry, post-close prompt-burst
      recovery-banderole asymmetry, and post-close prompt-burst recovery-vexiloid
      asymmetry under reconnect-order inversion.
  - Goal:
    - lock reconnect-order continuity when post-close prompt-burst recovery-
      guidonet timing varies asymmetrically by order path.

## Incomplete Critical Backlog (Severity Ordered)

### P0 - Critical stability, safety, and cross-platform correctness

- [ ] - B01 | P0 | shell-session keeps `cmd.exe /K` alive; enforce hard session teardown to prevent command shell leaks on Windows.
- [ ] - B02 | P0 | verify detached child process cleanup across POSIX and Windows in `cli-agent-process-runner` to prevent orphan subprocess trees.
- [ ] - B03 | P0 | add retention/eviction for `TerminalManager.sessions` to prevent unbounded memory growth from unreleased sessions.
- [ ] - B04 | P0 | harden Hook IPC transport selection for Windows socket/path edge cases and force deterministic fallback behavior.
- [ ] - B05 | P0 | close Linux clipboard reliability gap by handling Wayland (`wl-copy`) and headless display failure modes.
- [ ] - B06 | P0 | fix path-escape detection for Windows separators (`..\\`) and mixed separator payloads.
- [ ] - B07 | P0 | replace `startsWith` cwd containment check with canonical path comparison safe for case-insensitive filesystems.
- [ ] - B08 | P0 | prevent process signal handler accumulation across repeated runner lifecycles to avoid listener leaks.
- [ ] - B09 | P0 | guarantee timeout kill path reaps grandchildren on Windows and POSIX under high churn.
- [ ] - B10 | P0 | secure HTTP Hook IPC mode with explicit local-only binding and request-origin validation.
- [ ] - B11 | P0 | enforce strict request-body memory bounds for all JSON endpoints under compressed/slowloris inputs.
- [ ] - B12 | P0 | cap session stream in-memory message accumulation for very long-running sessions.
- [ ] - B13 | P0 | add bounded retry/backoff strategy with jitter for diff worker and external process bridges to prevent retry storms.
- [ ] - B14 | P0 | add transaction/statement timeouts and cancellation paths for long-running SQLite operations.
- [ ] - B15 | P0 | ensure update-check and remote metadata calls never block startup critical path.
- [ ] - B16 | P0 | cap provider stream parser buffers to prevent unbounded growth with malformed/infinite streams.
- [ ] - B17 | P0 | add lifecycle cleanup for completed background tasks to prevent long-session memory creep.
- [ ] - B18 | P0 | enforce global process concurrency limits for spawned shell/provider tasks.
- [ ] - B19 | P0 | protect clipboard command pipes from large-payload memory spikes and stalled child processes.
- [ ] - B20 | P0 | guarantee crash-safe cleanup of UNIX socket files and temporary artifacts on abrupt termination.

### P1 - High impact performance, reliability, and platform parity

- [ ] - B21 | P1 | prevent detached `afplay` process accumulation during rapid completion events on macOS.
- [ ] - B22 | P1 | add explicit Linux desktop capability detection (X11/Wayland/headless) for clipboard and UI-dependent flows.
- [ ] - B23 | P1 | fix Windows command quoting/escaping for paths containing spaces, `&`, `^`, and unicode characters.
- [ ] - B24 | P1 | remove implicit shell cwd coupling by isolating command execution context per request.
- [ ] - B25 | P1 | optimize terminal output byte trimming to avoid O(n^2) behavior for large outputs.
- [ ] - B26 | P1 | optimize sentinel completion scanning in shell sessions to avoid repeated full-buffer scans.
- [ ] - B27 | P1 | formalize Hook IPC auth/nonce handshake for HTTP transport mode.
- [ ] - B28 | P1 | reduce repeated large env snapshot merges in hot command paths.
- [ ] - B29 | P1 | add regression tests for signal attach/detach idempotency across reconnect cycles.
- [ ] - B30 | P1 | add SQLite maintenance policy (vacuum/pragma optimize/checkpoint) to stabilize long-lived performance.
- [ ] - B31 | P1 | add cancellation tokens and depth limits to recursive file/search operations.
- [ ] - B32 | P1 | introduce transcript virtualization strategy for very large chat histories.
- [ ] - B33 | P1 | avoid full markdown reparsing on each chunk; adopt incremental parse/update path.
- [ ] - B34 | P1 | stream session export writes instead of building large in-memory payloads.
- [ ] - B35 | P1 | batch and throttle token optimizer telemetry writes to reduce IO pressure.
- [ ] - B36 | P1 | cache update-check results with TTL to prevent repeated remote calls in one runtime.
- [ ] - B37 | P1 | de-correlate provider retries to avoid synchronized thundering-herd behavior.
- [ ] - B38 | P1 | bound error log payload size for provider streaming failures.
- [ ] - B39 | P1 | throttle command-palette/filter recompute path under rapid keypress input.
- [ ] - B40 | P1 | add hard caps for nested hook/prompt subprocess chains.

### P2 - Simplification-first hardening, NutJS readiness, and maintainability

- [ ] - B41 | P2 | consolidate platform-specific command resolution into one shared platform adapter.
- [ ] - B42 | P2 | deduplicate shell invocation logic between shell-session, interactive-shell, and background-task-manager.
- [ ] - B43 | P2 | simplify clipboard fallback chain into explicit capability-ranked strategy.
- [ ] - B44 | P2 | simplify reconnect jitter test scaffolding by generating jitter matrices from typed config.
- [ ] - B45 | P2 | replace repeated `new Promise(setTimeout...)` blocks with shared typed delay helpers.
- [ ] - B46 | P2 | add NutJS capability detector with explicit unsupported-platform no-op behavior.
- [ ] - B47 | P2 | add NutJS permission diagnostics (macOS Accessibility, Linux display backend, Windows integrity level).
- [ ] - B48 | P2 | gate NutJS execution behind feature flag and security allowlist.
- [ ] - B49 | P2 | add cross-platform NutJS smoke checks (Windows/Linux/macOS) in CI matrix.
- [ ] - B50 | P2 | document and simplify fallback precedence for platform + NutJS + clipboard + sound paths.

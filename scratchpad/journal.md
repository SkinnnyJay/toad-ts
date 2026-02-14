# Scratchpad Journal

## 2026-02-14 (B31 recursive search depth/cancellation hardening)

### Summary
- Completed P1 backlog item B31 in `PLAN3.md` by adding bounded recursive
  search traversal and cancellation support.
- Updated:
  - `src/config/limits.ts`
  - `src/core/search/search-service.ts`
  - `__tests__/unit/core/search-service.unit.test.ts`
- Added:
  - explicit max-depth bounds for glob index and rg text-search paths,
  - AbortSignal cancellation checks and rg subprocess cancel handling with
    deterministic cancellation errors.
- Added focused unit coverage for bounded depth and cancellation behavior.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/search-service.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B30 SQLite maintenance policy hardening)

### Summary
- Completed P1 backlog item B30 in `PLAN3.md` by adding explicit SQLite
  maintenance lifecycle policy for long-running runtimes.
- Updated:
  - `src/config/limits.ts` with bounded maintenance cadence constants.
  - `src/store/persistence/sqlite-storage.ts` with post-save best-effort
    optimize/checkpoint/vacuum scheduling and WAL autocheckpoint setup.
  - `__tests__/unit/store/sqlite-storage.unit.test.ts` with focused policy
    cadence and failure-tolerance coverage.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/store/sqlite-storage.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B29 reconnect signal idempotency regression coverage)

### Summary
- Completed P1 backlog item B29 in `PLAN3.md` by adding reconnect-cycle signal
  attach/detach idempotency tests.
- Updated:
  - `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
- Added regression assertions that:
  - SIGINT/SIGTERM listener counts remain stable across repeated
    run/disconnect cycles,
  - repeated `disconnect()` calls stay idempotent without accumulating process
    signal handlers.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B28 env snapshot merge reduction hardening)

### Summary
- Completed P1 backlog item B28 in `PLAN3.md` by reducing repeated large env
  snapshot merges in hot command paths.
- Updated:
  - `src/tools/shell-session.ts`
  - `src/tools/terminal-manager.ts`
- Changes:
  - precomputed runtime base env snapshots at manager/session construction,
  - avoided repeated `EnvManager.getSnapshot()` merge work for each queued
    command/session creation unless request-level env overrides are present.
- Added focused regression coverage in:
  - `__tests__/unit/tools/shell-session.unit.test.ts`
  - `__tests__/unit/tools/terminal-manager.unit.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/terminal-manager.unit.test.ts __tests__/unit/tools/shell-session.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B27 Hook IPC auth/nonce handshake hardening)

### Summary
- Completed P1 backlog item B27 in `PLAN3.md` by formalizing Hook IPC HTTP
  transport authentication via explicit token + nonce handshake.
- Added `src/constants/hook-ipc-auth.ts` and extended env key constants with
  dedicated hook auth token/nonce keys.
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - generates HTTP auth token/nonce for server lifecycle,
  - enforces auth guard checks on HTTP requests,
  - exposes auth metadata through HTTP endpoint descriptors.
- Updated `src/core/cursor/hooks-config-generator.ts`:
  - emits hook auth env vars for HTTP endpoints,
  - forwards auth headers from node/bash hook shims for HTTP posts.
- Expanded focused coverage across:
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - `__tests__/unit/core/cursor/hooks-config-generator.unit.test.ts`
  - `__tests__/unit/core/cursor/cursor-cli-harness.unit.test.ts`
  - `__tests__/integration/core/cursor-harness.integration.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/unit/core/cursor/hooks-config-generator.unit.test.ts __tests__/unit/core/cursor/cursor-cli-harness.unit.test.ts __tests__/integration/core/cursor-harness.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B26 shell-session sentinel scan optimization)

### Summary
- Completed P1 backlog item B26 in `PLAN3.md` by optimizing shell-session
  completion sentinel scanning.
- Updated `src/tools/shell-session.ts`:
  - introduced bounded sentinel search window tracking instead of scanning the
    full stdout buffer on each chunk append,
  - preserved chunk-boundary correctness with backtracking around sentinel
    boundaries,
  - reset search tracking cleanly across command lifecycle transitions.
- Expanded `__tests__/unit/tools/shell-session.unit.test.ts` with split-sentinel
  chunk regression coverage.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/shell-session.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B25 terminal byte-trim O(n) hardening)

### Summary
- Completed P1 backlog item B25 in `PLAN3.md` by replacing terminal output
  trimming’s iterative byte-length loop with a linear UTF-8 buffer strategy.
- Updated `src/tools/terminal-manager.ts`:
  - switched to byte-buffer slicing at last-`limit` bytes,
  - resynchronized to UTF-8 codepoint boundaries before decode,
  - preserved prior truncation signaling semantics.
- Updated `__tests__/unit/tools/terminal-manager.unit.test.ts` with focused
  regression coverage for:
  - ascii trimming behavior,
  - multibyte UTF-8 trimming without replacement artifacts.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/terminal-manager.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B24 shell cwd per-request isolation hardening)

### Summary
- Completed P1 backlog item B24 in `PLAN3.md` by removing hidden shell cwd
  coupling across sequential commands.
- Updated `src/tools/shell-session.ts`:
  - removed carried `currentCwd` state usage across commands,
  - always resolves each command cwd from request options or baseDir,
  - emits deterministic cwd preamble for each command execution.
- Expanded `__tests__/unit/tools/shell-session.unit.test.ts` with regression
  coverage proving that a command with custom cwd does not influence the next
  command’s cwd when omitted.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/shell-session.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B23 Windows command quoting hardening)

### Summary
- Completed P1 backlog item B23 in `PLAN3.md` by hardening Windows command
  quoting/escaping paths.
- Added `src/utils/windows-command.utils.ts`:
  - Windows value quoting helper,
  - `cmd.exe` exec arg builder with `/S /C` quoted command payloads.
- Updated Windows command pathways:
  - `src/tools/interactive-shell.ts`
  - `src/tools/background-task-manager.ts`
  - `src/tools/shell-session.ts`
  - `src/utils/editor/externalEditor.ts`
- Added focused unit coverage in:
  - `__tests__/unit/utils/windows-command.utils.unit.test.ts`
  - `__tests__/unit/tools/shell-session.unit.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/shell-session.unit.test.ts __tests__/unit/utils/windows-command.utils.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B22 Linux desktop capability detection hardening)

### Summary
- Completed P1 backlog item B22 in `PLAN3.md` by adding explicit Linux desktop
  capability detection for clipboard and UI-dependent slash-command paths.
- Added:
  - `src/constants/linux-desktop-capabilities.ts`
  - `src/utils/linux-desktop-capability.utils.ts`
- Updated:
  - `src/utils/clipboard/clipboard.utils.ts` to use shared capability detection
    for backend selection.
  - `src/ui/components/chat/slash-command-actions.ts` to provide explicit
    headless Linux clipboard unavailability message for `/copy`.
  - `src/constants/slash-command-messages.ts` with a headless Linux copy
    unavailability message.
- Added focused coverage in:
  - `__tests__/unit/utils/linux-desktop-capability.utils.unit.test.ts`
  - `__tests__/unit/ui/slash-command-runner.unit.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/linux-desktop-capability.utils.unit.test.ts __tests__/unit/utils/clipboard.utils.unit.test.ts __tests__/unit/ui/slash-command-runner.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B21 macOS completion-sound process retention hardening)

### Summary
- Completed P1 backlog item B21 in `PLAN3.md` by preventing completion-sound
  subprocess accumulation on macOS.
- Updated `src/utils/sound/completion-sound.utils.ts` with:
  - single-active-child guard for `afplay`,
  - close/error lifecycle reset handling,
  - non-detached spawn mode to avoid detached process accumulation.
- Added `resetCompletionSoundStateForTests` helper for deterministic tests.
- Added focused unit coverage in
  `__tests__/unit/utils/completion-sound.utils.unit.test.ts`.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/completion-sound.utils.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B20 crash-safe temp artifact cleanup hardening)

### Summary
- Completed P0 backlog item B20 in `PLAN3.md` by adding crash-safe cleanup for
  unix sockets and temporary artifact directories.
- Added `src/utils/temp-artifact-cleanup.utils.ts`:
  - artifact registry with type-aware cleanup,
  - best-effort cleanup hooks on process `exit`, `SIGINT`, and `SIGTERM`,
  - deterministic test helpers.
- Integrated artifact registration in:
  - `src/core/cursor/hook-ipc-server.ts` (unix socket artifacts),
  - `src/utils/editor/externalEditor.ts` (editor temp directories).
- Added focused unit coverage in
  `__tests__/unit/utils/temp-artifact-cleanup.utils.unit.test.ts`.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/temp-artifact-cleanup.utils.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B19 clipboard pipe bounds/stall hardening)

### Summary
- Completed P0 backlog item B19 in `PLAN3.md` by hardening clipboard command
  pipe size/time bounds.
- Updated `src/utils/clipboard/clipboard.utils.ts` with:
  - pre-spawn max clipboard payload byte cap,
  - stall timeout for clipboard child completion,
  - deterministic SIGTERM kill on stall timeout,
  - guarded single-resolution behavior for error/close/timeout races.
- Added clipboard limits in `src/config/limits.ts`:
  - `CLIPBOARD_PIPE_MAX_BYTES`
  - `CLIPBOARD_PIPE_TIMEOUT_MS`
- Expanded `__tests__/unit/utils/clipboard.utils.unit.test.ts` with:
  - oversized payload rejection without spawning,
  - stalled child timeout + kill-path verification.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/clipboard.utils.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B18 spawned-process concurrency guard hardening)

### Summary
- Completed P0 backlog item B18 in `PLAN3.md` by adding global spawned-process
  concurrency guards.
- Added shared utility `src/utils/process-concurrency.utils.ts`:
  - process-slot acquire/release guard with global active counter,
  - child lifecycle binding helper for deterministic slot release on
    close/error,
  - test helpers for deterministic unit isolation.
- Applied concurrency guard integration in:
  - `src/core/cli-agent/cli-agent-process-runner.ts`
  - `src/tools/terminal-manager.ts`
  - `src/tools/interactive-shell.ts`
  - `src/core/terminal-handler.ts`
  - `src/core/search/search-service.ts`
- Added `PROCESS_CONCURRENCY_MAX` in `src/config/limits.ts`.
- Added focused unit coverage in
  `__tests__/unit/utils/process-concurrency.utils.unit.test.ts`.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/process-concurrency.utils.unit.test.ts __tests__/unit/core/terminal-handler.unit.test.ts __tests__/unit/tools/terminal-manager.unit.test.ts __tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts __tests__/unit/core/search-service.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B17 background-task lifecycle retention hardening)

### Summary
- Completed P0 backlog item B17 in `PLAN3.md` by adding lifecycle retention for
  completed background tasks.
- Updated `src/store/background-task-store.ts` with:
  - completed-task prune pipeline on add/update/remove paths,
  - status-aware terminal-task classification reuse,
  - max-entry + TTL retention enforcement while preserving running tasks.
- Added retention constants in `src/config/limits.ts`:
  - `BACKGROUND_TASK_COMPLETED_MAX_ENTRIES`
  - `BACKGROUND_TASK_COMPLETED_RETENTION_MS`
- Added focused unit coverage in
  `__tests__/unit/store/background-task-store.unit.test.ts` for:
  - completed history capping,
  - stale completed-task eviction while preserving running/fresh tasks.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/store/background-task-store.unit.test.ts __tests__/unit/store/background-cleanup.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B16 provider parser-buffer cap hardening)

### Summary
- Completed P0 backlog item B16 in `PLAN3.md` by capping provider stream parser
  buffers for malformed/infinite chunk paths.
- Added `src/core/providers/stream-parser-buffer.ts`:
  - shared append+split helper with max-byte cap and overflow newline
    resynchronization semantics.
- Applied shared capped parser helper in:
  - `src/core/providers/anthropic-provider.ts`
  - `src/core/providers/openai-provider.ts`
  - `src/core/providers/openai-compatible-provider.ts`
  - `src/core/providers/ollama-provider.ts`
- Added `PROVIDER_STREAM_PARSER_BUFFER_MAX_BYTES` in `src/config/limits.ts`.
- Added focused unit coverage in
  `__tests__/unit/core/stream-parser-buffer.unit.test.ts`.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/stream-parser-buffer.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B15 startup non-blocking update-check hardening)

### Summary
- Completed P0 backlog item B15 in `PLAN3.md` by hardening startup update-check
  behavior to avoid critical-path blocking.
- Updated `src/utils/update-check.ts` with:
  - deferred scheduler (`scheduleUpdateCheck`) for background execution,
  - in-flight dedupe guards,
  - resilient catch paths that swallow scheduler failures,
  - test reset helper for deterministic unit coverage.
- Updated `src/cli.ts` to use `scheduleUpdateCheck()` instead of direct
  `void checkForUpdates()` calls on startup paths.
- Expanded `__tests__/unit/utils/update-check.unit.test.ts` to verify:
  - deduped in-flight scheduling behavior,
  - rerun after prior completion,
  - rejection resilience without scheduler lockup.
- Applied B14 compatibility follow-up in `src/store/persistence/sqlite-storage.ts`:
  - moved save snapshot transaction timeout path to interactive transaction
    callback overload compatible with current Prisma typings.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/update-check.unit.test.ts __tests__/e2e/cli-subcommands.e2e.test.ts` ✅
  - `npx vitest run __tests__/unit/utils/update-check.unit.test.ts __tests__/integration/store/persistence-sqlite.integration.test.ts __tests__/integration/store/sqlite-storage.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B14 SQLite timeout/cancellation hardening)

### Summary
- Completed P0 backlog item B14 in `PLAN3.md` by hardening SQLite operation
  timeout and cancellation behavior.
- Updated `src/store/persistence/sqlite-storage.ts` with:
  - statement-level timeout wrappers for load/search/history flows,
  - transaction timeout wrapper for snapshot save flow.
- Updated `src/store/persistence/sqlite-provider.ts` worker client with:
  - request timeout/cancellation handling,
  - timed-out worker restart/recovery path,
  - deterministic pending-request rejection on close/restart.
- Added timeout constants in `src/config/timeouts.ts`.
- Added `__tests__/unit/store/sqlite-provider.unit.test.ts` coverage for worker
  timeout restart behavior.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/store/sqlite-provider.unit.test.ts __tests__/integration/store/persistence-sqlite.integration.test.ts __tests__/integration/store/sqlite-storage.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B13 bounded retry jitter hardening for worker/process bridges)

### Summary
- Completed P0 backlog item B13 in `PLAN3.md` by hardening retry behavior in
  shared async utility and diff-worker bridge paths.
- Updated `src/utils/async/retryWithBackoff.ts` to support bounded retry jitter
  with configurable ratio/random source while preserving bounded exponential
  delay caps.
- Updated `src/utils/diff/diff-worker-client.ts` to use bounded retry-with-jitter
  for diff worker requests.
- Added retry and diff-worker retry constants in `src/config/limits.ts`.
- Expanded `__tests__/unit/utils/retry-with-backoff.unit.test.ts` with bounded
  jitter behavior assertions.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/retry-with-backoff.unit.test.ts __tests__/unit/core/claude-cli-harness.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B12 in-memory session message cap hardening)

### Summary
- Completed P0 backlog item B12 in `PLAN3.md` by hardening app-store message
  retention semantics for long-running sessions.
- Added `SESSION_MESSAGES_MAX_IN_MEMORY` in `src/config/limits.ts`.
- Updated `src/store/app-store.ts` append path to:
  - cap per-session `messageIds` length,
  - evict oldest over-cap messages from global `messages` map for that session,
  - preserve other sessions’ messages.
- Expanded `__tests__/unit/store/app-store.unit.test.ts` with:
  - deterministic oldest-first eviction assertions,
  - cross-session isolation checks.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/store/app-store.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B11 strict request-body memory bounds hardening)

### Summary
- Completed P0 backlog item B11 in `PLAN3.md` by hardening shared request-body
  parsing across JSON server endpoints.
- Updated `src/server/request-body.ts` with:
  - preflight `content-length` validation,
  - unsupported `content-encoding` rejection,
  - bounded body-read duration via timeout,
  - guarded stream draining on rejection paths.
- Added `SERVER_BODY_READ_TIMEOUT_MS` constants in:
  - `src/config/limits.ts`
  - `src/config/server.ts`
- Expanded coverage in:
  - `__tests__/unit/server/request-body.unit.test.ts`
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/request-body.unit.test.ts` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "returns request body too large for oversized payloads|rejects compressed json payloads with invalid-request errors"` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B10 Hook IPC HTTP local-origin lock down hardening)

### Summary
- Completed P0 backlog item B10 in `PLAN3.md` by hardening
  `src/core/cursor/hook-ipc-server.ts`.
- Enforced local-only Hook IPC HTTP host binding with fallback from non-local
  host configuration values to loopback.
- Added HTTP origin guard that validates remote address + host header localness
  before processing Hook IPC requests in HTTP mode.
- Added explicit forbidden response semantics/constants:
  - `HTTP_STATUS.FORBIDDEN`
  - `SERVER_RESPONSE_MESSAGE.ORIGIN_NOT_ALLOWED`
- Expanded unit coverage in:
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
  - `__tests__/unit/constants/http-status.unit.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/unit/constants/http-status.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B09 timeout kill escalation hardening for cli-agent runners)

### Summary
- Completed P0 backlog item B09 in `PLAN3.md` by hardening timeout kill-path
  behavior in `src/core/cli-agent/cli-agent-process-runner.ts`.
- Timeout handling now initiates with `SIGTERM` and escalates to `SIGKILL` when
  the process remains alive beyond grace windows.
- Added close-aware signal/wait helper semantics and warning logs for non-closing
  process scenarios after escalation attempts.
- Expanded
  `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
  with timeout escalation signal-order assertions.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B08 signal-handler lifecycle hardening for cli-agent runners)

### Summary
- Completed P0 backlog item B08 in `PLAN3.md` by hardening
  `src/core/cli-agent/cli-agent-process-runner.ts`.
- Updated runner child cleanup path to detach SIGINT/SIGTERM listeners whenever
  active streaming process lifecycle completes, preventing listener retention.
- Expanded
  `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
  with repeated streaming lifecycle assertions that verify signal listener
  counts return to baseline after each run.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B07 canonical base-path containment hardening)

### Summary
- Completed P0 backlog item B07 in `PLAN3.md` by replacing prefix-based base
  containment checks with canonical relative-path containment semantics.
- Added shared utility `src/utils/pathContainment.utils.ts` and integrated it
  into:
  - `src/core/terminal-handler.ts`
  - `src/tools/terminal-manager.ts`
  - `src/tools/shell-session.ts`
  - `src/core/fs-handler.ts`
- Added win32 case-insensitive normalization behavior in containment checks to
  match case-insensitive filesystem expectations.
- Added focused unit coverage for sibling-prefix rejection and containment
  correctness in:
  - `__tests__/unit/core/terminal-handler.unit.test.ts`
  - `__tests__/unit/tools/terminal-manager.unit.test.ts`
  - `__tests__/unit/tools/shell-session.unit.test.ts`
  - `__tests__/unit/core/fs-handler.unit.test.ts`
  - `__tests__/unit/utils/path-containment.utils.unit.test.ts`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/terminal-handler.unit.test.ts __tests__/unit/tools/terminal-manager.unit.test.ts __tests__/unit/tools/shell-session.unit.test.ts __tests__/unit/core/fs-handler.unit.test.ts __tests__/unit/utils/path-containment.utils.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B06 path-escape detection hardening for Windows/mixed separators)

### Summary
- Completed P0 backlog item B06 in `PLAN3.md` by hardening path-traversal
  detection shared across terminal execution code paths.
- Added shared utility `src/utils/pathEscape.utils.ts` for separator-normalized
  parent traversal detection.
- Updated `src/core/terminal-handler.ts` and
  `src/tools/terminal-manager.ts` to use the shared utility, closing bypasses
  with Windows-style (`..\\`) and mixed-separator traversal payloads.
- Expanded unit coverage in:
  - `__tests__/unit/core/terminal-handler.unit.test.ts`
  - `__tests__/unit/tools/terminal-manager.unit.test.ts`
  to assert Windows-style and mixed-separator rejection behavior.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/terminal-handler.unit.test.ts __tests__/unit/tools/terminal-manager.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B05 Linux clipboard Wayland/headless reliability hardening)

### Summary
- Completed P0 backlog item B05 in `PLAN3.md` by hardening
  `src/utils/clipboard/clipboard.utils.ts`.
- Added Wayland-aware clipboard command selection (`wl-copy` first) and
  constrained X11 command fallback (`xclip`/`xsel`) to sessions with X11
  display availability.
- Added explicit headless Linux behavior: no clipboard command spawn attempts
  when neither Wayland nor X11 display signals are present.
- Added display/session env-key constants in `src/constants/env-keys.ts` and
  focused unit coverage in
  `__tests__/unit/utils/clipboard.utils.unit.test.ts`.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/clipboard.utils.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B04 Hook IPC transport fallback hardening)

### Summary
- Completed P0 backlog item B04 in `PLAN3.md` by hardening
  `src/core/cursor/hook-ipc-server.ts`.
- Added deterministic fallback behavior: when unix-socket startup fails, Hook
  IPC now falls back to HTTP transport and continues serving hook requests.
- Updated stop/cleanup semantics to use the active endpoint transport, avoiding
  mismatched unix-socket unlink cleanup when fallback selected HTTP.
- Expanded
  `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` with explicit
  unix-socket startup failure fallback coverage and end-to-end hook roundtrip
  assertions over fallback HTTP transport.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B03 terminal session retention/eviction capacity hardening)

### Summary
- Completed P0 backlog item B03 in `PLAN3.md` by hardening
  `src/tools/terminal-manager.ts`.
- Added bounded terminal session capacity (`maxSessions`) with default
  `LIMIT.TERMINAL_SESSION_MAX_SESSIONS`.
- Implemented deterministic eviction of oldest completed sessions before
  admitting new sessions at capacity, plus explicit hard-cap rejection when
  only active sessions remain.
- Added focused unit coverage in
  `__tests__/unit/tools/terminal-manager.unit.test.ts` for:
  - completed-session eviction behavior,
  - active-session preservation during eviction,
  - capacity rejection semantics when no completed sessions are evictable.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/terminal-manager.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B02 detached process-tree cleanup hardening for cli-agent runners)

### Summary
- Completed P0 backlog item B02 in `PLAN3.md` by hardening
  `src/core/cli-agent/cli-agent-process-runner.ts`.
- Added explicit injectable process-tree kill strategy (`killTreeFn`) to make
  detached-process cleanup behavior deterministic and testable across
  POSIX/Windows.
- Hardened Windows process-tree teardown using bounded-timeout
  `taskkill /PID <pid> /T /F` with direct child-kill fallback.
- Expanded
  `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts` with:
  - detached spawn semantics assertions (POSIX detached vs Windows non-detached),
  - fallback kill behavior assertions for both Windows and POSIX when process-tree
    kill paths fail during streaming disconnect cleanup.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (B01 deterministic shell-session teardown for Windows cmd lifecycle)

### Summary
- Completed P0 backlog item B01 in `PLAN3.md` by hardening deterministic
  teardown behavior in `src/tools/shell-session.ts`.
- Added disposal-path command rejection semantics so active and queued shell
  commands fail fast with a canonical disposal error on teardown.
- Hardened Windows shell teardown path to force `SIGTERM` then `SIGKILL` for
  `cmd.exe /K` lifecycles.
- Added `ShellSessionManager.dispose()` and wired `Chat` runtime cleanup in
  `src/ui/components/chat/Chat.tsx` so shell sessions are disposed when tool
  runtime instances are replaced/unmounted.
- Added focused unit coverage in
  `__tests__/unit/tools/shell-session.unit.test.ts` validating Windows hard
  teardown signals plus active/queued command rejection behavior.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/tools/shell-session.unit.test.ts` ✅
  - `npx vitest run __tests__/unit/ui/chat-components.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-vamplate asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-vamplate jitter per order path.
- Added order-path-specific recovery-vamplate jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-vamplate jitter in the intra-cycle handoff sequence after
  recovery-cartouche jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `bun run test` ❌ (`bun: command not found`)
  - `bun run build` ❌ (`bun: command not found`)
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-cartouche asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-cartouche jitter per order path.
- Added order-path-specific recovery-cartouche jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-cartouche jitter in the intra-cycle handoff sequence after
  recovery-helm jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-helm asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-helm jitter per order path.
- Added order-path-specific recovery-helm jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-helm jitter in the intra-cycle handoff sequence after
  recovery-mantling jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-mantling asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-mantling jitter per order path.
- Added order-path-specific recovery-mantling jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-mantling jitter in the intra-cycle handoff sequence after
  recovery-escutcheon jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-escutcheon asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-escutcheon jitter per order path.
- Added order-path-specific recovery-escutcheon jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-escutcheon jitter in the intra-cycle handoff sequence after
  recovery-livery jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-livery asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-livery jitter per order path.
- Added order-path-specific recovery-livery jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-livery jitter in the intra-cycle handoff sequence after
  recovery-pavilion jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pavilion asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pavilion jitter per order path.
- Added order-path-specific recovery-pavilion jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pavilion jitter in the intra-cycle handoff sequence after
  recovery-caparison jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-caparison asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-caparison jitter per order path.
- Added order-path-specific recovery-caparison jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-caparison jitter in the intra-cycle handoff sequence after
  recovery-torse jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-torse asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-torse jitter per order path.
- Added order-path-specific recovery-torse jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-torse jitter in the intra-cycle handoff sequence after
  recovery-compartment jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-compartment asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-compartment jitter per order path.
- Added order-path-specific recovery-compartment jitter constants and
  asymmetry assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-compartment jitter in the intra-cycle handoff sequence after
  recovery-supporter jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-supporter asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-supporter jitter per order path.
- Added order-path-specific recovery-supporter jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-supporter jitter in the intra-cycle handoff sequence after
  recovery-motto jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-motto asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-motto jitter per order path.
- Added order-path-specific recovery-motto jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-motto jitter in the intra-cycle handoff sequence after
  recovery-label jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-label asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-label jitter per order path.
- Added order-path-specific recovery-label jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-label jitter in the intra-cycle handoff sequence after
  recovery-trefoil jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-trefoil asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-trefoil jitter per order path.
- Added order-path-specific recovery-trefoil jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-trefoil jitter in the intra-cycle handoff sequence after
  recovery-tressure jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-tressure asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-tressure jitter per order path.
- Added order-path-specific recovery-tressure jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-tressure jitter in the intra-cycle handoff sequence after
  recovery-orle jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-orle asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-orle jitter per order path.
- Added order-path-specific recovery-orle jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-orle jitter in the intra-cycle handoff sequence after
  recovery-gyron jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-gyron asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-gyron jitter per order path.
- Added order-path-specific recovery-gyron jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-gyron jitter in the intra-cycle handoff sequence after
  recovery-fret jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-fret asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-fret jitter per order path.
- Added order-path-specific recovery-fret jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-fret jitter in the intra-cycle handoff sequence after
  recovery-cross jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-cross asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-cross jitter per order path.
- Added order-path-specific recovery-cross jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-cross jitter in the intra-cycle handoff sequence after
  recovery-pile jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pile asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pile jitter per order path.
- Added order-path-specific recovery-pile jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pile jitter in the intra-cycle handoff sequence after
  recovery-saltire jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-saltire asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-saltire jitter per order path.
- Added order-path-specific recovery-saltire jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-saltire jitter in the intra-cycle handoff sequence after
  recovery-pall jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pall asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pall jitter per order path.
- Added order-path-specific recovery-pall jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pall jitter in the intra-cycle handoff sequence after
  recovery-chief jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-chief asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-chief jitter per order path.
- Added order-path-specific recovery-chief jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-chief jitter in the intra-cycle handoff sequence after
  recovery-chevron jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-chevron asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-chevron jitter per order path.
- Added order-path-specific recovery-chevron jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-chevron jitter in the intra-cycle handoff sequence after
  recovery-fess jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-fess asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-fess jitter per order path.
- Added order-path-specific recovery-fess jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-fess jitter in the intra-cycle handoff sequence after
  recovery-pale jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pale asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pale jitter per order path.
- Added order-path-specific recovery-pale jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pale jitter in the intra-cycle handoff sequence after
  recovery-flaunches jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-flaunches asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-flaunches jitter per order path.
- Added order-path-specific recovery-flaunches jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-flaunches jitter in the intra-cycle handoff sequence after
  recovery-bend jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-bend asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-bend jitter per order path.
- Added order-path-specific recovery-bend jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-bend jitter in the intra-cycle handoff sequence after
  recovery-barry jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-barry asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-barry jitter per order path.
- Added order-path-specific recovery-barry jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-barry jitter in the intra-cycle handoff sequence after
  recovery-gurges jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-gurges asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-gurges jitter per order path.
- Added order-path-specific recovery-gurges jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-gurges jitter in the intra-cycle handoff sequence after
  recovery-fountain jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-fountain asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-fountain jitter per order path.
- Added order-path-specific recovery-fountain jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-fountain jitter in the intra-cycle handoff sequence after
  recovery-ogress jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-ogress asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-ogress jitter per order path.
- Added order-path-specific recovery-ogress jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-ogress jitter in the intra-cycle handoff sequence after
  recovery-golpe jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-golpe asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-golpe jitter per order path.
- Added order-path-specific recovery-golpe jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-golpe jitter in the intra-cycle handoff sequence after
  recovery-pomme jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pomme asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pomme jitter per order path.
- Added order-path-specific recovery-pomme jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pomme jitter in the intra-cycle handoff sequence after
  recovery-hurt jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-hurt asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-hurt jitter per order path.
- Added order-path-specific recovery-hurt jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-hurt jitter in the intra-cycle handoff sequence after
  recovery-pellet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pellet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pellet jitter per order path.
- Added order-path-specific recovery-pellet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pellet jitter in the intra-cycle handoff sequence after
  recovery-plate jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-plate asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-plate jitter per order path.
- Added order-path-specific recovery-plate jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-plate jitter in the intra-cycle handoff sequence after
  recovery-bezant jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-bezant asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-bezant jitter per order path.
- Added order-path-specific recovery-bezant jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-bezant jitter in the intra-cycle handoff sequence after
  recovery-torteau jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-torteau asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-torteau jitter per order path.
- Added order-path-specific recovery-torteau jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-torteau jitter in the intra-cycle handoff sequence after
  recovery-annulet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-annulet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-annulet jitter per order path.
- Added order-path-specific recovery-annulet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-annulet jitter in the intra-cycle handoff sequence after
  recovery-rustre jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-rustre asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-rustre jitter per order path.
- Added order-path-specific recovery-rustre jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-rustre jitter in the intra-cycle handoff sequence after
  recovery-mascle jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-mascle asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-mascle jitter per order path.
- Added order-path-specific recovery-mascle jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-mascle jitter in the intra-cycle handoff sequence after
  recovery-fusil jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-fusil asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-fusil jitter per order path.
- Added order-path-specific recovery-fusil jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-fusil jitter in the intra-cycle handoff sequence after
  recovery-lozenge jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-lozenge asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-lozenge jitter per order path.
- Added order-path-specific recovery-lozenge jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-lozenge jitter in the intra-cycle handoff sequence after
  recovery-billette jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-billette asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-billette jitter per order path.
- Added order-path-specific recovery-billette jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-billette jitter in the intra-cycle handoff sequence after
  recovery-roundel jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-roundel asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-roundel jitter per order path.
- Added order-path-specific recovery-roundel jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-roundel jitter in the intra-cycle handoff sequence after
  recovery-escarbuncle jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-escarbuncle asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-escarbuncle jitter per order
  path.
- Added order-path-specific recovery-escarbuncle jitter constants and
  asymmetry assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-escarbuncle jitter in the intra-cycle handoff sequence
  after recovery-inescutcheon jitter to stress websocket `SESSION_CREATED` and
  SSE `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-inescutcheon asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-inescutcheon jitter per order
  path.
- Added order-path-specific recovery-inescutcheon jitter constants and
  asymmetry assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-inescutcheon jitter in the intra-cycle handoff sequence
  after recovery-tassel jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-tassel asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-tassel jitter per order path.
- Added order-path-specific recovery-tassel jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-tassel jitter in the intra-cycle handoff sequence after
  recovery-ribbonet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-ribbonet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-ribbonet jitter per order path.
- Added order-path-specific recovery-ribbonet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-ribbonet jitter in the intra-cycle handoff sequence after
  recovery-pencel jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pencel asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pencel jitter per order path.
- Added order-path-specific recovery-pencel jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pencel jitter in the intra-cycle handoff sequence after
  recovery-ribband jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-ribband asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-ribband jitter per order path.
- Added order-path-specific recovery-ribband jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-ribband jitter in the intra-cycle handoff sequence after
  recovery-gonfanon jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-gonfanon asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-gonfanon jitter per order path.
- Added order-path-specific recovery-gonfanon jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-gonfanon jitter in the intra-cycle handoff sequence after
  recovery-baucan jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-baucan asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-baucan jitter per order path.
- Added order-path-specific recovery-baucan jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-baucan jitter in the intra-cycle handoff sequence after
  recovery-banneret jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-banneret asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-banneret jitter per order path.
- Added order-path-specific recovery-banneret jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-banneret jitter in the intra-cycle handoff sequence after
  recovery-chapeau jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-chapeau asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-chapeau jitter per order path.
- Added order-path-specific recovery-chapeau jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-chapeau jitter in the intra-cycle handoff sequence after
  recovery-fanion jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-fanion asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-fanion jitter per order path.
- Added order-path-specific recovery-fanion jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-fanion jitter in the intra-cycle handoff sequence after
  recovery-cornette jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-cornette asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-cornette jitter per order path.
- Added order-path-specific recovery-cornette jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-cornette jitter in the intra-cycle handoff sequence after
  recovery-guidonet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-guidonet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-guidonet jitter per order path.
- Added order-path-specific recovery-guidonet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-guidonet jitter in the intra-cycle handoff sequence after
  recovery-streameret jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-streameret asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-streameret jitter per order path.
- Added order-path-specific recovery-streameret jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-streameret jitter in the intra-cycle handoff sequence after
  recovery-pennoncelle jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pennoncelle asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pennoncelle jitter per order path.
- Added order-path-specific recovery-pennoncelle jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pennoncelle jitter in the intra-cycle handoff sequence after
  recovery-banderole jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-banderole asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-banderole jitter per order path.
- Added order-path-specific recovery-banderole jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-banderole jitter in the intra-cycle handoff sequence after
  recovery-vexiloid jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-vexiloid asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-vexiloid jitter per order path.
- Added order-path-specific recovery-vexiloid jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-vexiloid jitter in the intra-cycle handoff sequence after
  recovery-signum jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-signum asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-signum jitter per order path.
- Added order-path-specific recovery-signum jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-signum jitter in the intra-cycle handoff sequence after
  recovery-draco jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-draco asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-draco jitter per order path.
- Added order-path-specific recovery-draco jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-draco jitter in the intra-cycle handoff sequence after
  recovery-labarum jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-labarum asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-labarum jitter per order path.
- Added order-path-specific recovery-labarum jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-labarum jitter in the intra-cycle handoff sequence after
  recovery-vexillum jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-vexillum asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-vexillum jitter per order path.
- Added order-path-specific recovery-vexillum jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-vexillum jitter in the intra-cycle handoff sequence after
  recovery-oriflamme jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-oriflamme asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-oriflamme jitter per order path.
- Added order-path-specific recovery-oriflamme jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-oriflamme jitter in the intra-cycle handoff sequence after
  recovery-gonfalon jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-gonfalon asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-gonfalon jitter per order path.
- Added order-path-specific recovery-gonfalon jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-gonfalon jitter in the intra-cycle handoff sequence after
  recovery-ensign jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-ensign asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-ensign jitter per order path.
- Added order-path-specific recovery-ensign jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-ensign jitter in the intra-cycle handoff sequence after
  recovery-pennon jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pennon asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pennon jitter per order path.
- Added order-path-specific recovery-pennon jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pennon jitter in the intra-cycle handoff sequence after
  recovery-streamer jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-streamer asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-streamer jitter per order path.
- Added order-path-specific recovery-streamer jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-streamer jitter in the intra-cycle handoff sequence after
  recovery-burgee jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-burgee asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-burgee jitter per order path.
- Added order-path-specific recovery-burgee jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-burgee jitter in the intra-cycle handoff sequence after
  recovery-guidon jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-guidon asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-guidon jitter per order path.
- Added order-path-specific recovery-guidon jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-guidon jitter in the intra-cycle handoff sequence after
  recovery-pennant jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pennant asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pennant jitter per order path.
- Added order-path-specific recovery-pennant jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pennant jitter in the intra-cycle handoff sequence after
  recovery-flag jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-flag asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-flag jitter per order path.
- Added order-path-specific recovery-flag jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-flag jitter in the intra-cycle handoff sequence after
  recovery-standard jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-standard asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-standard jitter per order path.
- Added order-path-specific recovery-standard jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-standard jitter in the intra-cycle handoff sequence after
  recovery-banner jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-banner asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-banner jitter per order path.
- Added order-path-specific recovery-banner jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-banner jitter in the intra-cycle handoff sequence after
  recovery-badge jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-badge asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-badge jitter per order path.
- Added order-path-specific recovery-badge jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-badge jitter in the intra-cycle handoff sequence after
  recovery-emblem jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-emblem asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-emblem jitter per order path.
- Added order-path-specific recovery-emblem jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-emblem jitter in the intra-cycle handoff sequence after
  recovery-insignia jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-insignia asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-insignia jitter per order path.
- Added order-path-specific recovery-insignia jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-insignia jitter in the intra-cycle handoff sequence after
  recovery-rune jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-rune asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-rune jitter per order path.
- Added order-path-specific recovery-rune jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-rune jitter in the intra-cycle handoff sequence after
  recovery-glyph jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-glyph asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-glyph jitter per order path.
- Added order-path-specific recovery-glyph jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-glyph jitter in the intra-cycle handoff sequence after
  recovery-sigil jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-sigil asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-sigil jitter per order path.
- Added order-path-specific recovery-sigil jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-sigil jitter in the intra-cycle handoff sequence after
  recovery-relic jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-relic asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-relic jitter per order path.
- Added order-path-specific recovery-relic jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-relic jitter in the intra-cycle handoff sequence after
  recovery-totem jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-totem asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-totem jitter per order path.
- Added order-path-specific recovery-totem jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-totem jitter in the intra-cycle handoff sequence after
  recovery-talisman jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-talisman asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-talisman jitter per order path.
- Added order-path-specific recovery-talisman jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-talisman jitter in the intra-cycle handoff sequence after
  recovery-amulet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-brace asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-clamp coverage
    with asymmetric post-close prompt-burst recovery-brace jitter amplitudes
    per order path
  - added order-path brace asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryBraceJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryBraceJitterWebsocketFirstByCycleMs`
  - applied brace jitter for intra-cycle handoff after post-close prompt-burst
    recovery-clamp jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-clamp asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-bolt coverage
    with asymmetric post-close prompt-burst recovery-clamp jitter amplitudes
    per order path
  - added order-path clamp asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryClampJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryClampJitterWebsocketFirstByCycleMs`
  - applied clamp jitter for intra-cycle handoff after post-close prompt-burst
    recovery-bolt jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-bolt asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-lock coverage
    with asymmetric post-close prompt-burst recovery-bolt jitter amplitudes per
    order path
  - added order-path bolt asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryBoltJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryBoltJitterWebsocketFirstByCycleMs`
  - applied bolt jitter for intra-cycle handoff after post-close prompt-burst
    recovery-lock jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-lock asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-guard coverage
    with asymmetric post-close prompt-burst recovery-lock jitter amplitudes
    per order path
  - added order-path lock asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryLockJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryLockJitterWebsocketFirstByCycleMs`
  - applied lock jitter for intra-cycle handoff after post-close prompt-burst
    recovery-guard jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-guard asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-seal coverage
    with asymmetric post-close prompt-burst recovery-guard jitter amplitudes
    per order path
  - added order-path guard asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryGuardJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryGuardJitterWebsocketFirstByCycleMs`
  - applied guard jitter for intra-cycle handoff after post-close prompt-burst
    recovery-seal jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-seal asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-anchor coverage
    with asymmetric post-close prompt-burst recovery-seal jitter amplitudes per
    order path
  - added order-path seal asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoverySealJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoverySealJitterWebsocketFirstByCycleMs`
  - applied seal jitter for intra-cycle handoff after post-close prompt-burst
    recovery-anchor jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-anchor asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-finalize
    coverage with asymmetric post-close prompt-burst recovery-anchor jitter
    amplitudes per order path
  - added order-path anchor asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryAnchorJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryAnchorJitterWebsocketFirstByCycleMs`
  - applied anchor jitter for intra-cycle handoff after post-close prompt-
    burst recovery-finalize jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-finalize asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-checkpoint
    coverage with asymmetric post-close prompt-burst recovery-finalize jitter
    amplitudes per order path
  - added order-path finalize asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryFinalizeJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryFinalizeJitterWebsocketFirstByCycleMs`
  - applied finalize jitter for intra-cycle handoff after post-close prompt-
    burst recovery-checkpoint jitter to further harden reconnect inversion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (reconnect-order post-close prompt-burst recovery-checkpoint asymmetry)
- Updated:
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Changes:
  - expanded reconnect-order post-close prompt-burst recovery-transition
    coverage with asymmetric post-close prompt-burst recovery-checkpoint
    jitter amplitudes per order path
  - added order-path checkpoint asymmetry assertions for each cycle:
    - `postClosePromptBurstRecoveryCheckpointJitterSseFirstByCycleMs`
    - `postClosePromptBurstRecoveryCheckpointJitterWebsocketFirstByCycleMs`
  - applied checkpoint jitter for intra-cycle handoff after post-close prompt-
    burst recovery-transition jitter to increase reconnect-order stress
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands; bun/bunx unavailable in this shell):
    - `bun run lint` ❌ (`bun: command not found`)
    - `npx biome check . && npx eslint .` ✅
    - `bun run typecheck` ❌ (`bun: command not found`)
    - `npx tsc --noEmit` ✅
    - `bun run test` ❌ (`bun: command not found`)
    - `npx vitest run` ✅
    - `bun run build` ❌ (`bun: command not found`)
    - `npx tsup` ✅
    - `bun run check:literals:strict` ❌ (`bun: command not found`)
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (api/core classifier handler IDs)
- Updated:
  - `src/server/server-route-classifier.ts`
  - `src/server/headless-server.ts`
- Changes:
  - server-route classifier now returns explicit classifier handler ids for
    method-not-allowed and unhandled outcomes:
    - `api_route_classifier`
    - `core_route_classifier`
  - headless validation telemetry now logs those classifier handler ids for
    method-not-allowed and not-found responses.
- Extended tests:
  - `__tests__/unit/server/server-route-classifier.unit.test.ts`
    - added expectations for classifier handler ids
  - `__tests__/integration/server/headless-server.integration.test.ts`
    - existing coverage exercises updated telemetry paths
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (route-classifier validation telemetry)
- Updated:
  - `src/server/headless-server.ts`
  - `src/core/cursor/hook-ipc-server.ts`
- Changes:
  - headless route-classifier method-not-allowed/not-found responses now emit
    shared validation telemetry with handler id `route_classifier`
  - hook IPC method guard (non-POST) now emits shared validation telemetry with
    handler id `method_guard`
- Extended tests:
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
    - added method-not-allowed validation telemetry assertion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (session validation handler identifiers)
- Updated `src/server/headless-server.ts`:
  - introduced headless session route handler identifiers in validation
    telemetry (`session_create`, `session_prompt`)
  - localized Zod validation handling for session create/prompt schema parsing
    through shared validation helper while preserving response semantics
- Extended `__tests__/integration/server/headless-server.integration.test.ts`:
  - added invalid session prompt payload schema coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (file-search validation telemetry parity)
- Updated `src/server/api-routes.ts`:
  - file-search validation failures now emit shared standardized validation
    telemetry (`Request validation failed`) through `logRequestValidationFailure(...)`
  - applied to query/URL validation failures (missing, duplicate, malformed,
    whitespace-only, invalid URL/host paths)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-error-normalization.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (shared request-validation telemetry parity)
- Updated:
  - `src/server/request-error-normalization.ts`
  - `src/core/cursor/hook-ipc-server.ts`
  - `src/server/headless-server.ts`
- Changes:
  - added shared `logRequestValidationFailure(...)` helper for non-parse request
    failure telemetry
  - hook IPC schema-validation failures now emit standardized validation telemetry
    before canonical invalid-request responses
  - headless `ZodError` validation path now emits standardized validation
    telemetry with shared source/context schema
- Extended tests:
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - added validation telemetry helper normalization coverage
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
    - added schema-invalid payload warning assertion for shared validation
      telemetry message/schema
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (shared request-parse telemetry helper)
- Updated:
  - `src/server/request-error-normalization.ts`
  - `src/server/api-routes.ts`
  - `src/server/headless-server.ts`
  - `src/core/cursor/hook-ipc-server.ts`
- Changes:
  - introduced shared telemetry helper `logRequestParsingFailure(...)`
  - standardized parse-failure warning metadata keys across API/headless/hook:
    - `source`, `method`, `pathname`, optional `handler`, `error`, `mappedMessage`
  - introduced shared source constants via `REQUEST_PARSING_SOURCE`
- Extended tests:
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - added telemetry helper normalization assertions
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
    - updated warning assertions to shared telemetry message/schema
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (API parse-failure diagnostics parity)
- Updated:
  - `src/server/api-routes.ts`
  - `src/server/request-error-normalization.ts`
  - `src/core/cursor/hook-ipc-server.ts`
- Changes:
  - API TUI handlers now emit structured warning diagnostics for request-body
    parse failures (`handler`, `method`, `pathname`, `error`, `mappedMessage`)
  - introduced shared `normalizeRequestBodyParseErrorDetails(...)` helper and
    reused it in API routes + hook IPC
- Extended tests:
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
    - added request stream `error`/`aborted` failure mapping coverage
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
    - added parse-error details helper coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (headless route-local parse handling hardening)
- Updated `src/server/headless-server.ts`:
  - route-level request-body parse handling added for:
    - `POST /sessions`
    - `POST /sessions/:id/prompt`
  - parse failures now map and return from route-local catch blocks using shared
    parse-error classification, with route-context warning diagnostics
    (`method`, `pathname`, `mappedMessage`, `error`).
  - reduced dependence on top-level request catch for route body-parse failures.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-error-normalization.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (shared request-error normalization utility)
- Added `src/server/request-error-normalization.ts` with shared helpers:
  - `normalizeRequestBodyParseError(...)`
  - `classifyRequestParsingError(...)`
- Refactored consumers:
  - `src/server/api-routes.ts` now reuses shared parse-error normalization
  - `src/core/cursor/hook-ipc-server.ts` now reuses shared parse-error normalization
  - `src/server/headless-server.ts` now classifies canonical parse errors via shared utility
- Added focused unit coverage:
  - `__tests__/unit/server/request-error-normalization.unit.test.ts`
- Behavioral hardening:
  - headless server now treats canonical invalid-request parse errors from body
    stream lifecycle failures as `400 INVALID_REQUEST` consistently.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-error-normalization.unit.test.ts __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC shared response helper adoption)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - removed local `sendJson`/`sendError` helpers
  - switched hook IPC endpoint response writes to shared helpers:
    - `sendJsonResponse(...)`
    - `sendErrorResponse(...)`
  - behavior preserved for canonical method/parse/handler-failure response paths
    while reducing response serialization duplication.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC invalid-body diagnostics hardening)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - request-body parse failures now emit structured warning telemetry before
    canonical 400 responses are returned
  - warning metadata includes normalized mapped message and original parse error
- Extended `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - malformed JSON and oversized payload paths now assert warning emission
  - parser-rejection stream-failure scenarios now assert warning metadata
    alongside canonical `INVALID_REQUEST` response mapping
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC request-stream failure mapping coverage)
- Updated `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added parser rejection coverage for request-stream lifecycle failures:
    - aborted-stream style errors
    - generic stream-error style failures
  - verifies both paths return canonical `400 INVALID_REQUEST` from hook IPC endpoint
    rather than leaking non-canonical error handling.
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (CLI env-command blank fallback hardening)
- Updated runtime command resolution:
  - `src/core/claude-cli-harness.ts`
  - `src/core/cursor/cursor-cli-connection.ts`
- Changes:
  - command env values are now trimmed before use
  - whitespace-only env command overrides now fall back to harness defaults
    instead of being treated as executable command names
- Extended tests:
  - `__tests__/unit/core/claude-cli-harness.unit.test.ts`
  - `__tests__/unit/core/cursor/cursor-cli-connection.unit.test.ts`
  - added explicit blank-command env fallback assertions
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/claude-cli-harness.unit.test.ts __tests__/unit/core/cursor/cursor-cli-connection.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC request-body parser hardening)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - replaced ad-hoc body chunk parsing with shared `parseJsonRequestBody(...)`
    helper for robust stream parsing/error handling parity
  - added canonical bad-request error mapping for parse failures:
    - malformed -> `INVALID_REQUEST`
    - oversized -> `REQUEST_BODY_TOO_LARGE`
- Extended `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added oversized hook payload rejection coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (hook IPC non-object payload coverage)
- Updated `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added explicit coverage for non-object JSON request bodies (array + primitive)
  - locked canonical `400 INVALID_REQUEST` response semantics
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (SSE pre-closed response cleanup hardening)
- Updated `src/server/api-routes.ts`:
  - events stream now immediately cleans up subscriptions if response is already
    ended/destroyed when handler attaches the store subscription
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added coverage for pre-closed response cleanup path (`writableEnded=true`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (file-search key-normalization hardening)
- Updated `src/server/api-routes.ts`:
  - query parameter key matching now normalizes case and trims names
  - mixed-case duplicate query keys (`q` + `Q`) now follow canonical duplicate-query
    invalid-request behavior
- Extended tests:
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Added coverage for:
  - uppercase key-name acceptance parity
  - mixed-case duplicate key-name rejection
  - encoded separator decoding in query values
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/api-routes.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (mixed-chunk request-body hardening)
- Updated `src/server/request-body.ts`:
  - request-body chunk handling now routes both string and buffer chunks through
    one UTF-8 decoder path for consistent ordering and byte accounting
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added mixed string+buffer chunk payload success coverage
  - added malformed partial-buffer then string chunk decode-order coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (auth-header type hardening)
- Updated `src/server/server-auth.ts`:
  - added authorization header normalization guard requiring non-empty string values
  - array/empty authorization headers now return canonical authorization-required
    unauthorized responses
- Extended `__tests__/unit/server/server-auth.unit.test.ts`:
  - added array-header rejection coverage
  - added whitespace-only header rejection coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (harness env-expansion validation hardening)
- Updated `src/harness/harnessConfig.ts`:
  - env-expanded harness config payloads are now re-parsed via `harnessConfigSchema`
    before returning from `loadHarnessConfig`
- Extended `__tests__/unit/harness/harness-config.unit.test.ts`:
  - added project/user env-map merge precedence coverage
  - added missing-env command expansion failure coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/harness/default-harness-config.unit.test.ts __tests__/unit/server/api-route-fallback-env.unit.test.ts` ✅
  - Full gates (equivalent commands, bun/bunx unavailable in this shell):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (default harness env-override hardening)
- Updated `src/harness/defaultHarnessConfig.ts`:
  - command env overrides now trim and fall back to defaults when blank
  - explicit empty-string args overrides now produce empty args arrays
- Extended `__tests__/unit/harness/default-harness-config.unit.test.ts`:
  - added explicit empty-args override coverage
  - added blank-command fallback coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/default-harness-config.unit.test.ts __tests__/unit/server/api-route-fallback-env.unit.test.ts __tests__/unit/harness/harness-adapter.unit.test.ts` ✅
  - Full gates (equivalent due missing bun/bunx in environment):
    - `npx biome check . && npx eslint .` ✅
    - `npx tsc --noEmit` ✅
    - `npx vitest run` ✅
    - `npx tsup` ✅
    - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (repo-workflow check-field type hardening)
- Updated `src/core/repo-workflow.ts`:
  - `normalizeCheckField` now safely handles unknown/non-string values from
    GH checks payload parsing
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added malformed check-field payload coverage (non-string status/conclusion)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts __tests__/unit/core/pr-status.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (non-origin-form request-target integration coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts`:
  - added raw HTTP request-target coverage for:
    - protocol-relative target rejection (`//example.com/...`)
    - absolute target rejection (`http://example.com/...`)
  - both now lock canonical `INVALID_REQUEST` responses end-to-end
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (protocol-relative request-target hardening)
- Updated `src/server/request-url.ts`:
  - parser now rejects protocol-relative request targets (`//...`)
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added protocol-relative target rejection coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added protocol-relative target invalid-request coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-target strictness hardening)
- Updated `src/server/request-url.ts`:
  - parser now requires origin-form request targets (`/...`)
  - absolute request targets are rejected with null fallback
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added absolute URL rejection coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added absolute request-target invalid-request coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-url whitespace normalization)
- Updated `src/server/request-url.ts`:
  - parser now trims request url and host header before URL construction
  - blank/whitespace-only url values continue to return `null`
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added whitespace-wrapped url/host parse coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added whitespace-host success-path coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (missing request-url hardening)
- Updated `src/server/request-url.ts`:
  - parser now returns `null` when request url is missing
- Extended:
  - `__tests__/unit/server/request-url.unit.test.ts`
    - added missing-request-url null fallback coverage
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - added missing-url invalid-request coverage for file-search route
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (shared request-url parser hardening)
- Added `src/server/request-url.ts`:
  - centralized request URL parsing with localhost fallback
  - malformed host/URL inputs now return `null` instead of throwing
- Updated:
  - `src/server/headless-server.ts`
    - now uses shared parser and returns canonical invalid-request for malformed URL inputs
  - `src/server/api-routes.ts`
    - file-search now uses shared parser and canonical invalid-request fallback
- Extended tests:
  - `__tests__/unit/server/request-url.unit.test.ts`
  - `__tests__/unit/server/api-route-file-search.unit.test.ts`
    - malformed host-header rejection case
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-url.unit.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless file-search integration coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts`:
  - added file-search integration assertions for:
    - valid query handling
    - duplicate `q` rejection
    - encoded key acceptance
    - malformed encoded key rejection
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/api-route-file-search.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search encoded-key hardening)
- Updated `src/server/api-routes.ts`:
  - query parameter name parsing now uses strict form decoding
  - encoded key names (e.g. `%71`) are accepted for `q`
  - malformed encoded key names now return canonical `INVALID_REQUEST`
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added encoded-key success case (`?%71=readme`)
  - added malformed key-encoding rejection case
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search duplicate-query hardening)
- Updated `src/server/api-routes.ts`:
  - query extraction now collects all `q` values
  - duplicate `q` parameters now return canonical `INVALID_REQUEST`
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added duplicate-query rejection coverage (`q=readme&q=notes`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo-workflow defensive normalization)
- Updated `src/core/repo-workflow.ts`:
  - `deriveRepoWorkflowStatus` now trims and lowercases PR `state` and
    `reviewDecision` before workflow branching
  - widened internal input shape for defensive compatibility with non-normalized
    callers while preserving existing behavior for normalized inputs
- Extended `__tests__/unit/core/repo-workflow.unit.test.ts`:
  - added padded-state normalization coverage (`" merged "`)
  - added padded-review-decision normalization coverage (`" approved "`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow.unit.test.ts __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/pr-status.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (events-stream stale-callback guard)
- Updated `src/server/api-routes.ts`:
  - events-stream callback now short-circuits when cleanup has already run
  - prevents writes from stale callbacks after unsubscribe/close paths
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added post-cleanup stale-callback no-write coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (events-stream write-failure cleanup)
- Updated `src/server/api-routes.ts`:
  - events-stream update callback now catches `res.write(...)` failures
  - write failures trigger idempotent SSE cleanup instead of surfacing exceptions
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added write-failure cleanup coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (events-stream aborted-request cleanup)
- Updated `src/server/api-routes.ts`:
  - events stream now subscribes to request `aborted` events for cleanup
  - cleanup remains idempotent with existing request/response close/error handling
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added request-aborted cleanup coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search plus-decoding contract test)
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added explicit coverage for `+` form-encoding in query values
  - locked expected decode contract: `q=readme+notes` -> `readme notes`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (PR status invocation-option coverage)
- Extended `__tests__/unit/core/pr-status.unit.test.ts`:
  - added assertions that `getPRStatus` calls `gh pr view` with expected
    `timeout` and `cwd` options
  - added default-cwd invocation assertion for no-arg `getPRStatus()`

## 2026-02-13 (events-stream error-path cleanup hardening)
- Updated `src/server/api-routes.ts`:
  - SSE cleanup now also hooks request/response `error` events
  - cleanup remains idempotent across close/error combinations
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added response-error cleanup coverage
  - added request-error cleanup coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (strict file-search query decoding hardening)
- Updated `src/server/api-routes.ts`:
  - file-search query parsing now decodes raw `q` values with strict decoding and
    returns canonical `INVALID_REQUEST` for malformed encoded input
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added malformed encoded query rejection coverage (`q=%E0%A4%A`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (PR status normalization hardening)
- Updated `src/core/pr-status.ts`:
  - added explicit state normalization with trim+lowercase and known-state fallback
  - added explicit review-decision normalization with trim+lowercase and unknown fallback
- Extended `__tests__/unit/core/pr-status.unit.test.ts`:
  - added padded state/review normalization coverage
  - added unsupported review-decision fallback coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/pr-status.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts __tests__/unit/core/repo-workflow-info.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (SSE response-close cleanup hardening)
- Updated `src/server/api-routes.ts`:
  - events stream now also performs subscription cleanup on `res.close`
  - cleanup handler is idempotent across request+response close events
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added response-close cleanup coverage and duplicate-close idempotency assertion
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (file-search query-trim hardening)
- Updated `src/server/api-routes.ts`:
  - file-search query extraction now trims surrounding whitespace
  - whitespace-only query values now return canonical missing-query bad-request
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added whitespace-only query bad-request coverage
  - added trimmed-query success response coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (route method normalization hardening)
- Added shared helper:
  - `src/server/http-method-normalization.ts`
- Updated:
  - `src/server/api-routes.ts`
  - `src/server/core-route-classifier.ts`
- Changes:
  - route matching/classification now normalizes method input via trim+uppercase
    before comparing with supported HTTP methods
- Extended tests:
  - `__tests__/unit/server/api-routes.unit.test.ts`
  - `__tests__/unit/server/core-route-classifier.unit.test.ts`
  - `__tests__/unit/server/server-route-classifier.unit.test.ts`
  - added lowercase/padded method acceptance coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body UTF-8 split-chunk decoding hardening)
- Updated `src/server/request-body.ts`:
  - buffer chunk decoding now uses `StringDecoder("utf8")` to preserve multibyte
    characters split across stream chunk boundaries
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added split-buffer UTF-8 emoji payload parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (search-files host-header fallback hardening)
- Updated `src/server/api-routes.ts`:
  - file-search URL parsing now falls back to `localhost` when request host header is absent
- Extended `__tests__/unit/server/api-route-file-search.unit.test.ts`:
  - added hostless request parsing coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-file-search.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body UTF-8 BOM parsing hardening)
- Updated `src/server/request-body.ts`:
  - JSON parser now strips UTF-8 BOM prefix before empty-body fallback and JSON.parse
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added BOM-prefixed JSON parse coverage
  - added BOM-only payload empty-body fallback coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo check-status whitespace normalization hardening)
- Updated `src/core/repo-workflow.ts`:
  - check-status/conclusion normalization now trims whitespace before lowercase matching
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added whitespace-padded queued/pending classification coverage
  - added whitespace-padded cancelled/failing classification coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (SSE close-unsubscribe idempotency hardening)
- Updated `src/server/api-routes.ts`:
  - switched events-stream close listener from `on` to `once` for unsubscribe idempotency
- Extended `__tests__/unit/server/api-route-events-stream.unit.test.ts`:
  - added duplicate close-event assertion (`unsubscribe` called exactly once)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-events-stream.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (git+ssh remote parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - ssh-protocol matcher now accepts optional `git+ssh://` prefix
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added git+ssh remote parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (uppercase SSH protocol parse coverage)
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added uppercase `SSH://...` remote parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (scp remote no-user parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - generalized scp-style remote matcher to allow missing `user@` prefix
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added no-user scp remote parse coverage (`github.com:owner/repo.git`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (uppercase .GIT remote suffix parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - added case-insensitive repo-name normalization for `.git` suffix removal
  - aligned remote URL matchers to accept `.GIT` suffix variants
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added uppercase `.GIT` URL parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (scp ssh custom-user parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - generalized scp-style ssh parser to accept any `user@host:owner/repo(.git)` form
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added custom-user scp ssh parse coverage (`alice@github.com:owner/repo.git`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request stream abort/close hardening)
- Updated `src/server/request-body.ts`:
  - added abort/close handling so read promise rejects on prematurely terminated streams
  - added listener cleanup on settle to avoid lingering handlers
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added `aborted` and premature `close` rejection coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (git protocol remote parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - added support for parsing owner/repo from `git://` remote URLs
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added `git://github.com/owner/repo.git` parsing coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo-workflow literal hygiene)
- Updated `src/core/repo-workflow.ts`:
  - extracted `gh pr checks --json` field list string into named constant
  - replaced raw PR state/review decision string literals with constants
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo remote scheme-case parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - made `https://` and `ssh://` remote parsing case-insensitive
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added uppercase-HTTPS remote parse coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body single-settlement hardening)
- Updated `src/server/request-body.ts`:
  - introduced one-shot resolve/reject guards so request-body promise settles once
    even when multiple stream events fire after failure
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - added combined chunk overflow case to lock multi-chunk over-limit behavior
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (response-helper managed-header sanitization)
- Updated `src/server/http-response.ts`:
  - strips case-variant managed headers (`content-type`, `content-length`) from caller
    header inputs before writing canonical JSON headers
  - prevents duplicate/competing header casing variants
- Extended `__tests__/unit/server/http-response.unit.test.ts`:
  - added coverage for lowercase managed header override attempts
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/http-response.unit.test.ts __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (ssh remote trailing-slash parsing hardening)
- Updated `src/core/repo-workflow.ts`:
  - scp-style ssh remote parser now tolerates trailing slash (`git@host:owner/repo.git/`)
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added coverage for owner/repo extraction from ssh remotes with trailing slash
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo checks explicit-pending status hardening)
- Updated `src/core/repo-workflow.ts`:
  - checks-status classifier now explicitly treats `status: "pending"` as pending
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added pending-status classification case
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server auth header whitespace normalization)
- Updated `src/server/server-auth.ts`:
  - authorization header parsing now trims incoming header and extracted token values
  - preserves case-insensitive bearer support and raw-token compatibility
- Extended `__tests__/unit/server/server-auth.unit.test.ts`:
  - added bearer token with surrounding whitespace acceptance
  - added raw token with surrounding whitespace acceptance
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo workflow checks-status classification hardening)
- Updated `src/core/repo-workflow.ts`:
  - `getPrChecksStatus()` now classifies:
    - queued checks as `pending`
    - cancelled/timed_out/action_required/startup_failure conclusions as `fail`
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - queued-checks pending classification coverage
  - cancelled-checks failing classification coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server auth bearer-scheme robustness)
- Updated `src/server/server-auth.ts`:
  - bearer token extraction now uses case-insensitive scheme matching
    (`Bearer`/`bearer`/mixed-case supported)
  - raw-token authorization support remains unchanged
- Extended `__tests__/unit/server/server-auth.unit.test.ts`:
  - added lowercase bearer-scheme acceptance test
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (repo workflow ssh-protocol remote parsing)
- Updated `src/core/repo-workflow.ts`:
  - extended remote-url parsing to support ssh-protocol remotes
    (`ssh://git@host[:port]/owner/repo.git`)
- Extended `__tests__/unit/core/repo-workflow-info.unit.test.ts`:
  - added coverage asserting owner/repo extraction for ssh-protocol remote URLs
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/repo-workflow-info.unit.test.ts __tests__/unit/core/repo-workflow.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-body chunk accounting hardening)
- Updated `src/server/request-body.ts`:
  - byte accounting now reads from native chunk type:
    - `Buffer.length` for buffer chunks
    - `Buffer.byteLength(...)` for string chunks
  - avoids redundant re-encoding while preserving accurate max-body enforcement
- Extended `__tests__/unit/server/request-body.unit.test.ts`:
  - buffer-chunk body parsing coverage
  - exact-byte-limit acceptance coverage
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless invalid-JSON response normalization)
- Updated `src/server/headless-server.ts`:
  - separated syntax-error handling from zod validation handling
  - syntax errors now return canonical `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST`
- Updated integration coverage:
  - `__tests__/integration/server/headless-server.integration.test.ts`
  - `/sessions` invalid-JSON assertion now locks canonical invalid-request payload
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (strict session-subroute parsing hardening)
- Updated `src/server/session-route-path.ts`:
  - parser now rejects over-segmented session paths (e.g. `/sessions/:id/prompt/extra`)
  - segment limit sourced from `LIMIT.SESSION_ROUTE_MAX_SEGMENTS`
- Updated `src/config/limits.ts`:
  - added `SESSION_ROUTE_MAX_SEGMENTS` constant for parser guard
- Extended coverage:
  - `__tests__/unit/server/session-route-path.unit.test.ts`
  - `__tests__/unit/server/core-route-classifier.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Locked behavior:
  - extra-segment session routes now consistently return canonical unknown-endpoint responses
    instead of being misclassified as valid prompt/messages paths
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/session-route-path.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅ (after moving segment cap to config constant)

## 2026-02-13 (request-body byte-size correctness hardening)
- Updated `src/server/request-body.ts`:
  - request size enforcement now tracks utf-8 byte length instead of string length
  - prevents undercounting multi-byte payloads for max-body limit enforcement
- Expanded `__tests__/unit/server/request-body.unit.test.ts` coverage:
  - utf-8 multibyte overflow case
  - multi-chunk request body assembly
  - request stream error propagation
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (/api/agents integration contract hardening)
- Updated `__tests__/integration/server/api-routes.integration.test.ts`:
  - strengthened `/api/agents` assertions to validate:
    - non-empty agents list
    - `defaultHarnessId` is present
    - `defaultHarnessId` corresponds to one of the returned agent ids
- Validation:
  - Targeted:
    - `npx vitest run __tests__/integration/server/api-routes.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (hook IPC schema-invalid payload coverage)
- Extended `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`:
  - added explicit assertion for schema-invalid JSON payload handling
  - verifies canonical `400` + `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST` mapping
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (harness config selection edge coverage)
- Extended `__tests__/unit/harness/harness-config.unit.test.ts` with selection edge-paths:
  - auto-select sole harness when no default is configured
  - throw `NO_DEFAULT_HARNESS_CONFIGURED` when multiple harnesses exist without defaults
  - throw formatted harness-not-found error for explicit unknown `harnessId`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/harness/default-harness-config.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (HTTP response helper content-type hardening)
- Updated `src/server/http-response.ts`:
  - changed header merge order so JSON content-type remains authoritative even when
    custom headers include a content-type override
- Extended tests:
  - `__tests__/unit/server/http-response.unit.test.ts`
  - added assertion for custom-header merge behavior preserving JSON content type
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/http-response.unit.test.ts __tests__/unit/server/server-auth.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (default harness fallback coverage)
- Added unit test file:
  - `__tests__/unit/harness/default-harness-config.unit.test.ts`
- Covered:
  - default harness set composition when cursor flag is unset
  - cursor harness inclusion with numeric truthy flag (`TOADSTOOL_CURSOR_CLI_ENABLED=1`)
  - argument override parsing for claude/gemini/codex/cursor defaults
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/harness/default-harness-config.unit.test.ts __tests__/unit/server/api-route-fallback-env.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (hook IPC request hardening)
- Updated `src/core/cursor/hook-ipc-server.ts`:
  - switched method check to `HTTP_METHOD.POST`
  - added local JSON/error response helpers to remove repeated response code
  - normalized invalid payload response to canonical `INVALID_REQUEST`
  - added top-level try/catch around request handling to return canonical
    `SERVER_ERROR` on thrown handler failures
- Expanded unit coverage in:
  - `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts`
- Added assertions for:
  - non-POST method rejection (`405`)
  - malformed JSON rejection (`400`)
  - thrown handler failure mapping (`500`)
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (server auth response deduplication)
- Refactored `src/server/server-auth.ts` to reuse shared response helper:
  - replaced duplicated unauthorized `writeHead + end(JSON.stringify(...))` branches
    with `sendErrorResponse(...)` calls
  - centralized auth challenge header usage via shared constants
  - normalized bearer token prefix handling with one constant
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-auth.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (shared server response helper extraction)
- Added `src/server/http-response.ts` with reusable helpers:
  - `sendJsonResponse()`
  - `sendErrorResponse()`
- Refactored response writers in:
  - `src/server/api-routes.ts`
  - `src/server/headless-server.ts`
- Added focused unit coverage:
  - `__tests__/unit/server/http-response.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/http-response.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (unified server route classifier pipeline)
- Added `src/server/server-route-classifier.ts` to compose:
  - core-route classification
  - api-route classification
- Updated `src/server/headless-server.ts` to consume unified route classification outcomes.
- Added dedicated unit coverage:
  - `__tests__/unit/server/server-route-classifier.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (session route path parser extraction)
- Added `src/server/session-route-path.ts` to centralize parsing of `/sessions/:id/:action` paths.
- Refactored consumers:
  - `src/server/headless-server.ts`
  - `src/server/core-route-classifier.ts`
- Added focused unit coverage:
  - `__tests__/unit/server/session-route-path.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/session-route-path.unit.test.ts __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (core route classification extraction)
- Added `src/server/core-route-classifier.ts` with explicit decision model for core routes:
  - `HEALTH_OK`
  - `METHOD_NOT_ALLOWED`
  - `UNHANDLED`
- Refactored `src/server/headless-server.ts` to consume `classifyCoreRoute()`.
- Added unit coverage:
  - `__tests__/unit/server/core-route-classifier.unit.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/core-route-classifier.unit.test.ts __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (API route classification refactor)
- Added route classification abstraction in `src/server/api-routes.ts`:
  - `API_ROUTE_CLASSIFICATION`
  - `classifyApiRoute()`
- Updated `src/server/headless-server.ts` to use route classification output instead of
  direct `matchRoute + API_ROUTES.some(...)` probing.
- Expanded `__tests__/unit/server/api-routes.unit.test.ts` with explicit classification tests:
  - match
  - method-not-allowed
  - not-found
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (request-error canonicalization hardening)
- Updated `src/server/api-routes.ts` TUI handler error mapping to normalize invalid parse/read
  failures to `SERVER_RESPONSE_MESSAGE.INVALID_REQUEST`, while preserving explicit
  `REQUEST_BODY_TOO_LARGE` for size overflows.
- Updated tests:
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - `__tests__/integration/server/headless-server.integration.test.ts`
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (core route method-guard refactor)
- Refactored `src/server/headless-server.ts` method validation logic by extracting
  `isMethodAllowedForCoreRoute()` to centralize route-method checks and reduce branch duplication.
- Behavior preserved with existing integration assertions (no semantic drift).
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (non-API auth-ordering coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with explicit
  auth-ordering checks for a non-API protected route:
  - unauthenticated `GET /sessions` returns `401` with auth challenge
  - authenticated `GET /sessions` returns `405 Method not allowed`
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (shared request parser consolidation)
- Added `src/server/request-body.ts` with shared helpers:
  - `readRequestBody()`
  - `parseJsonRequestBody()`
- Refactored both server entrypoints to reuse shared behavior:
  - `src/server/headless-server.ts`
  - `src/server/api-routes.ts`
- Added focused unit coverage:
  - `__tests__/unit/server/request-body.unit.test.ts`
- Expanded TUI route unit coverage:
  - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
  - invalid JSON + oversized payload direct invocation paths
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/request-body.unit.test.ts __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (non-API method semantics hardening)
- Updated `src/server/headless-server.ts` to return canonical `405` responses for unsupported
  methods on known non-API routes (`/health`, `/sessions`, `/sessions/:id/prompt`,
  `/sessions/:id/messages`).
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with explicit
  coverage for these non-API method validation paths.
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (direct API handler error-path hardening)
- Updated `src/server/api-routes.ts` TUI handlers (`appendPrompt`, `executeCommand`) to catch
  parse/read failures and return explicit `400` error responses.
- Added direct invocation coverage in `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`:
  - invalid JSON payload handling
  - oversized payload handling with canonical body-too-large response
- Validation:
  - Targeted:
    - `npx vitest run __tests__/unit/server/api-route-tui-handlers.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (auth/method-ordering integration hardening)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to lock auth
  precedence semantics for protected `/api/*` endpoints:
  - unauthenticated unsupported method returns auth challenge (`401`)
  - authenticated unsupported method returns method semantic (`405`)
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (API route body-size hardening)
- Updated `src/server/api-routes.ts` request-body parser to enforce
  `SERVER_CONFIG.MAX_BODY_BYTES` and throw canonical `REQUEST_BODY_TOO_LARGE`.
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - invalid JSON handling for `/api/tui/append-prompt`
  - oversized payload handling for `/api/tui/execute-command`
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (API method semantics hardening)
- Updated `src/server/headless-server.ts` to return `405 Method not allowed` for known `/api/*`
  paths when method is unsupported.
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - unsupported-method handling for known API routes (`/api/config`, `/api/tui/execute-command`)
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (session-messages edge behavior coverage)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` with explicit
  coverage for unknown-session messages fetch behavior.
- Locked current behavior:
  - `GET /sessions/<unknown>/messages` returns `200` and `{ messages: [] }`.
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (headless request-body/schema edge hardening)
- Extended `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - strict schema rejection when `/sessions` payload includes unexpected keys
  - oversized request-body handling for `/sessions`
- Found and fixed runtime mismatch:
  - previously `REQUEST_BODY_TOO_LARGE` bubbled to generic error handling and returned 500
  - `src/server/headless-server.ts` now maps that error to `400 Bad Request` with canonical
    `SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE`
- Validation:
  - Targeted: `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

## 2026-02-13 (route/auth integration parity hardening)
- Extended route matcher unit tests in `__tests__/unit/server/api-routes.unit.test.ts` to cover:
  - `POST /api/tui/submit-prompt`
- Extended headless auth integration in
  `__tests__/integration/server/headless-server.integration.test.ts` to cover:
  - raw-token authorization (`Authorization: secret`) in addition to bearer-token path.
- Validation:
  - Targeted: `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
  - Full gates: lint ✅, typecheck ✅, test ✅, build ✅
  - Strict literal check: `check:literals:strict` ✅

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

## 2026-02-13 (Classifier metadata boundary hardening)

### Summary
- Extracted shared classifier handler ids into
  `src/constants/server-route-classifier-handlers.ts`.
- Updated `classifyApiRoute(...)` so `METHOD_NOT_ALLOWED` and `NOT_FOUND`
  outcomes include explicit `classifierHandler` metadata.
- Updated `classifyServerRoute(...)` to consume API classifier handler metadata
  for API method-not-allowed outcomes.
- Expanded `api-routes.unit` expectations to lock the new classifier metadata.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/api-routes.unit.test.ts __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (API not-found boundary propagation hardening)

### Summary
- Updated `classifyServerRoute(...)` to run API route classification only when
  pathname starts with `/api/`.
- API not-found classification metadata is now propagated directly into server
  `UNHANDLED` results for API-path requests.
- Added focused unit coverage that `/api` (without trailing slash) remains a
  core-unhandled route classification.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/server-route-classifier.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts __tests__/unit/server/api-routes.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-id whitespace normalization hardening)

### Summary
- Updated harness-id resolution in `loadHarnessConfig(...)` to trim CLI/user/
  project harness-id inputs before precedence resolution.
- Whitespace-only defaults are now treated as absent, preserving fallback to
  single-harness auto-selection when applicable.
- Explicit CLI harness-id values are now trimmed before harness lookup.
- Expanded harness config unit coverage for whitespace default handling and
  trimmed explicit harness-id selection.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Invalid harness-id config guard hardening)

### Summary
- Added `formatInvalidHarnessIdError(...)` to centralize malformed harness-id
  diagnostics.
- Harness config loading now rejects harness ids with surrounding whitespace
  (including whitespace-only ids), preventing ambiguous/hidden id mismatches.
- Expanded focused unit coverage for:
  - invalid harness-id rejection in config loading
  - invalid harness-id message formatting helper

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/harness/harness-error-messages.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Explicit blank CLI harness-id guard hardening)

### Summary
- Updated harness-id resolution to reject explicit CLI harness-id inputs that
  are whitespace-only, returning canonical invalid-id diagnostics.
- Preserved existing behavior for padded-but-valid explicit harness ids by
  continuing to trim and resolve those values.
- Expanded harness config unit coverage for whitespace-only explicit CLI id
  rejection.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Default-harness id validation hardening)

### Summary
- Updated `loadHarnessConfig(...)` to validate configured project/user
  `defaultHarness` values using shared invalid-id validation.
- Project/user defaults now reject:
  - whitespace-only ids
  - padded ids with surrounding whitespace
- Expanded harness-config unit coverage for project/user default-id validation
  failures.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Strict explicit CLI harness-id validation)

### Summary
- Updated explicit CLI harness-id resolution to use shared strict harness-id
  validation.
- Explicit CLI ids now require canonical formatting:
  - exact id succeeds
  - padded id rejects
  - whitespace-only id rejects
- Expanded harness-config unit coverage for exact/padded/blank explicit CLI id
  behavior.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Session-request harness-id canonicalization hardening)

### Summary
- Added shared harness-id utilities for normalization/canonical checks.
- Updated create-session request schema to reject non-canonical `harnessId`
  values (padded or whitespace-only) at validation boundary.
- Reused shared harness-id helper within harness-config id validation to align
  config/runtime semantics.
- Expanded focused coverage across:
  - harness-id utility unit tests
  - server-types schema unit tests
  - headless server integration validation behavior

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-id.unit.test.ts __tests__/unit/harness/harness-config.unit.test.ts __tests__/unit/server/server-types.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-id validation message unification)

### Summary
- Added shared canonical harness-id validation message constant.
- Reused shared message text in:
  - harness invalid-id error formatter
  - create-session request schema refinement message
- Expanded focused unit/integration coverage to assert message propagation
  across harness utility/formatter/schema/headless request validation paths.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-id.unit.test.ts __tests__/unit/harness/harness-error-messages.unit.test.ts __tests__/unit/server/server-types.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Empty harness-id message parity hardening)

### Summary
- Updated create-session `harnessId` schema validation to use canonical-id
  refine validation without separate min-length check.
- Empty-string `harnessId` values now emit the same canonical validation
  message as padded/whitespace-only values.
- Expanded focused coverage for empty `harnessId` behavior in:
  - server-types schema unit tests
  - headless-server integration responses

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/server/server-types.unit.test.ts __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Unknown harness create-session integration coverage)

### Summary
- Added integration coverage for create-session requests with canonical but
  unconfigured harness ids.
- Locked expected response semantics:
  - `404 Not Found`
  - `formatHarnessNotConfiguredError(<id>)` response payload

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pin asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pin jitter per order path.
- Added order-path-specific recovery-pin jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pin jitter in the intra-cycle handoff sequence after
  recovery-rivet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-crest asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-crest jitter per order path.
- Added order-path-specific recovery-crest jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-crest jitter in the intra-cycle handoff sequence after
  recovery-ridge jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-peak asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-peak jitter per order path.
- Added order-path-specific recovery-peak jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-peak jitter in the intra-cycle handoff sequence after
  recovery-crest jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps variable websocket and sse reconnect cadence stable across burst cycles"` ✅ (post-timeout confirmation)
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅ (re-run after one timeout flake in unrelated cadence test)
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-summit asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-summit jitter per order path.
- Added order-path-specific recovery-summit jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-summit jitter in the intra-cycle handoff sequence after
  recovery-peak jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-apex asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-apex jitter per order path.
- Added order-path-specific recovery-apex jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-apex jitter in the intra-cycle handoff sequence after
  recovery-summit jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-crown asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-crown jitter per order path.
- Added order-path-specific recovery-crown jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-crown jitter in the intra-cycle handoff sequence after
  recovery-apex jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-tiara asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-tiara jitter per order path.
- Added order-path-specific recovery-tiara jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-tiara jitter in the intra-cycle handoff sequence after
  recovery-crown jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-diadem asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-diadem jitter per order path.
- Added order-path-specific recovery-diadem jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-diadem jitter in the intra-cycle handoff sequence after
  recovery-tiara jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-coronet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-coronet jitter per order path.
- Added order-path-specific recovery-coronet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-coronet jitter in the intra-cycle handoff sequence after
  recovery-diadem jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-circlet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-circlet jitter per order path.
- Added order-path-specific recovery-circlet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-circlet jitter in the intra-cycle handoff sequence after
  recovery-coronet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-band asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-band jitter per order path.
- Added order-path-specific recovery-band jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-band jitter in the intra-cycle handoff sequence after
  recovery-circlet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-bangle asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-bangle jitter per order path.
- Added order-path-specific recovery-bangle jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-bangle jitter in the intra-cycle handoff sequence after
  recovery-band jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-bracelet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-bracelet jitter per order path.
- Added order-path-specific recovery-bracelet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-bracelet jitter in the intra-cycle handoff sequence after
  recovery-bangle jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-anklet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-anklet jitter per order path.
- Added order-path-specific recovery-anklet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-anklet jitter in the intra-cycle handoff sequence after
  recovery-bracelet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-toe-ring asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-toe-ring jitter per order path.
- Added order-path-specific recovery-toe-ring jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-toe-ring jitter in the intra-cycle handoff sequence after
  recovery-anklet jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-charm asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-charm jitter per order path.
- Added order-path-specific recovery-charm jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-charm jitter in the intra-cycle handoff sequence after
  recovery-toe-ring jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-pendant asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-pendant jitter per order path.
- Added order-path-specific recovery-pendant jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-pendant jitter in the intra-cycle handoff sequence after
  recovery-charm jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-locket asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-locket jitter per order path.
- Added order-path-specific recovery-locket jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-locket jitter in the intra-cycle handoff sequence after
  recovery-pendant jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-medallion asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-medallion jitter per order path.
- Added order-path-specific recovery-medallion jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-medallion jitter in the intra-cycle handoff sequence after
  recovery-locket jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-amulet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-amulet jitter per order path.
- Added order-path-specific recovery-amulet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-amulet jitter in the intra-cycle handoff sequence after
  recovery-medallion jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-ridge asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-ridge jitter per order path.
- Added order-path-specific recovery-ridge jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-ridge jitter in the intra-cycle handoff sequence after
  recovery-groove jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-groove asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-groove jitter per order path.
- Added order-path-specific recovery-groove jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-groove jitter in the intra-cycle handoff sequence after
  recovery-notch jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-notch asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-notch jitter per order path.
- Added order-path-specific recovery-notch jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-notch jitter in the intra-cycle handoff sequence after
  recovery-spike jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-spike asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-spike jitter per order path.
- Added order-path-specific recovery-spike jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-spike jitter in the intra-cycle handoff sequence after
  recovery-stud jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-stud asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-stud jitter per order path.
- Added order-path-specific recovery-stud jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-stud jitter in the intra-cycle handoff sequence after
  recovery-pin jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-rivet asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-rivet jitter per order path.
- Added order-path-specific recovery-rivet jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-rivet jitter in the intra-cycle handoff sequence after
  recovery-latch jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-latch asymmetry coverage)

### Summary
- Expanded reconnect-order inversion hardening in
  `__tests__/integration/server/headless-server.integration.test.ts` with
  asymmetric post-close prompt-burst recovery-latch jitter per order path.
- Added order-path-specific recovery-latch jitter constants and asymmetry
  assertions (`SSE-first` lower, `websocket-first` higher).
- Applied recovery-latch jitter in the intra-cycle handoff sequence after
  recovery-brace jitter to stress websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity under the expanded stacked asymmetry matrix.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst recovery-settle asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst recovery-settle asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst recovery-settle jitter
  after each invalid prompt burst and before existing post-close recovery
  jitter.
- Added explicit asymmetry assertions for
  `postClosePromptBurstRecoverySettleJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst recovery-confirm asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst recovery-confirm asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst recovery-confirm jitter
  after valid prompt success confirmation and before existing post-close
  recovery-confirm jitter.
- Added explicit asymmetry assertions for
  `postClosePromptBurstRecoveryConfirmJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst handoff asymmetry coverage)

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst recovery-drift asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst recovery-drift asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst recovery-drift jitter for
  non-final sessions after post-close cycle-handoff jitter.
- Added explicit asymmetry assertions for
  `postClosePromptBurstRecoveryDriftJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst recovery-transition asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst recovery-transition asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst recovery-transition jitter
  for non-final sessions after post-close prompt-burst recovery-drift jitter.
- Added explicit asymmetry assertions for
  `postClosePromptBurstRecoveryTransitionJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst recovery-cooldown asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst recovery-cooldown asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst recovery-cooldown jitter
  for non-final sessions after post-close recovery-settle jitter and before
  post-close cycle-handoff jitter.
- Added explicit asymmetry assertions for
  `postClosePromptBurstRecoveryCooldownJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst recovery-handoff asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst recovery-handoff asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst recovery-handoff jitter
  for non-final sessions after post-close recovery-confirm jitter and before
  post-recovery delay.
- Added explicit asymmetry assertions for
  `postClosePromptBurstRecoveryHandoffJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt-burst handoff asymmetry coverage)

### Summary
- Added reconnect-order post-close prompt-burst handoff asymmetry to
  `keeps reconnect-order inversion stable across dual cadence stream cycles`.
- Test now applies order-path-specific prompt-burst handoff jitter after the
  first session handoff in each cycle, before existing post-close prompt
  scheduling jitter.
- Added explicit asymmetry assertions for
  `postClosePromptBurstHandoffJitter*ByCycleMs` arrays to lock
  `SSE-first` vs `websocket-first` divergence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `bun run lint` ❌ (`bun: command not found`)
  - `npx biome check . && npx eslint .` ✅
  - `bun run typecheck` ❌ (`bun: command not found`)
  - `npx tsc --noEmit` ✅
  - `bun run test` ❌ (`bun: command not found`)
  - `npx vitest run` ✅
  - `bun run build` ❌ (`bun: command not found`)
  - `npx tsup` ✅
  - `bun run check:literals:strict` ❌ (`bun: command not found`)
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close prompt scheduling asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close prompt
  scheduling jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close prompt jitter.
  - `websocket-first` cycles apply higher post-close prompt jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close prompt scheduling asymmetry is layered with post-
    close create scheduling asymmetry, close-interleave asymmetry, close-delay
    asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry, burst-
    spacing asymmetry, recovery-jitter asymmetry, create-jitter asymmetry,
    stream-open jitter asymmetry, segment-count asymmetry, and cadence
    variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `50b6b3f`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close recovery scheduling asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close recovery
  scheduling jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close recovery jitter.
  - `websocket-first` cycles apply higher post-close recovery jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close recovery scheduling asymmetry is layered with post-
    close prompt scheduling asymmetry, post-close create scheduling asymmetry,
    close-interleave asymmetry, close-delay asymmetry, cycle-cooldown
    asymmetry, post-recovery delay asymmetry, burst-spacing asymmetry,
    recovery-jitter asymmetry, create-jitter asymmetry, stream-open jitter
    asymmetry, segment-count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `a9278f4`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close cycle transition asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close cycle
  transition jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close cycle transition jitter.
  - `websocket-first` cycles apply higher post-close cycle transition jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close cycle transition asymmetry is layered with post-
    close recovery scheduling asymmetry, post-close prompt scheduling
    asymmetry, post-close create scheduling asymmetry, close-interleave
    asymmetry, close-delay asymmetry, cycle-cooldown asymmetry, post-recovery
    delay asymmetry, burst-spacing asymmetry, recovery-jitter asymmetry,
    create-jitter asymmetry, stream-open jitter asymmetry, segment-count
    asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `15ecd4c`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close segment-open gating asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close segment-
  open gating jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close segment-open gating jitter.
  - `websocket-first` cycles apply higher post-close segment-open gating jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close segment-open gating asymmetry is layered with post-
    close cycle transition asymmetry, post-close recovery scheduling asymmetry,
    post-close prompt scheduling asymmetry, post-close create scheduling
    asymmetry, close-interleave asymmetry, close-delay asymmetry, cycle-
    cooldown asymmetry, post-recovery delay asymmetry, burst-spacing
    asymmetry, recovery-jitter asymmetry, create-jitter asymmetry, stream-open
    jitter asymmetry, segment-count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `1ab7b8b`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close segment-rearm asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close segment-
  rearm jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close segment-rearm jitter.
  - `websocket-first` cycles apply higher post-close segment-rearm jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close segment-rearm asymmetry is layered with post-close
    segment-open gating asymmetry, post-close cycle transition asymmetry, post-
    close recovery scheduling asymmetry, post-close prompt scheduling
    asymmetry, post-close create scheduling asymmetry, close-interleave
    asymmetry, close-delay asymmetry, cycle-cooldown asymmetry, post-recovery
    delay asymmetry, burst-spacing asymmetry, recovery-jitter asymmetry,
    create-jitter asymmetry, stream-open jitter asymmetry, segment-count
    asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `32ff8e5`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close invalid-burst ramp asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close invalid-
  burst ramp jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close invalid-burst ramp jitter.
  - `websocket-first` cycles apply higher post-close invalid-burst ramp jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close invalid-burst ramp asymmetry is layered with post-
    close segment-rearm asymmetry, post-close segment-open gating asymmetry,
    post-close cycle transition asymmetry, post-close recovery scheduling
    asymmetry, post-close prompt scheduling asymmetry, post-close create
    scheduling asymmetry, close-interleave asymmetry, close-delay asymmetry,
    cycle-cooldown asymmetry, post-recovery delay asymmetry, burst-spacing
    asymmetry, recovery-jitter asymmetry, create-jitter asymmetry, stream-open
    jitter asymmetry, segment-count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `4fd714e`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close valid-prompt ramp asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close valid-
  prompt ramp jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close valid-prompt ramp jitter.
  - `websocket-first` cycles apply higher post-close valid-prompt ramp jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close valid-prompt ramp asymmetry is layered with post-
    close invalid-burst ramp asymmetry, post-close segment-rearm asymmetry,
    post-close segment-open gating asymmetry, post-close cycle transition
    asymmetry, post-close recovery scheduling asymmetry, post-close prompt
    scheduling asymmetry, post-close create scheduling asymmetry, close-
    interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
    post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
    asymmetry, create-jitter asymmetry, stream-open jitter asymmetry, segment-
    count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `0254711`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-confirm asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close recovery-
  confirm jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close recovery-confirm jitter.
  - `websocket-first` cycles apply higher post-close recovery-confirm jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close recovery-confirm asymmetry is layered with post-
    close valid-prompt ramp asymmetry, post-close invalid-burst ramp
    asymmetry, post-close segment-rearm asymmetry, post-close segment-open
    gating asymmetry, post-close cycle transition asymmetry, post-close
    recovery scheduling asymmetry, post-close prompt scheduling asymmetry,
    post-close create scheduling asymmetry, close-interleave asymmetry, close-
    delay asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
    burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
    asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
    cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `52c58b7`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close recovery-settle asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close recovery-
  settle jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close recovery-settle jitter.
  - `websocket-first` cycles apply higher post-close recovery-settle jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close recovery-settle asymmetry is layered with post-
    close recovery-confirm asymmetry, post-close valid-prompt ramp asymmetry,
    post-close invalid-burst ramp asymmetry, post-close segment-rearm
    asymmetry, post-close segment-open gating asymmetry, post-close cycle
    transition asymmetry, post-close recovery scheduling asymmetry, post-close
    prompt scheduling asymmetry, post-close create scheduling asymmetry, close-
    interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
    post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
    asymmetry, create-jitter asymmetry, stream-open jitter asymmetry, segment-
    count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `ad6c97a`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close cycle-handoff asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close cycle-
  handoff jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close cycle-handoff jitter.
  - `websocket-first` cycles apply higher post-close cycle-handoff jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close cycle-handoff asymmetry is layered with post-close
    recovery-settle asymmetry, post-close recovery-confirm asymmetry, post-
    close valid-prompt ramp asymmetry, post-close invalid-burst ramp
    asymmetry, post-close segment-rearm asymmetry, post-close segment-open
    gating asymmetry, post-close cycle transition asymmetry, post-close
    recovery scheduling asymmetry, post-close prompt scheduling asymmetry,
    post-close create scheduling asymmetry, close-interleave asymmetry, close-
    delay asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
    burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
    asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
    cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `bfdfa8e`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close cycle-cooldown handoff asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close cycle-
  cooldown handoff jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close cycle-cooldown handoff jitter.
  - `websocket-first` cycles apply higher post-close cycle-cooldown handoff
    jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close cycle-cooldown handoff asymmetry is layered with
    post-close cycle-handoff asymmetry, post-close recovery-settle asymmetry,
    post-close recovery-confirm asymmetry, post-close valid-prompt ramp
    asymmetry, post-close invalid-burst ramp asymmetry, post-close segment-
    rearm asymmetry, post-close segment-open gating asymmetry, post-close
    cycle transition asymmetry, post-close recovery scheduling asymmetry,
    post-close prompt scheduling asymmetry, post-close create scheduling
    asymmetry, close-interleave asymmetry, close-delay asymmetry, cycle-
    cooldown asymmetry, post-recovery delay asymmetry, burst-spacing
    asymmetry, recovery-jitter asymmetry, create-jitter asymmetry, stream-open
    jitter asymmetry, segment-count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `0644dad`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close cycle-transition handoff asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close cycle-
  transition handoff jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close cycle-transition handoff jitter.
  - `websocket-first` cycles apply higher post-close cycle-transition handoff
    jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close cycle-transition handoff asymmetry is layered with
    post-close cycle-cooldown handoff asymmetry, post-close cycle-handoff
    asymmetry, post-close recovery-settle asymmetry, post-close recovery-
    confirm asymmetry, post-close valid-prompt ramp asymmetry, post-close
    invalid-burst ramp asymmetry, post-close segment-rearm asymmetry, post-
    close segment-open gating asymmetry, post-close cycle transition
    asymmetry, post-close recovery scheduling asymmetry, post-close prompt
    scheduling asymmetry, post-close create scheduling asymmetry, close-
    interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
    post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
    asymmetry, create-jitter asymmetry, stream-open jitter asymmetry, segment-
    count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `e883773`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close segment-open handoff asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close segment-
  open handoff jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close segment-open handoff jitter.
  - `websocket-first` cycles apply higher post-close segment-open handoff
    jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close segment-open handoff asymmetry is layered with
    post-close cycle-transition handoff asymmetry, post-close cycle-cooldown
    handoff asymmetry, post-close cycle-handoff asymmetry, post-close
    recovery-settle asymmetry, post-close recovery-confirm asymmetry, post-
    close valid-prompt ramp asymmetry, post-close invalid-burst ramp
    asymmetry, post-close segment-rearm asymmetry, post-close segment-open
    gating asymmetry, post-close cycle transition asymmetry, post-close
    recovery scheduling asymmetry, post-close prompt scheduling asymmetry,
    post-close create scheduling asymmetry, close-interleave asymmetry, close-
    delay asymmetry, cycle-cooldown asymmetry, post-recovery delay asymmetry,
    burst-spacing asymmetry, recovery-jitter asymmetry, create-jitter
    asymmetry, stream-open jitter asymmetry, segment-count asymmetry, and
    cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `b0d209c`
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close segment-rearm handoff asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close segment-
  rearm handoff jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close segment-rearm handoff jitter.
  - `websocket-first` cycles apply higher post-close segment-rearm handoff
    jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close segment-rearm handoff asymmetry is layered with
    post-close segment-open handoff asymmetry, post-close cycle-transition
    handoff asymmetry, post-close cycle-cooldown handoff asymmetry, post-close
    cycle-handoff asymmetry, post-close recovery-settle asymmetry, post-close
    recovery-confirm asymmetry, post-close valid-prompt ramp asymmetry, post-
    close invalid-burst ramp asymmetry, post-close segment-rearm asymmetry,
    post-close segment-open gating asymmetry, post-close cycle transition
    asymmetry, post-close recovery scheduling asymmetry, post-close prompt
    scheduling asymmetry, post-close create scheduling asymmetry, close-
    interleave asymmetry, close-delay asymmetry, cycle-cooldown asymmetry,
    post-recovery delay asymmetry, burst-spacing asymmetry, recovery-jitter
    asymmetry, create-jitter asymmetry, stream-open jitter asymmetry, segment-
    count asymmetry, and cadence variation.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Plan backlog expansion and checklist format normalization)

### Summary
- Updated `PLAN3.md` to add a severity-ordered backlog of 50 incomplete tasks
  focused on:
  - critical bugs and reliability gaps
  - performance and memory-leak risks
  - cross-platform behavior (Windows/Linux/macOS)
  - NutJS capability, safety, and CI-readiness
  - simplification-first cleanup opportunities
- Ensured new plan entries use strict checklist formatting with no emoji:
  - `- [ ] - ...` for incomplete tasks
  - existing completed entries remain `- [x] - ...` where applicable

### Validation
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Branch: `cursor/plan3-tasks-completion-62e5`

## 2026-02-14 (Merged env-map reconnect-order post-close create scheduling asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close create
  scheduling jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test validates:
  - `SSE-first` cycles apply lower post-close create jitter.
  - `websocket-first` cycles apply higher post-close create jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close create scheduling asymmetry is layered with close-
    interleave, close-delay, cycle-cooldown, post-recovery delay, burst-
    spacing, recovery-jitter, create-jitter, stream-open jitter, segment-count,
    and cadence asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

### Git
- Commit: `3bf88c1`
- Branch: `cursor/plan3-tasks-completion-62e5`
- Pushed to origin.
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order post-close create scheduling asymmetry coverage)

### Summary
- Added reconnect-order hardening coverage for asymmetric post-close create
  scheduling jitter by order path in
  `__tests__/integration/server/headless-server.integration.test.ts`.
- Test now validates:
  - `SSE-first` cycles apply lower post-close create jitter.
  - `websocket-first` cycles apply higher post-close create jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while post-close create scheduling asymmetry is layered with close-
    interleave, close-delay, cycle-cooldown, post-recovery delay, burst-
    spacing, recovery-jitter, create-jitter, stream-open jitter, segment-count,
    and cadence asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order close-interleave asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order close-delay coverage with asymmetric close-
  interleave timing between websocket/SSE segment completion handlers.
- Test now validates:
  - `SSE-first` cycles apply lower close-interleave delays.
  - `websocket-first` cycles apply higher close-interleave delays.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + recovery-jitter asymmetry + burst-
    spacing asymmetry + post-recovery delay asymmetry + cycle-cooldown
    asymmetry + close-delay asymmetry + close-interleave asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order close-delay asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order cycle-cooldown coverage with asymmetric websocket
  and SSE close-delay amplitudes by order path.
- Test now validates:
  - `SSE-first` cycles apply lower websocket/SSE close-delay amplitudes.
  - `websocket-first` cycles apply higher websocket/SSE close-delay amplitudes.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + recovery-jitter asymmetry + burst-
    spacing asymmetry + post-recovery delay asymmetry + cycle-cooldown
    asymmetry + close-delay asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order cycle-cooldown asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order post-recovery delay coverage with asymmetric
  cycle-end cooldown jitter amplitudes by order path.
- Test now validates:
  - `SSE-first` cycles apply lower cycle-end cooldown jitter amplitudes.
  - `websocket-first` cycles apply higher cycle-end cooldown jitter amplitudes.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + recovery-jitter asymmetry + burst-
    spacing asymmetry + post-recovery delay asymmetry + cycle-cooldown
    asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order post-recovery delay asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order burst-spacing asymmetry coverage with asymmetric
  valid-prompt post-recovery delay amplitudes by order path.
- Test now validates:
  - `SSE-first` cycles apply lower post-recovery delay amplitudes.
  - `websocket-first` cycles apply higher post-recovery delay amplitudes.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + recovery-jitter asymmetry + burst-
    spacing asymmetry + post-recovery delay asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order burst-spacing asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order recovery-jitter asymmetry coverage with asymmetric
  invalid-prompt burst-spacing amplitudes by order path.
- Test now validates:
  - `SSE-first` cycles apply lower invalid-burst spacing amplitudes.
  - `websocket-first` cycles apply higher invalid-burst spacing amplitudes.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + recovery-jitter asymmetry + burst-
    spacing asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order recovery-jitter asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order create-jitter asymmetry coverage with asymmetric
  invalid-prompt recovery jitter amplitudes by order path.
- Test now validates:
  - `SSE-first` cycles apply lower recovery-jitter amplitudes.
  - `websocket-first` cycles apply higher recovery-jitter amplitudes.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + recovery-jitter asymmetry.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order create-jitter asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order jitter-amplitude coverage with asymmetric
  create-jitter amplitudes by order path.
- Test now validates:
  - `SSE-first` cycles apply lower create-jitter amplitudes.
  - `websocket-first` cycles apply higher create-jitter amplitudes.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + stream-open jitter
    asymmetry + create-jitter asymmetry + asymmetric invalid-prompt bursts.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order jitter amplitude asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order segment-asymmetry coverage with asymmetric
  websocket vs SSE segment-open jitter amplitudes per order path.
- Test now validates:
  - `SSE-first` cycles use lower websocket open jitter with higher SSE jitter.
  - `websocket-first` cycles invert that jitter amplitude split.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + segment-count asymmetry + jitter-amplitude
    asymmetry + asymmetric invalid-prompt burst pressure.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (merged env-map reconnect-order segment asymmetry coverage)

### Summary
- Updated `__tests__/integration/server/headless-server.integration.test.ts`
  to expand reconnect-order jitter/cadence coverage with asymmetric websocket
  vs SSE reconnect segment counts per order path.
- Test now validates:
  - `SSE-first` cycles use fewer websocket segments and more SSE segments.
  - `websocket-first` cycles invert that segment split.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity stays stable
    under combined cadence + jitter + segment-count asymmetry + asymmetric
    invalid-prompt burst pressure.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order jitter expansion coverage)

### Summary
- Expanded reconnect-order inversion cadence coverage by introducing explicit
  per-order-path jitter arrays:
  - stream-open jitter varies by order path/cycle.
  - create-request jitter varies by order path/cycle.
- Test validates:
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable under combined order-path cadence + jitter expansion.
  - asymmetric invalid-prompt burst pressure (`SSE-first` vs
    `websocket-first`) remains stable.
  - valid prompt recovery and unique session-id continuity remain stable across
    the full expanded sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable with per-cycle jitter variation"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order cadence expansion coverage)

### Summary
- Expanded reconnect-order inversion integration coverage so cadence differs by
  order path within one runtime:
  - `SSE-first` cycles now run lower create cadence.
  - `websocket-first` cycles now run higher create cadence.
- Test validates:
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable across the expanded per-order-path cadence pattern.
  - asymmetric invalid-prompt burst sizes per order path remain stable.
  - valid-prompt recovery remains stable and all session ids remain unique.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable with per-cycle jitter variation"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order asymmetric burst coverage)

### Summary
- Expanded reconnect-order inversion integration coverage with additional
  alternating `SSE-first` and `websocket-first` cycles under dual cadence.
- Test validates:
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable across the expanded order-inversion sequence.
  - invalid-prompt burst sizes are asymmetric by order path:
    - `SSE-first` cycles use smaller invalid-prompt bursts.
    - `websocket-first` cycles use larger invalid-prompt bursts.
  - valid prompt recovery succeeds after each asymmetric burst cycle and all
    created session ids remain unique.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable with per-cycle jitter variation"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order jitter coverage)

### Summary
- Added headless integration coverage for reconnect-order inversion with
  per-cycle jitter variation across dual-cadence stream cycles.
- Test validates:
  - SSE-first and websocket-first open orders both remain stable under jitter.
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remains
    stable while cadence and jitter vary per cycle.
  - repeated invalid-prompt bursts reject correctly and valid prompts recover.
  - session ids remain unique across the full jittered sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable with per-cycle jitter variation"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map reconnect-order inversion coverage)

### Summary
- Added headless integration coverage for dual-cadence reconnect flows that
  alternate reconnect-order inversion by cycle:
  - SSE-first (`SSE -> websocket`) in selected cycles.
  - websocket-first (`websocket -> SSE`) in alternating cycles.
- Test validates:
  - websocket `SESSION_CREATED` segment continuity remains stable.
  - SSE `STATE_UPDATE` segment continuity remains stable.
  - invalid-prompt bursts are rejected and valid-prompt recovery succeeds
    across all sessions created under both reconnect orders.
  - created session ids remain unique across the full order-inversion run.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps reconnect-order inversion stable across dual cadence stream cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map variable SSE cadence reconnect coverage)

### Summary
- Added headless integration coverage for reconnect runs where SSE reconnect
  cadence varies per cycle while session-create requests continue alternating
  default and explicit `harnessId: "mock"` paths.
- Test validates:
  - websocket `SESSION_CREATED` event continuity remains stable for each
    per-cycle create segment.
  - SSE `/api/events` reconnect cadence variation still yields expected
    `STATE_UPDATE` events across all reconnect segments.
  - repeated invalid-prompt bursts are rejected and valid-prompt recovery
    remains stable across all created sessions.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps burst-size reconnect cycles stable with variable sse reconnect cadence"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map dual cadence reconnect coverage)

### Summary
- Added headless integration coverage for reconnect runs where both websocket
  reconnect cadence and SSE reconnect cadence vary per cycle under merged
  env-map empty-expansion configuration.
- Test validates:
  - each websocket reconnect segment receives expected `SESSION_CREATED` events.
  - each SSE reconnect segment receives expected `STATE_UPDATE` events.
  - repeated invalid-prompt burst rejections and valid-prompt recoveries remain
    stable across all sessions created during cadence permutations.
  - all created session ids remain unique across the full run.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps variable websocket and sse reconnect cadence stable across burst cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map variable SSE cadence reconnect coverage)

### Summary
- Added headless integration coverage for merged env-map reconnect runs where
  SSE stream reconnect cadence varies per cycle while session-create requests
  continue alternating default and explicit `harnessId: "mock"` paths.
- Test validates:
  - websocket `SESSION_CREATED` events remain continuous for each per-cycle
    create burst.
  - per-create SSE `/api/events` reconnections continue receiving
    `STATE_UPDATE` events across cadence permutations.
  - invalid prompt bursts are consistently rejected and valid prompt recovery
    succeeds for all sessions created during the cadence run.
  - all created session ids remain unique across the extended sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps burst-size reconnect cycles stable with variable sse reconnect cadence"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map alternating burst-size reconnect coverage)

### Summary
- Added headless integration coverage for extended reconnect sequences under
  merged env-map empty-expansion configuration where each cycle alternates:
  - default vs explicit `harnessId: "mock"` session-create requests,
  - mixed websocket close timing, and
  - variable invalid-prompt burst sizes before valid-prompt recovery.
- Test validates:
  - websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity remain
    stable across all burst-size permutations.
  - repeated invalid prompt submissions are consistently rejected.
  - follow-up valid prompt submissions recover successfully in every cycle.
  - all created session ids remain unique across the extended run.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps jitter reconnect cycles stable with alternating invalid-prompt burst sizes"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map state-update stream continuity coverage)

### Summary
- Extended merged env-map websocket continuity integration scenario with
  concurrent `/api/events` SSE coverage.
- Test now validates repeated `STATE_UPDATE` stream delivery while mixed
  create/invalid-prompt/valid-prompt cycles execute.
- Combined stream assertions now lock both websocket `SESSION_CREATED` and SSE
  `STATE_UPDATE` continuity in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map SSE reconnect continuity coverage)

### Summary
- Added headless integration coverage for `/api/events` SSE teardown/reconnect
  behavior after prompt validation failures in merged env-map empty-expansion
  scenarios.
- Test validates:
  - first SSE stream receives `STATE_UPDATE` events during session creation.
  - invalid prompt validation failure and follow-up valid prompt do not break
    stream reconnection behavior.
  - second SSE stream reconnect still receives `STATE_UPDATE` events in the
    same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps state-update stream reconnectable after merged env-map validation failures"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map interleaved stream reconnect coverage)

### Summary
- Added headless integration coverage for interleaved websocket and `/api/events`
  SSE reconnect cycles under merged env-map empty-expansion validation flows.
- Test validates:
  - first websocket/SSE pair remains stable across two session creations with
    invalid prompt rejection and valid prompt recovery.
  - second websocket/SSE pair reconnects and still receives
    `SESSION_CREATED` / `STATE_UPDATE` events in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps interleaved websocket and sse reconnect cycles stable under merged env-map validation"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map alternating reconnect coverage)

### Summary
- Added headless integration coverage for repeated reconnect cycles with
  alternating default and explicit `mock` harness session-create requests.
- Test validates:
  - each reconnect cycle receives websocket `SESSION_CREATED` and SSE
    `STATE_UPDATE` events.
  - invalid prompt payload rejection and follow-up valid prompt recovery remain
    stable across alternating cycles.
  - all created session ids remain unique across the sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps alternating default and explicit reconnect cycles stable under merged env-map validation"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map alternating burst reconnect coverage)

### Summary
- Added headless integration coverage for alternating reconnect cycles that
  include repeated invalid prompt payload bursts before recovery.
- Test validates:
  - each reconnect cycle receives websocket `SESSION_CREATED` and SSE
    `STATE_UPDATE` events.
  - two consecutive invalid prompt payload submissions are rejected with
    canonical bad-request responses in each cycle.
  - follow-up valid prompt submissions recover successfully and session ids
    remain unique across the sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps alternating reconnect cycles stable across invalid prompt bursts"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map mixed-close reconnect coverage)

### Summary
- Added headless integration coverage for alternating reconnect cycles with
  mixed websocket close timing (before/after prompt recovery).
- Test validates:
  - each cycle receives websocket `SESSION_CREATED` and SSE `STATE_UPDATE`
    events regardless of close order.
  - invalid prompt rejection and valid prompt recovery remain stable in all
    cycles.
  - session ids remain unique across mixed-close reconnect sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps alternating reconnect cycles stable with mixed websocket close timing"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map jitter reconnect coverage)

### Summary
- Added headless integration coverage for extended alternating reconnect cycles
  with mixed websocket close timing and reconnect jitter.
- Test validates:
  - each jittered cycle receives websocket `SESSION_CREATED` and SSE
    `STATE_UPDATE` events.
  - invalid prompt rejection and valid prompt recovery remain stable in all
    jittered cycles.
  - session ids remain unique across the full extended sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts -t "keeps mixed-close reconnect jitter stable across extended alternating cycles"` ✅
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Unregistered adapter create-session integration coverage)

### Summary
- Added headless integration coverage for create-session when configured default
  harness exists but no matching adapter is registered.
- Test provisions temporary isolated harness config and asserts:
  - `404 Not Found`
  - `formatHarnessAdapterNotRegisteredError("custom")`

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-config fallback-on-load-failure coverage)

### Summary
- Added integration coverage ensuring headless server falls back to default
  harness config when `loadHarnessConfig(...)` fails due to invalid harness
  config file data.
- Test validates that startup remains functional by creating a session through
  fallback `mock` harness under invalid-config conditions.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Default-harness cursor flag parsing coverage)

### Summary
- Expanded default harness config unit coverage for cursor feature-flag parsing:
  - padded truthy value (`" true "`) includes cursor harness
  - falsey/invalid values (`"false"`, `"0"`, `"maybe"`) exclude cursor harness
    even when cursor command/args overrides are present

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/default-harness-config.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Boolean env-flag parser coverage)

### Summary
- Added direct unit coverage for `parseBooleanEnvFlag(...)`:
  - undefined input behavior
  - truthy values (`true`, padded/case-insensitive, `1`)
  - falsey values (`false`, padded/case-insensitive, `0`)
  - unsupported values (`""`, whitespace-only, `yes`, `no`, `2`)

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/utils/boolean-flags.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Empty harness-config fallback integration coverage)

### Summary
- Added headless integration coverage for fallback behavior when harness config
  file resolves to no harnesses (`harnesses: {}`).
- Test provisions isolated empty harness config and validates session creation
  still succeeds via fallback `mock` harness config path.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Missing-default harness fallback integration coverage)

### Summary
- Added headless integration coverage for fallback behavior when harness config
  has a `defaultHarness` that does not exist in configured harness entries.
- Test provisions isolated harness config with unmatched default and validates
  session creation still succeeds via fallback `mock` harness config path.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Malformed harness-config JSON fallback integration coverage)

### Summary
- Added headless integration coverage for fallback behavior when harness config
  file exists but contains malformed JSON.
- Test provisions isolated malformed `harnesses.json` content and validates
  session creation still succeeds via fallback `mock` harness config path.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Cursor connect-failure resilience integration coverage)

### Summary
- Added headless integration coverage for cursor harness connection failures
  when cursor feature flag is enabled and cursor command is missing.
- Test validates:
  - `cursor-cli` session creation fails with canonical server error response.
  - server remains responsive by successfully creating a subsequent `mock`
    harness session.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Cursor feature-flag adapter-disable integration coverage)

### Summary
- Added headless integration coverage for config + feature-flag mismatch where:
  - `cursor-cli` is configured as default harness in harness config.
  - cursor adapter is disabled via `TOADSTOOL_CURSOR_CLI_ENABLED=false`.
- Test validates session creation returns canonical
  `formatHarnessAdapterNotRegisteredError("cursor-cli")` response.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Partial harness availability integration coverage)

### Summary
- Added headless integration coverage for mixed harness availability when:
  - `cursor-cli` is configured but adapter is disabled by feature flag.
  - `mock` harness is simultaneously configured and adapter remains registered.
- Test validates:
  - explicit `cursor-cli` requests return canonical adapter-not-registered response.
  - explicit `mock` requests still succeed in the same running server.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Default cursor connect-failure integration coverage)

### Summary
- Added headless integration coverage for the default-harness failure path when:
  - `defaultHarness` is configured to `cursor-cli`
  - cursor adapter is enabled
  - cursor command fails connection checks
- Test validates:
  - default `/sessions` create call returns canonical server error.
  - explicit follow-up `/sessions` create call with `mock` still succeeds in
    the same server instance.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Default cursor disabled partial-availability integration coverage)

### Summary
- Added headless integration coverage for mixed availability when:
  - `defaultHarness` is configured to `cursor-cli`
  - cursor adapter is disabled via feature flag
  - alternate configured harness (`mock`) remains available
- Test validates:
  - default `/sessions` create call returns canonical adapter-not-registered error.
  - explicit `/sessions` create call with `mock` still succeeds in the same
    running server instance.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-registry factory fallback coverage)

### Summary
- Expanded harness-registry factory unit coverage:
  - `includeMock: false` now explicitly verified to omit mock adapter.
  - unsupported cursor env flag values now explicitly verified to use provided
    fallback defaults in `isCursorHarnessEnabled(...)`.
  - adapter-id assertions now use shared harness default constants.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-registry-factory.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Cursor default-config disablement integration coverage)

### Summary
- Added headless integration coverage for default-config cursor disablement:
  - cursor feature flag disabled
  - no custom harness-config override
- Test validates:
  - explicit `cursor-cli` session request returns canonical
    harness-not-configured response.
  - explicit `mock` session request still succeeds in the same server instance.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-registry normalization unit coverage)

### Summary
- Expanded harness-registry factory unit coverage:
  - `createHarnessRegistry(...)` now explicitly verified to omit mock adapters
    when `includeMock: false`.
  - `isCursorHarnessEnabled(...)` now explicitly verified for padded and
    case-insensitive env-flag values.

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-registry-factory.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated cursor connect-failure integration coverage)

### Summary
- Added headless integration coverage for repeated default cursor-harness
  connection failures in one running server instance.
- Test validates:
  - two consecutive default `/sessions` calls return canonical server errors
    when cursor connect checks fail.
  - explicit `mock` session creation still succeeds immediately afterward.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated cursor-not-configured integration coverage)

### Summary
- Added headless integration coverage for repeated explicit `cursor-cli`
  requests when cursor is disabled in default harness config.
- Test validates:
  - two consecutive explicit `cursor-cli` requests return canonical
    harness-not-configured responses.
  - explicit `mock` session creation still succeeds in the same server
    instance afterward.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Harness-registry cursor-disable unit coverage)

### Summary
- Expanded harness-registry factory unit coverage with an explicit registry-level
  assertion for cursor disablement behavior.
- Added test to verify `createHarnessRegistry({ enableCursor: false, includeMock: true })`:
  - excludes `cursor-cli`
  - still includes `mock`

### Validation
- Targeted:
  - `npx vitest run __tests__/unit/harness/harness-registry-factory.unit.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated adapter-not-registered integration coverage)

### Summary
- Added headless integration coverage for repeated adapter-not-registered
  responses when:
  - `defaultHarness` is configured as `cursor-cli`
  - cursor adapter is disabled (`TOADSTOOL_CURSOR_CLI_ENABLED=false`)
- Test validates:
  - two consecutive default `/sessions` requests return canonical
    adapter-not-registered responses.
  - explicit `mock` session creation still succeeds in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated default cursor-disabled integration coverage)

### Summary
- Added headless integration coverage for repeated default-route failures when:
  - `defaultHarness` is `cursor-cli`
  - cursor adapter is disabled via feature flag
- Test validates:
  - two consecutive default `/sessions` requests return canonical
    adapter-not-registered responses.
  - explicit `mock` session creation still succeeds in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated explicit cursor connect-failure integration coverage)

### Summary
- Added headless integration coverage for repeated explicit cursor session
  requests when cursor is enabled but cursor command connect checks fail.
- Test validates:
  - two consecutive explicit `harnessId: "cursor-cli"` requests return
    canonical server-error responses.
  - explicit `mock` session creation still succeeds in the same runtime
    afterward.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated unknown-harness continuity integration coverage)

### Summary
- Added headless integration coverage for repeated explicit unknown harness
  session requests using `harnessId: "missing-harness"`.
- Test validates:
  - two consecutive unknown-harness requests return canonical
    harness-not-configured responses.
  - explicit `mock` session creation still succeeds in the same runtime
    afterward.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated default custom-adapter continuity integration coverage)

### Summary
- Added headless integration coverage for repeated default-route requests when
  `defaultHarness` is configured as an unregistered custom adapter id.
- Test validates:
  - two consecutive default `/sessions` requests return canonical
    adapter-not-registered responses for the custom harness id.
  - explicit `mock` session creation still succeeds in the same runtime
    afterward.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated fallback mock continuity integration coverage)

### Summary
- Added headless integration coverage for repeated explicit mock requests when
  harness config loading fails and server uses fallback default config.
- Test validates:
  - two consecutive fallback-path mock session requests both succeed.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated fallback-trigger continuity integration coverage)

### Summary
- Added headless integration coverage for repeated explicit mock requests when
  fallback is triggered by:
  - empty configured harnesses
  - missing configured default harness id
- Tests validate:
  - two consecutive fallback-triggered mock session requests succeed per
    scenario.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated merge-override fallback continuity integration coverage)

### Summary
- Added headless integration coverage for repeated explicit mock requests when:
  - project harness config is valid
  - user harness config overrides `defaultHarness` with a missing id
  - merged harness resolution fails and server falls back to default config
- Test validates:
  - two consecutive fallback-path mock session requests succeed.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated merged-runtime override continuity integration coverage)

### Summary
- Added headless integration coverage for repeated default-route requests when:
  - project config defines `cursor-cli` default and mock fallback harness
  - user config preserves `cursor-cli` id but overrides cursor command to a
    missing runtime binary
- Test validates:
  - two consecutive default `/sessions` requests return canonical server-error
    responses.
  - explicit `mock` session creation still succeeds in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated merged env-expansion override continuity coverage)

### Summary
- Added headless integration coverage for repeated explicit mock requests when:
  - project config defines a valid `mock` harness id
  - user config preserves `mock` id but overrides command with env expansion
    (`${TOADSTOOL_CURSOR_COMMAND}`) that resolves to empty
  - merged harness config re-validation fails and server falls back to default
    harness configuration
- Test validates:
  - repeated explicit mock session creation remains successful.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated merged cwd-override continuity coverage)

### Summary
- Added headless integration coverage for repeated explicit mock requests when:
  - project config defines valid `mock` harness id
  - user config preserves `mock` id but overrides `cwd` with env expansion
    (`${TOADSTOOL_CURSOR_COMMAND}`) that resolves to empty
  - merged harness config re-validation fails and server falls back to default
    harness configuration
- Test validates:
  - repeated explicit mock session creation remains successful.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated merged blank-command override continuity coverage)

### Summary
- Added headless integration coverage for repeated explicit mock requests when:
  - project config defines valid `mock` harness id
  - user config preserves `mock` id but overrides `command` with blank value
  - merged harness config re-validation fails and server falls back to default
    harness configuration
- Test validates:
  - repeated explicit mock session creation remains successful.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Repeated merged env-map continuity coverage)

### Summary
- Added headless integration coverage for repeated default-route requests when:
  - project config defines valid `mock` harness id/command/cwd
  - user config preserves `mock` id and command/cwd but overrides env map
    values that expand to empty strings
  - merged harness config remains valid (no fallback path)
- Test validates:
  - repeated default session creation remains successful.
  - returned session ids are valid and distinct across repeats.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Merged env-map prompt continuity coverage)

### Summary
- Added headless integration coverage for repeated session creation followed by
  prompt submissions when merged env-map overrides expand to empty values.
- Test validates:
  - repeated default session creation remains successful under merged env-map
    empty-expansion configuration.
  - prompt submissions on those sessions return canonical successful responses.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Merged env-map mixed-request continuity coverage)

### Summary
- Added headless integration coverage for mixed default and explicit session
  creation requests under merged env-map empty-expansion configuration.
- Test validates:
  - repeated mixed-path session creation remains successful.
  - created session ids are valid and distinct.
  - follow-up prompt submission remains successful after the mixed sequence.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Merged env-map mixed-validation continuity coverage)

### Summary
- Added headless integration coverage for mixed explicit/default session-create
  ordering combined with invalid prompt payload rejection under merged env-map
  empty-expansion configuration.
- Test validates:
  - invalid prompt payload is rejected with canonical bad-request response.
  - subsequent valid prompt submission succeeds.
  - trailing session creation remains successful in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-13 (Merged env-map repeated invalid-cycle continuity coverage)

### Summary
- Added headless integration coverage for repeated invalid prompt payload
  validation cycles across multiple sessions under merged env-map
  empty-expansion configuration.
- Test validates:
  - invalid prompt payloads are repeatedly rejected with canonical bad-request
    responses.
  - valid prompt submissions recover successfully after each invalid cycle.
  - trailing session creation remains successful in the same runtime.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅
- Full gates (equivalent commands; bun/bunx unavailable in this shell):
  - `npx biome check . && npx eslint .` ✅
  - `npx tsc --noEmit` ✅
  - `npx vitest run` ✅
  - `npm run build` ❌ (`bunx: not found`)
  - `npm run check:literals:strict` ❌ (`bun: not found`)
  - `npx tsup` ✅
  - `npx tsx scripts/check-magic-literals.ts --strict` ✅

## 2026-02-14 (Merged env-map websocket continuity coverage)

### Summary
- Added headless integration coverage for websocket `SESSION_CREATED` event
  stability while merged env-map empty-expansion validation cycles execute.
- Test validates:
  - repeated create/invalid-prompt/valid-prompt cycles do not destabilize the
    websocket stream.
  - websocket event payloads include distinct session ids for all created
    sessions in the cycle.

### Validation
- Targeted:
  - `npx vitest run __tests__/integration/server/headless-server.integration.test.ts` ✅

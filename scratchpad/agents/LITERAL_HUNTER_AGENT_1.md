# Literal Hunter – Agent 1: Constants & env/platform/keyboard/boolean

**You are Agent 1 of 4.** Your scope: add new constant modules and replace env/platform/keyboard/boolean literals. Do not edit `src/ui/` except `Sidebar.tsx` and `ui-symbols.ts`; do not add to `config/limits.ts` or `config/timeouts.ts` (Agent 4).

## Todo IDs you own
- lit-1, lit-2, lit-3, lit-17, lit-23, lit-26

## 1. Add new constant modules

- **`src/constants/env-values.ts`**  
  `ENV_VALUE = { TEST: "test" } as const` and derived type. Used for `getEnvironment() === "test"`.

- **`src/constants/provider-stream.ts`** (optional in Agent 1; Agent 3 will use it)  
  Or leave for Agent 3 to add. If you add it: `STREAM_DONE_MARKER = "[DONE]"`, `FINISH_REASON_STOP = "stop"`, and event/delta types for content_block_delta, text_delta, thinking_delta, message_stop.

- **`src/constants/permission-patterns.ts`**  
  Add or extend: `PERMISSION_PATTERN = { WILDCARD: "*" } as const` (or merge into existing permission-patterns if present).

- **`src/constants/key-names.ts`**  
  Add `RIGHT_BRACKET: "]"` to `KEY_NAME`.

- **Config placeholder**  
  Add `CONFIG_PLACEHOLDER = { FILE: "$FILE" } as const` in `src/constants/` or next to code-formatter config (Agent 3 will use in code-formatter).

## 2. Replace usages (your files only)

- **`getEnvironment() === "test"` / `!== "test"`** in:
  - `src/tools/shell-session.ts`
  - `src/store/persistence/sqlite-provider.ts`
  - `src/core/session-stream.ts`
  - `src/utils/diff/diff-worker-client.ts`
  - `src/tools/builtin/question.ts`  
  Use `ENV_VALUE.TEST` from `env-values.ts`.

- **`process.platform === "win32"`** in:
  - `src/core/cursor/hooks-config-generator.ts`
  - `src/core/cursor/hook-ipc-server.ts`  
  Use `PLATFORM.WIN32` from `@/constants/platform`.

- **`key.name === "]"`** in `src/ui/components/Sidebar.tsx`  
  Use `KEY_NAME.RIGHT_BRACKET`.

- **Boolean string checks**  
  - `src/core/cross-tool/universal-loader.ts`: `alwaysMatch?.[1] === "true"` → use `BOOLEAN_STRINGS.TRUE`.
  - `src/core/agent-management/cli-output-parser.ts`: `"true"` / `"yes"` / `"1"` → use `BOOLEAN_STRINGS` or `TRUTHY_STRINGS` from `@/constants/boolean-strings`.
  - `src/constants/ui-symbols.ts`: `?.toLowerCase() === "true"` → compare to `BOOLEAN_STRINGS.TRUE` (or a small helper).
  - `src/utils/update-check.ts`: same for TOADSTOOL_DISABLE_UPDATE_CHECK → `BOOLEAN_STRINGS.TRUE`.

## 3. Do not do (other agents)

- Do not add limits/timeouts to `config/limits.ts` or `config/timeouts.ts`.
- Do not edit CommandPalette, RewindModal, StatusFooter, providers, repo-workflow, permissions.ts, etc. (Agents 2 and 3).
- Do not change `check-magic-literals.ts` or CI (Agent 4).

## 4. Verification

When done, run:
```bash
bun run lint && bun run typecheck && bun run build
```
Mark todos lit-1, lit-2, lit-3, lit-17, lit-23, lit-26 complete (or update MAGIC_LITERALS_TASKS.md).

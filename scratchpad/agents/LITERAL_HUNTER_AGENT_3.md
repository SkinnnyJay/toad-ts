# Literal Hunter – Agent 3: Core / providers / tools literal replacements

**You are Agent 3 of 4.** Your scope: replace literals in `src/core/`, `src/tools/`, `src/store/`, `src/server/`, and `src/harness/`. Add constant modules only when they don’t exist (e.g. provider-stream, cursor event types). Do not edit `config/limits.ts` or `config/timeouts.ts` or `scripts/check-magic-literals.ts` (Agent 4).

## Todo IDs you own
- lit-4, lit-5, lit-8, lit-9, lit-10, lit-12, lit-13, lit-14, lit-15, lit-16, lit-19, lit-20, lit-24

## 1. Provider stream constants (lit-9)

- Add **`src/constants/provider-stream.ts`** (or similar):
  - `STREAM_DONE_MARKER = "[DONE]"`, `FINISH_REASON_STOP = "stop"`, and event/delta types: e.g. `CONTENT_BLOCK_DELTA`, `TEXT_DELTA`, `THINKING_DELTA`, `MESSAGE_STOP` (matching provider usage).
- In **`src/core/providers/openai-provider.ts`**, **`openai-compatible-provider.ts`**, **`anthropic-provider.ts`**: replace raw `"[DONE]"`, `"stop"`, `"content_block_delta"`, `"text_delta"`, `"thinking_delta"`, `"message_stop"` with these constants.

## 2. repo-workflow (lit-4)

- **`src/core/repo-workflow.ts`**: replace state/decision string literals (`"merged"`, `"closed"`, `"open"`, `"approved"`, `"changes_requested"`, `"review_required"`) with constants from `@/constants/repo-workflow-status` (or add missing ones there).

## 3. Cursor CLI connection event types (lit-5)

- Add constants for event types (e.g. in `src/constants/cursor-event-types.ts` or existing): `"system"`, `"result"`.
- In **`src/core/cursor/cursor-cli-connection.ts`**: use those constants for `event.type === "system"` and `event.type === "result"`.

## 4. anthropic-provider role (lit-8)

- In **`src/core/providers/anthropic-provider.ts`**: replace `message.role === "system"` (and `!== "system"`) with `MESSAGE_ROLE.SYSTEM` from `@/constants/message-roles`.

## 5. permissions.ts (lit-10)

- In **`src/tools/permissions.ts`**: replace `option.kind === "reject_always"` and `"reject_once"` with `PERMISSION_OPTION_KIND.REJECT_ALWAYS` and `PERMISSION_OPTION_KIND.REJECT_ONCE` from `@/constants/permission-option-kinds`.

## 6. Permission wildcard (lit-12)

- In **`src/core/permission-modes.ts`** and **`src/core/cross-tool/skill-permissions.ts`**: replace `pattern === "*"` with a constant (e.g. `PERMISSION_PATTERN.WILDCARD` from `@/constants/permission-patterns`; add it there if missing).

## 7. Config / file path literals (lit-13, lit-14, lit-15, lit-16)

- **`src/core/code-formatter.ts`**: replace `"$FILE"` with `CONFIG_PLACEHOLDER.FILE` (add to constants if Agent 1 didn’t).
- **`src/core/cross-tool/init-generator.ts`**: replace `".env.sample"` with `PROJECT_FILES.ENV_SAMPLE` from `@/constants/project-files`.
- **`src/core/cross-tool/hooks-loader.ts`**: replace `"settings.json"` with a constant from `@/constants/config-files` (or project-files).
- **`src/tools/builtin/patch.ts`**: replace `"/dev/null"` with a constant (e.g. in `@/constants/file-paths.ts` or file-ref).

## 8. cursor-cli-harness transport (lit-19)

- In **`src/core/cursor/cursor-cli-harness.ts`**: replace `transport === "http"` with a constant (e.g. add `TRANSPORT.HTTP` in cursor or harness constants).

## 9. Mode constants agent/plan/ask (lit-20)

- In **`src/core/cursor/cursor-cli-agent-port.ts`** and **`src/core/cli-agent/cli-agent.base.ts`**: replace `mode === "agent"` / `"plan"` / `"ask"` with constants from `@/constants/focus-target` or `@/constants/sidebar-tabs` (use existing PLAN, AGENT, ASK).

## 10. hook-ipc-server error message (lit-24)

- In **`src/core/cursor/hook-ipc-server.ts`**: replace `error.message === "Payload too large."` with a constant (e.g. from `@/constants/error-codes` or a small ERROR_MESSAGE / agent-management-error-messages constant).

## 11. Do not do (other agents)

- Do not edit `src/ui/*` (except if a constant you add is re-exported from constants). Do not add to config/limits or config/timeouts. Do not change check-magic-literals or CI.

## 12. Verification

When done, run:
```bash
bun run lint && bun run typecheck && bun run build
```
Mark todos lit-4, lit-5, lit-8, lit-9, lit-10, lit-12, lit-13, lit-14, lit-15, lit-16, lit-19, lit-20, lit-24 complete.

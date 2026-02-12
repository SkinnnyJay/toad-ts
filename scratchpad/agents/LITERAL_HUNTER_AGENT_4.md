# Literal Hunter – Agent 4: Magic numbers, config, and CI lock-in

**You are Agent 4 of 4.** Your scope: add all missing limits/timeouts to config, replace every magic number in the codebase, optionally centralize throw-new-Error messages, and implement Phase 1–4 (check script + CI). Do not change literal replacements in UI or core beyond numeric/config changes (Agents 1–3 own those).

## Todo IDs you own
- lit-27, lit-30, lit-31, lit-32, lit-33, lit-34, lit-35, lit-36, lit-37, lit-38, lit-39, lit-40, lit-41

## 1. Add config entries (Phase 2 centralize)

- **`src/config/limits.ts`** (add only; don’t remove existing):
  - List agents: e.g. `CLOUD_AGENTS_LIST_LIMIT: 100` (or reuse existing if applicable).
  - Input history: `INPUT_HISTORY_SIZE: 200`.
  - Integrity check window: `INTEGRITY_CHECK_STALE_MS: 7 * 24 * 60 * 60 * 1000` (7 days).
  - Prompt suggestion truncate: reuse `STRING_TRUNCATE_LONG` (200) or add `PROMPT_SUGGESTION_PREVIEW_CHARS: 200`.
  - Beads/output slice: reuse `STRING_TRUNCATE_LONG` where `slice(0, 200)` is used.

- **`src/config/timeouts.ts`** (add only):
  - Clipboard paste debounce: e.g. `CLIPBOARD_PASTE_DEBOUNCE_MS: 100`.
  - Background cleanup: `CLEANUP_INTERVAL_MS: 60 * 60 * 1000`.
  - Prompt cache TTL: `PROMPT_CACHE_TTL_MS: 5 * 60 * 1000`.
  - LSP/beads which timeout: e.g. `WHICH_COMMAND_TIMEOUT_MS: 3000`.
  - Random fact rotate: e.g. `FACT_ROTATE_INTERVAL_MS: 10 * 60 * 1000`.

Use existing names in limits.ts/timeouts.ts if they already define these (e.g. DURATION_FORMAT_MS_THRESHOLD, DURATION_FORMAT_MIN_THRESHOLD).

## 2. Replace magic numbers (your files / cross-cutting)

- **listAgents limit 100**: **`src/ui/components/chat/SlashCommandHandler.ts`**, **`src/ui/components/App.tsx`** – use `LIMIT.CLOUD_AGENTS_LIST_LIMIT` (or the name you chose).
- **MAX_HISTORY_SIZE 200**: **`src/ui/hooks/useInputHistory.ts`** – use `LIMIT.INPUT_HISTORY_SIZE`.
- **Debounce 100 ms**: **`src/ui/hooks/useClipboardPaste.ts`** – use timeout from `config/timeouts.ts`.
- **CLEANUP_INTERVAL_MS**: **`src/store/persistence/background-cleanup.ts`** – use constant from config/timeouts.
- **DEFAULT_TTL_MS**: **`src/core/prompt-cache.ts`** – use from config/timeouts.
- **7 days**: **`src/store/persistence/integrity-check.ts`** – use `LIMIT.INTEGRITY_CHECK_STALE_MS` (or same from limits).
- **slice(0, 200)**: **`src/core/prompt-suggestions.ts`** – use `LIMIT.STRING_TRUNCATE_LONG` or the new prompt preview constant.
- **timeout 3000**: **`src/core/lsp-client.ts`**, **`src/core/beads-integration.ts`** – use `WHICH_COMMAND_TIMEOUT_MS` (or same) from config/timeouts.
- **ROTATE_INTERVAL_MS**: **`src/ui/hooks/useRandomFact.ts`** – use from config/timeouts.
- **formatToolCallDuration**: **`src/ui/components/tool-calls/formatToolCallDuration.ts`** – use `LIMIT.DURATION_FORMAT_MS_THRESHOLD` and `LIMIT.DURATION_FORMAT_MIN_THRESHOLD` from config/limits (verify they exist and use consistently).

## 3. Optional: Centralize error messages (lit-37)

- Add or extend **`src/constants/error-messages.ts`** (or error-codes) with user-facing strings used in `throw new Error("...")` and replace a few high-impact call sites. If time-boxed, skip and leave as follow-up.

## 4. Phase 1: Block new slop (lit-38)

- Ensure **`scripts/check-magic-literals.ts`** is run in CI (e.g. in `package.json` script `check:literals:strict` and in CI workflow).
- Add detection for: `getEnvironment() === "test"`, `process.platform === "win32"`, `.toLowerCase() === "true"`.
- Document in script comments (and .cursorrules if needed) that ACP/marked external types are allowed.

## 5. Phase 2–3 (lit-39, lit-40)

- Phase 2: Confirm all centralization from Agents 1–3 and your config additions; no duplicate constants.
- Phase 3: You’ve done the numeric replacements; Agents 1–3 do the string literal replacements.

## 6. Phase 4: Lock in (lit-41)

- Run **`bun run check:literals:strict`** and fix any remaining violations in your touched files.
- Add or update CI step (e.g. in `.github/workflows` or package.json) so `check:literals:strict` runs on every PR.
- Optionally add a small unit test for a constant module (e.g. limits or timeouts) that asserts key values.

## 7. Do not do (other agents)

- Do not replace string literals in Sidebar, CommandPalette, RewindModal, providers, repo-workflow, permissions, etc. (only numeric/config and script/CI).

## 8. Verification

When done, run:
```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run check:literals:strict
```
Mark todos lit-27, lit-30 through lit-41 complete.

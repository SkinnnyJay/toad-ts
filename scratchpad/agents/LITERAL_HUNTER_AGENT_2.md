# Literal Hunter – Agent 2: UI literal replacements

**You are Agent 2 of 4.** Your scope: replace literals in `src/ui/` only. Use constants that Agent 1 adds (e.g. KEY_NAME, BOOLEAN_STRINGS); if a constant module is missing, add it in `src/constants/` and use it. Do not edit `config/limits.ts` or `config/timeouts.ts` (Agent 4); for magic numbers in UI hooks, use constants that Agent 4 will add (e.g. LIMIT.INPUT_HISTORY) or add a single constant in the hook file and note in a comment that it should move to config later.

## Todo IDs you own
- lit-6, lit-7, lit-11, lit-18, lit-21, lit-22, lit-25, lit-28, lit-29

## 1. Command palette row types (lit-6)

- Add **`src/constants/command-palette.ts`** (or extend an existing constants file):
  - `COMMAND_PALETTE_ROW_TYPE = { SECTION_HEADER: "section-header", COMMAND: "command" } as const` and derived type.
- In **`src/ui/components/CommandPalette.tsx`**: replace every `"section-header"` and `"command"` (row type) with these constants.

## 2. RewindModal kinds (lit-7)

- In **`src/ui/components/RewindModal.tsx`**: use constants for `kind === "selection"` and `kind === "rewind"`. Align with `src/constants/rewind-actions.ts` or `checkpoint-direction.ts` (e.g. REWIND_OPTION_KIND.SELECTION / REWIND) or add a small const in that file and use it everywhere in the file.

## 3. StatusFooter /help (lit-11)

- In **`src/ui/components/StatusFooter.tsx`**: replace `key: "/help"` with `SLASH_COMMANDS.HELP` from `@/constants/slash-commands`.

## 4. Terminal names (lit-18)

- In **`src/core/image-renderer.ts`**: extract `"iTerm.app"` and `"WezTerm"` to constants (e.g. `src/constants/terminal.ts` with `TERMINAL_APP.ITERM`, `TERMINAL_APP.WEZTERM`) and use them in the `term ===` checks.

## 5. File extensions (lit-21, lit-22)

- **`src/ui/components/chat/slash-command-actions.ts`**: replace `extname(...) === ".svg"` with a constant from `@/constants/image-extensions` (or add SVG to that module and use it).
- **`src/ui/theme/theme-loader.ts`**: replace `ext !== ".json"` with a constant (e.g. from config-files or a small EXTENSION.JSON in constants).

## 6. “No harnesses configured.” (lit-25)

- In **`src/ui/hooks/useSessionHydration.ts`**: replace the string `"No harnesses configured."` with the same constant used in `src/harness/harnessConfig.ts` (export that message from harnessConfig or from `@/constants/` and use in both).

## 7. Magic numbers in UI hooks (lit-28, lit-29)

- **`src/ui/hooks/useInputHistory.ts`**: replace `MAX_HISTORY_SIZE = 200` with a constant. Prefer importing from `@/config/limits` (e.g. LIMIT.INPUT_HISTORY) if Agent 4 has added it; otherwise add a local constant and a TODO to move to config.
- **`src/ui/hooks/useClipboardPaste.ts`**: replace the `100` (ms debounce) with a constant. Prefer `config/timeouts` if present; otherwise local constant + TODO.

## 8. Do not do (other agents)

- Do not edit `src/core/*` except `image-renderer.ts`. Do not edit providers, repo-workflow, permissions, code-formatter, init-generator, hooks-loader, patch, cursor-cli-harness, hook-ipc-server (Agent 3).
- Do not add entries to `config/limits.ts` or `config/timeouts.ts` (Agent 4); only consume them if already there.

## 9. Verification

When done, run:
```bash
bun run lint && bun run typecheck && bun run build
```
Mark todos lit-6, lit-7, lit-11, lit-18, lit-21, lit-22, lit-25, lit-28, lit-29 complete.

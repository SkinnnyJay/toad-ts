# Platform fallback precedence

This document captures the canonical fallback order for platform-sensitive runtime paths.

## NutJS execution

NutJS execution now follows a strict gate order:

1. `feature_flag` (`TOADSTOOL_NUTJS_ENABLED`)
2. `allowlist` (`TOADSTOOL_NUTJS_ALLOWLIST`)
3. `capability` (supported platform + runtime availability)
4. `permission_diagnostics` (macOS Accessibility / Linux backend / Windows integrity)
5. `execution`

If any gate fails, execution resolves to a deterministic no-op outcome.
Permission diagnostics failures return `permission_missing` and block execution
before invoking NutJS actions.

## Clipboard fallback

Clipboard command fallback order:

- macOS: `pbcopy`
- Windows: `clip`
- Linux Wayland: `wl-copy`
- Linux X11: `xclip` → `xsel`
- Linux headless: no-op

## Completion sound fallback

Completion sound fallback order:

- macOS: `afplay` with `SYSTEM_SOUND.MACOS_FROG`
- Linux: no-op
- Windows: no-op

## Source of truth

The canonical constants live in:

- `src/constants/platform-fallback-precedence.ts`

Runtime consumers:

- `src/utils/nutjs-execution-gate.utils.ts`
- `src/utils/clipboard/clipboard.utils.ts`
- `src/utils/sound/completion-sound.utils.ts`

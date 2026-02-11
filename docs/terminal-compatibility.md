# Terminal Compatibility Guide

TOADSTOOL uses OpenTUI for rendering, which requires a modern terminal emulator with proper escape sequence support.

## Recommended Terminals

| Terminal | Platform | Shift+Enter | True Color | Mouse | Status |
|----------|----------|-------------|------------|-------|--------|
| **iTerm2** | macOS | ✅ | ✅ | ✅ | Recommended |
| **Kitty** | macOS/Linux | ✅ | ✅ | ✅ | Recommended |
| **WezTerm** | All | ✅ | ✅ | ✅ | Recommended |
| **Windows Terminal** | Windows | ✅ | ✅ | ✅ | Recommended |
| **Alacritty** | All | ⚠️ Config needed | ✅ | ✅ | Good |
| **GNOME Terminal** | Linux | ✅ | ✅ | ✅ | Good |
| **Terminal.app** | macOS | ⚠️ Limited | ❌ 256 color | ✅ | Basic |

## Shift+Enter Configuration

Some terminals require configuration to send the correct escape sequence for Shift+Enter (used for multi-line input).

### iTerm2
Already works by default.

### Alacritty
Add to `~/.config/alacritty/alacritty.toml`:
```toml
[keyboard]
bindings = [
  { key = "Return", mods = "Shift", chars = "\x1b[13;2u" }
]
```

### Kitty
Already works by default (kitty protocol).

### Windows Terminal
Add to settings.json keybindings:
```json
{ "command": { "action": "sendInput", "input": "\u001b[13;2u" }, "keys": "shift+enter" }
```

## True Color (24-bit)

TOADSTOOL themes use 24-bit color. Ensure your terminal supports it:

```bash
# Test true color support
printf "\x1b[38;2;255;100;0mTrue Color Test\x1b[0m\n"
```

If you see colored text, your terminal supports true color. If not:
- Set `COLORTERM=truecolor` in your shell profile
- Or use `TOADSTOOL_ASCII=true` for ASCII fallback mode

## Unicode Support

TOADSTOOL uses Unicode characters for status indicators and borders. If your terminal shows boxes or question marks:
- Ensure you have a font with Unicode support (e.g., Nerd Font, JetBrains Mono)
- Or set `TOADSTOOL_ASCII=true` to use ASCII-only characters

## Minimum Terminal Size

- **Minimum**: 60 columns × 15 rows
- **Recommended**: 120 columns × 40 rows
- Below 60 columns, the sidebar is hidden automatically
- Below 40 columns, TOADSTOOL shows a "terminal too small" message

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TOADSTOOL_ASCII` | Force ASCII characters (no Unicode) | `false` |
| `COLORTERM` | Set to `truecolor` for 24-bit color | auto-detected |
| `TERM` | Terminal type | auto-detected |

## Running `/terminal-setup`

The `/terminal-setup` command (or `toadstool --setup`) writes a shell script that configures:
- Shift+Enter key binding
- Alt key pass-through
- COLORTERM environment variable

```bash
toadstool --setup
source ~/.config/toadstool/terminal-setup.sh
```

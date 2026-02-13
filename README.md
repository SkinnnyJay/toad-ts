<img
  src="./public/banner.png"
  alt="TOADSTOOL banner"
  width="100%"
  style="max-width: 100%; height: auto; display: block;"
/>

# TOADSTOOL

**Terminal Orchestration for AI Development** — A unified terminal interface for AI coding agents.

TOADSTOOL combines the best of [TOAD](https://github.com/batrachianai/toad) (UX polish), [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (power user features), and [OpenCode](https://opencode.ai) (open ecosystem) into a single TypeScript TUI.

## Features

### Core
- 🤖 **Multi-provider support** — Anthropic, OpenAI, Ollama, Groq, Mistral, OpenRouter, and more
- 🔌 **ACP Protocol** — Connect to any ACP-compatible agent (Claude CLI, Gemini CLI, Codex CLI)
- 💬 **Streaming responses** — Real-time token-by-token rendering with markdown
- 📝 **40+ slash commands** — `/help`, `/review`, `/compact`, `/rewind`, `/status`, and more
- 🔧 **13 built-in tools** — bash, read, write, edit, grep, glob, list, todowrite, todoread, webfetch, question, skill, task-output

### Power User
- ⏪ **Checkpointing & undo/redo** — Per-prompt snapshots with `/rewind`, `/undo`, `/redo`
- 🪝 **Hooks system** — Pre/PostToolUse, SessionStart, PermissionRequest lifecycle hooks
- ⌨️ **Vim mode** — Full vim keybindings in input (h/j/k/l, w/e/b, d/c/y, text objects)
- 🔑 **Leader key keybinds** — Configurable `Ctrl+X` leader with 80+ actions
- 🔒 **Permission modes** — Auto-Accept, Plan, Normal with per-tool glob rules

### Ecosystem
- 🌍 **Cross-tool compatibility** — Zero-migration from Claude Code, Cursor, OpenCode, Gemini
- 📦 **Plugin system** — Loadable bundles with hooks + tools
- 🎨 **6 built-in themes** — Dark, Light, Dracula, Monokai, Solarized, Nord + custom themes
- 📋 **Custom agents** — Define agents with YAML frontmatter + Markdown body
- 🛠️ **Custom tools** — TypeScript tool files with Zod schema validation

### Professional
- 🖥️ **Server mode** — HTTP API + WebSocket for IDE integration
- 🤖 **Headless mode** — `toadstool -p "prompt"` for CI/CD pipelines
- 💰 **Budget limits** — `--max-budget-usd`, `--max-turns` for cost control
- 📊 **Context management** — Token counting, auto-compaction, tool output pruning
- 🔀 **Session management** — Forking, sharing, export (Markdown/JSON/SVG)

## Installation

```bash
# npm
npm i -g toadstool-ts

# bun
bun i -g toadstool-ts

# From source
git clone https://github.com/your-org/toadstool-ts.git
cd toadstool-ts
bun install
bun run build
```

**Note:** `toadstool` runs with **Bun** (OpenTUI depends on Bun). If installed via npm, the command will delegate to `bun` at runtime.

## Quick Start

```bash
# Launch TUI
toadstool

# Headless mode
toadstool -p "Explain this codebase"

# Non-interactive
toadstool run "Fix the bug in auth.ts"

# Start server
toadstool serve --port 3000

# List models
toadstool models
```

## Terminal setup (recommended)

If you see weird rendering (colors, progress bar, symbols), register the terminal setup script:

```bash
npm run setup:shell
```

This writes `~/.toadstool/terminal-setup.sh` and adds a small block to your shell rc (e.g. `~/.zshrc`)
to source it.

## Configuration

TOADSTOOL loads configuration from multiple sources (in precedence order):

1. Environment: `TOADSTOOL_CONFIG_CONTENT` or `TOADSTOOL_CONFIG_PATH`
2. Project: `toadstool.json` / `toadstool.jsonc` in project root
3. Global: `~/.config/toadstool/config.json`

```json
{
  "defaults": {
    "agent": "build",
    "model": "claude-sonnet-4-20250514"
  },
  "keybinds": {
    "leader": "ctrl+x"
  },
  "compaction": {
    "auto": true,
    "threshold": 0.8
  },
  "permissions": {
    "mode": "normal",
    "rules": {
      "read": "allow",
      "write": "ask",
      "bash*": "ask"
    }
  },
  "compatibility": {
    "claude": true,
    "cursor": false,
    "opencode": true,
    "gemini": true
  }
}
```

### Cursor CLI (beta)

Cursor support is available behind a feature flag and disabled by default.

```bash
# Enable Cursor harness registration
export TOADSTOOL_CURSOR_CLI_ENABLED=true

# Optional: override binary path/name (default: cursor-agent)
export TOADSTOOL_CURSOR_COMMAND=cursor-agent

# Optional: authenticate with API key instead of browser login
export CURSOR_API_KEY=...
```

TOADSTOOL can also negotiate authentication via `cursor-agent login` and supports streamed
tool/thinking updates plus hook IPC integration.

### Harness file overrides (`.toadstool/harnesses.json`)

Project-level and user-level harness files can override command/runtime details per harness:

```json
{
  "defaultHarness": "cursor-cli",
  "harnesses": {
    "cursor-cli": {
      "name": "Cursor CLI",
      "command": "cursor-agent",
      "args": ["--output-format", "stream-json"],
      "cursor": {
        "model": "gpt-5",
        "mode": "agent",
        "force": false,
        "sandbox": true,
        "browser": false,
        "approveMcps": true
      }
    }
  }
}
```

## Cross-Tool Compatibility

TOADSTOOL automatically loads configurations from:

| Tool | Project Folder | Rules File |
|------|---------------|------------|
| TOADSTOOL | `.toadstool/` | `TOADSTOOL.md` |
| Claude Code | `.claude/` | `CLAUDE.md` |
| Cursor | `.cursor/` | `.cursorrules` |
| OpenCode | `.opencode/` | `AGENTS.md` |
| Gemini | `.gemini/` | `GEMINI.md` |

Skills, commands, agents, hooks, and rules from all tools are merged automatically.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Tab` | Switch agent |
| `Shift+Tab` | Cycle permission mode |
| `Ctrl+X` then `H` | Help |
| `Ctrl+X` then `N` | New session |
| `Ctrl+X` then `L` | List sessions |
| `Ctrl+X` then `T` | Themes |
| `Ctrl+X` then `U` | Undo |
| `Ctrl+X` then `R` | Redo |
| `Ctrl+B` | Background tasks |
| `Ctrl+P` | Command palette |
| `Escape` | Cancel / close |

## Slash Commands

```
/add-dir   /agent     /agents    /clear     /commands
/compact   /config    /connect   /context   /copy
/cost      /debug     /details   /doctor    /editor
/export    /help      /hooks     /import    /init
/login     /logout    /mcp       /memory    /mode
/model     /models    /new       /permissions /plan
/progress
/redo      /rename    /review    /rewind    /security-review
/sessions  /settings  /share     /skills    /stats
/status    /themes    /thinking  /undo      /unshare
/vim
```

Cloud workflows are available through `/agent` when Cursor compatibility is enabled:

- `/agent status`
- `/agent about`
- `/agent login`
- `/agent logout`
- `/agent models`
- `/agent cloud list [limit] [cursor]`
- `/agent cloud launch <prompt>`
- `/agent cloud followup <agentId> <prompt>`
- `/agent cloud conversation <agentId>`
- `/agent cloud stop <agentId>`
- `/agent mcp [list|list-tools <id>|enable <id>|disable <id>|login <id>]`

Direct MCP management shortcut:

- `/mcp [list|list-tools <id>|enable <id>|disable <id>|login <id>]`

## Development

```bash
bun run dev          # Development mode
bun run build        # Build
bun run test         # Run tests
bun run typecheck    # Type checking
bun run lint         # Lint
bun run benchmark:core # Core context/title perf benchmark script
bun run benchmark:startup # Core module startup smoke benchmark
bun run benchmark:ui # Complex-session UI render/input p95 checks
```

## Architecture

```
src/
├── agents/      # Agent manager, routing, built-in agents
├── cli.ts       # CLI entry (Commander + OpenTUI)
├── config/      # Runtime configuration with Zod schemas
├── constants/   # 73+ typed constant files
├── core/        # ACP client, providers, context, session management
├── harness/     # Multi-provider harness registry
├── hooks/       # Lifecycle hooks system
├── rules/       # Rules loader + permissions
├── server/      # HTTP/WebSocket server + API routes
├── store/       # Zustand state + SQLite/JSON persistence
├── tools/       # Tool registry + 13 built-in tools
├── types/       # TypeScript type definitions with Zod
├── ui/          # OpenTUI React components + hooks
└── utils/       # Env, logging, credentials, diff, SVG export
```

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

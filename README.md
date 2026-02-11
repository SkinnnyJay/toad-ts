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
    "cursor": true,
    "opencode": true,
    "gemini": true
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
/add-dir   /agents    /clear     /compact   /config
/connect   /context   /copy      /cost      /debug
/details   /doctor    /editor    /export    /help
/hooks     /import    /init      /login     /logout
/mcp       /memory    /mode      /model     /models
/new       /permissions /plan    /agent
/progress  /rename    /review    /rewind    /security-review
/sessions  /settings  /share     /stats     /status
/themes    /thinking  /undo      /unshare   /redo
/vim
```

## Cursor CLI (Beta)

TOADSTOOL includes a Cursor harness (`cursor-cli`) behind a feature flag.

### Prerequisites

- Install Cursor CLI (`cursor-agent` / `agent`) and verify it is on your `PATH`
- Authenticate with `cursor-agent login` **or** set `CURSOR_API_KEY`

### Enable Cursor Harness

Set the feature flag before launching TOADSTOOL:

```bash
export TOADSTOOL_CURSOR_CLI_ENABLED=true
```

Optional overrides:

```bash
export TOADSTOOL_CURSOR_COMMAND=cursor-agent
export TOADSTOOL_CURSOR_ARGS="--output-format stream-json --stream-partial-output"
export CURSOR_API_KEY=...
```

### Cursor-Specific Runtime Behaviors

- Streams partial NDJSON output into the chat view
- Installs hook shims for permission/context/thought/file-edit lifecycle events
- Renders hook-based file edits in the inline diff tool UI
- Supports management commands through slash commands:
  - `/status`, `/login`, `/logout`, `/models`, `/model`, `/mcp`, `/agent`
  - `/sessions <id>` to switch/resume a known Cursor session id
  - `Ctrl+S` session picker now includes native Cursor session ids from `cursor-agent ls`
  - `/sessions` native list output includes session metadata (title/created timestamp/model/message count) when available
  - Native session listings are deduplicated by session id and prefer richer/newer metadata when duplicates exist
- Supports cloud-dispatch prompts with `&` prefix (for Cursor CLI sessions):
  - Example: `&investigate failing CI checks`

## Development

```bash
bun run dev          # Development mode
bun run build        # Build
bun run test         # Run tests
bun run typecheck    # Type checking
bun run lint         # Lint
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

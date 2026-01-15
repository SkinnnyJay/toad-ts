---
title: TOAD - Terminal Orchestration for AI Development
date: 2025-01-27
author: Jonathan Boice
status: approved
lastUpdated: 2025-01-27
description: A unified terminal interface for AI coding agents
---

# 🐸 TOAD

**Terminal Orchestration for AI Development**

A unified terminal interface for AI coding agents, built with TypeScript, Ink, and React.

[![npm version](https://img.shields.io/npm/v/toad-cli.svg)](https://www.npmjs.com/package/toad-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Features

- **🔄 ACP-Compatible Agents** — Switch between Claude CLI, Gemini CLI, Codex CLI
- **⚡ Streaming Responses** — Real-time token-by-token display
- **💾 Persistent Sessions** — Resume conversations across restarts
- **🎨 Rich Markdown** — Syntax highlighting and formatted output
- **⌨️ Keyboard-First** — Efficient navigation for power users
- **🔧 Zero Config** — Use your existing CLI auth and go

---

## 📦 Installation

```bash
# Install globally
npm install -g toad-cli

# Or use npx
npx toad-cli
```

### Requirements

- Node.js 20+
- At least one ACP-compatible agent installed (for example, Claude CLI)

---

## 🚀 Quick Start

### 1. Set your API keys

```bash
# Example for Claude CLI (set in your shell profile)
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Or create a .env file in your project
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### 2. Launch TOAD

```bash
# Start with provider selection
toad

# Start directly with Claude
toad -p claude

# Start directly with another ACP agent
toad -p gemini

# Start in a specific directory
toad ~/projects/myapp
```

### 3. Start chatting!

```
┌─────────────────────────────────────────────────────────┐
│  🐸 TOAD                     Ctrl+P: Switch  Ctrl+C: Quit│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  You (10:30 AM)                                          │
│  Create a TypeScript function to reverse a string        │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  Claude (10:30 AM)                                       │
│  Here's a TypeScript function:                           │
│                                                          │
│  ```typescript                                           │
│  function reverseString(s: string): string {             │
│    return s.split('').reverse().join('');                │
│  }                                                       │
│  ```                                                     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  > Type your message...                                  │
└─────────────────────────────────────────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `↑` / `↓` | Navigate input history |
| `Ctrl+P` | Switch provider |
| `Ctrl+N` | New session |
| `Ctrl+L` | Clear screen |
| `Escape` | Cancel current request |
| `Ctrl+C` | Exit |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | For Claude CLI (if used) |
| `TOAD_DEFAULT_AGENT` | Default ACP agent id (for example, `claude`) | No |

### Config File

Create `~/.config/toad/config.json` for advanced configuration:

```json
{
  "agents": {
    "claude": {
      "command": "claude --experimental-acp",
      "model": "claude-sonnet-4-20250514",
      "maxTokens": 4096
    }
  },
  "defaults": {
    "agent": "claude"
  },
  "ui": {
    "timestamps": true,
    "syntaxHighlighting": true
  }
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         TOAD TUI                             │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Ink + React)                                      │
│  ┌───────────┬────────────┬───────────┬──────────┐          │
│  │  Provider │  Message   │   Input   │  Status  │          │
│  │  Selector │  List      │   Area    │  Bar     │          │
│  └───────────┴────────────┴───────────┴──────────┘          │
├─────────────────────────────────────────────────────────────┤
│  State Layer (Zustand)                                       │
│  Sessions • Messages • Connection • UI State                 │
├─────────────────────────────────────────────────────────────┤
│  ACP Adapter + Agents                                       │
│  ┌──────────────────────────────────────────┐              │
│  │ ACP JSON-RPC over stdio                  │              │
│  │ Claude CLI / Gemini CLI / Codex CLI      │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Upstream Patterns

- TOAD (Python/Textual) spawns ACP-compatible CLIs and speaks JSON-RPC over stdio (for example,
  `claude-code-acp`, `codex-acp`, `gemini --experimental-acp`).
- OpenCode routes models through its provider layer and also exposes `opencode acp` so editors can
  connect via ACP; Codex is handled via its provider/plugin pipeline.

---

## 🔎 Search & Indexing

- Text search uses `@vscode/ripgrep` with `rg --json` for fast, parseable results.
- File discovery uses `fdir` for crawling, with `fast-glob` or `tinyglobby` for glob semantics.
- Structured search uses `@ast-grep/napi`; fuzzy matching uses `fuzzysort`.
- Two-stage approach: build an in-memory index once, then scope `rg` to narrowed folders/globs.

---

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/toad-ts.git
cd toad-ts

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys
```

### Commands

```bash
# Development mode (watch)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E scenarios
npm run test:scenarios

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format
```

### Project Structure

```
toad-ts/
├── src/
│   ├── cli.ts                 # Entry point
│   ├── index.ts               # Library exports
│   │
│   ├── core/                  # ACP + orchestration core
│   │   ├── acp-connection.ts  # ACP JSON-RPC stdio client
│   │   ├── message-handler.ts # Stream + tool handling
│   │   └── orchestrator.ts    # Agent orchestration
│   │
│   ├── store/                 # State management
│   │   └── app-store.ts       # Zustand store
│   │
│   ├── ui/                    # Ink components
│   │   ├── App.tsx
│   │   ├── Chat.tsx
│   │   ├── MessageList.tsx
│   │   ├── Input.tsx
│   │   └── StatusBar.tsx
│   │
│   ├── types/                 # TypeScript types
│   │   └── domain.ts          # Zod schemas + types
│   │
│   └── testing/               # Test utilities
│       └── validators/
│           ├── heuristics.ts  # Fast structural checks
│           └── llm-validator.ts # AI-powered validation
│
├── test/
│   ├── unit/                  # Unit tests
│   └── scenarios/             # E2E scenario tests
│
├── docs/                      # Documentation
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🧪 Testing Strategy

TOAD uses a three-layer validation approach:

| Layer | Purpose | Speed |
|-------|---------|-------|
| **Unit Tests** | Function/component logic | ⚡ Fast |
| **Heuristic Checks** | Structural validation | ⚡ Fast |
| **LLM Validation** | Semantic quality | 🐢 Slower |

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run specific test file
npm test -- src/store/app-store.test.ts
```

---

## 📊 Tech Stack

| Category | Technology | Why |
|----------|------------|-----|
| **Language** | TypeScript 5.5 | Type safety, modern features |
| **TUI Framework** | Ink 5.x | React paradigm in terminal |
| **UI Components** | @inkjs/ui | Battle-tested inputs/selects |
| **State** | Zustand | Minimal, TypeScript-first |
| **Validation** | Zod | Runtime type safety |
| **ACP SDK** | @agentclientprotocol/sdk | ACP JSON-RPC client |
| **Agent CLIs** | Claude CLI, Gemini CLI | ACP-compatible agents |
| **Testing** | Vitest | Fast, TypeScript-native |
| **Build** | tsup | ESM-native bundler |

---

## 🗺️ Roadmap

**Current Status**: Phase 3 Complete (~50% of planned features)

### ✅ MVP (Current - Phases 1-3)
- [x] ACP-first providers (CLI agents)
- [x] Streaming responses
- [x] Session persistence
- [x] Markdown rendering
- [x] Type-safe state management
- [x] Multi-agent orchestration types
- [x] React-based terminal UI

### 🔜 Phase 2 (Tooling & Permissions)
- [ ] Tool call system with approval flow (allow/ask/deny)
- [ ] File system operations + shell command execution
- [ ] Session modes (read-only/auto/full-access)
- [ ] Content blocks for code + resources

### 🔜 Phase 3 (ACP Compatibility)
- [ ] ACP JSON-RPC over stdio + protocol/capability negotiation
- [ ] Slash command discovery + routing
- [ ] MCP server integration
- [ ] Agent plan announcements + approval

### 🔜 Phase 4 (Search & Indexing)
- [ ] Ripgrep JSON search via `@vscode/ripgrep`
- [ ] File index with `fdir` + glob/fuzzy queries
- [ ] Optional AST search via `@ast-grep/napi`

### 🔮 Future (Differentiators)
- [ ] Subagent system + delegation
- [ ] AGENTS.md auto-loading
- [ ] Rich content types (images, audio)
- [ ] Plugin system
- [ ] Web interface mode

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing`)
6. Open a Pull Request

---

## 📄 License

MIT © [Your Name]

---

## 📚 Additional Documentation

- **[FEATURES.md](docs/FEATURES.md)** - Detailed feature documentation
- **[COMPARISON.md](docs/COMPARISON.md)** - Competitive analysis vs toad, open-code, claude-cli, zed
- **[Multi-Agent Orchestration](docs/multi-agent-orchestration.md)** - Subagent architecture design

---

## 🙏 Acknowledgments

- [Original Toad](https://github.com/batrachianai/toad) — Inspiration and concept
- [Ink](https://github.com/vadimdemedes/ink) — React for CLIs
- [Anthropic](https://anthropic.com) — Claude AI
- [OpenAI](https://openai.com) — GPT models

---

<p align="center">
  <sub>Built with 🐸 by developers who live in the terminal</sub>
</p>

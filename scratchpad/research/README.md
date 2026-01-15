---
title: Toad TypeScript Research
date: 2025-01-27
author: Jonathan Boice
status: active
lastUpdated: 2026-01-14
description: Research documentation for Toad TypeScript architecture and design
---

# Toad TypeScript

Revision: v1.1.0
Document Role: Research overview; supplements spec.md with ecosystem notes.

> A unified terminal interface for AI coding agents, built with Ink, React, and TypeScript.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Toad TUI                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    UI Layer (Ink + React)                     │  │
│  │  ┌─────────────┬─────────────┬──────────────┬──────────────┐ │  │
│  │  │   Chat      │  Message    │   Input      │  Status      │ │  │
│  │  │   Panel     │  List       │   Area       │  Bar         │ │  │
│  │  └─────────────┴─────────────┴──────────────┴──────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    State Layer (Zustand)                      │  │
│  │       Sessions • Messages • Connection • UI State             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Core Layer                                 │  │
│  │  ┌──────────────┬───────────────┬───────────────────────────┐│  │
│  │  │ ACP Client   │ Message       │ Tool Handlers             ││  │
│  │  │ (Protocol)   │ Handler       │ (FS, Terminal, etc.)      ││  │
│  │  └──────────────┴───────────────┴───────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    Transport (stdio JSON-RPC)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Claude CLI │  │ Gemini CLI │  │ Codex CLI  │  │ Other ACP  │   │
│  │   Agent    │  │   Agent    │  │   Agent    │  │   Agents   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run
npm start

# Run tests
npm test

# Run scenario tests (includes LLM validation)
npm run test:scenarios
```

## Key Features

- **Multi-Agent Support**: Connect to any ACP-compatible agent (Claude CLI, Gemini, Codex)
- **Streaming Responses**: Real-time rendering of AI responses
- **Rich Markdown**: Full markdown rendering with syntax highlighting
- **Tool Visualization**: See file operations and commands as they execute
- **Keyboard-First**: Efficient navigation and shortcuts
- **Persistent Config**: Remember preferences and recent sessions

## Package Philosophy

### Why These Packages?

| Category | Package | Rationale |
|----------|---------|-----------|
| **TUI** | `ink` | React paradigm in terminal, flexbox layout |
| **Components** | `@inkjs/ui` | Battle-tested inputs, selects, spinners |
| **State** | `zustand` | Minimal, TypeScript-first, no boilerplate |
| **Validation** | `zod` | Runtime type safety with TS inference |
| **Highlighting** | `shiki` | VS Code-quality, many themes |
| **Process** | `execa` | Better than child_process, cleaner API |
| **Config** | `conf` | Simple persistent config |

### Inspired By

- **[OpenCode](https://github.com/anomalyco/opencode)** - Multi-panel layout patterns
- **[Zed](https://github.com/zed-industries/zed)** - ACP integration, assistant patterns
- **[Claude CLI](https://docs.anthropic.com/claude-code)** - Tool calling, streaming
- **[Original Toad](https://github.com/batrachianai/toad)** - Core concept and UX

## Testing Strategy

### Three-Layer Validation

```
┌────────────────────────────────────────┐
│        LLM Validation (Semantic)       │  ← Catches quality/intent issues
├────────────────────────────────────────┤
│       Heuristic Checks (Structural)    │  ← Fast, deterministic
├────────────────────────────────────────┤
│         Unit Tests (Logic)             │  ← Component/function level
└────────────────────────────────────────┘
```

### LLM Validation Example

```typescript
const result = await validator.validateCode({
  originalPrompt: 'Create a Shakespeare landing page',
  generatedOutput: htmlContent,
  criteria: [
    'Uses Tailwind CSS via CDN',
    'Lists major works with descriptions',
    'Has period-appropriate design',
    'Is responsive',
  ],
});

expect(result.score).toBeGreaterThan(0.8);
```

### Scenario Tests

Located in `test/scenarios/`, these run full agent sessions:

- **Simple HTML Generation** - Single file creation
- **React Component** - Multi-file with types
- **Bug Fix** - Read, analyze, fix, test
- **API Handler** - Error handling patterns

## File Structure

```
toad-ts/
├── src/
│   ├── cli.ts                      # Entry point
│   ├── index.ts                    # Library exports
│   │
│   ├── types/
│   │   ├── domain.ts               # Core domain types (Zod)
│   │   ├── acp.ts                  # ACP protocol types
│   │   └── store.ts                # Store interface
│   │
│   ├── core/
│   │   ├── acp-connection.ts       # Agent communication
│   │   ├── message-handler.ts      # Stream processing
│   │   ├── fs-handler.ts           # File operations
│   │   └── terminal-handler.ts     # Shell execution
│   │
│   ├── store/
│   │   └── app-store.ts            # Zustand store
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── App.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── Input.tsx
│   │   │   └── StatusLine.tsx
│   │   └── hooks/
│   │       ├── useChat.ts
│   │       └── useKeyboard.ts
│   │
│   ├── config/
│   │   ├── loader.ts
│   │   └── schema.ts
│   │
│   └── testing/
│       └── validators/
│           ├── llm-validator.ts    # LLM-based validation
│           └── heuristics.ts       # Fast structural checks
│
├── test/
│   └── scenarios/
│       └── code-generation.test.ts # E2E scenario tests
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Configuration

### Agent Configuration (`~/.config/toad/config.json`)

```json
{
  "agents": [
    {
      "id": "claude-cli",
      "name": "Claude CLI",
      "command": "claude",
      "args": ["--experimental-acp"],
      "description": "Anthropic Claude coding agent"
    },
    {
      "id": "gemini",
      "name": "Gemini CLI",
      "command": "gemini",
      "args": ["--experimental-acp"]
    }
  ],
  "defaults": {
    "agent": "claude-cli",
    "theme": "dark"
  },
  "shortcuts": {
    "ctrl+p": "command-palette",
    "ctrl+n": "new-session"
  }
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Exit |
| `Ctrl+P` | Command palette |
| `Ctrl+N` | New session |
| `Ctrl+R` | Resize panes |
| `↑/↓` | Navigate history |
| `Ctrl+L` | Clear screen |
| `Escape` | Cancel current action |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Run scenario tests: `npm run test:scenarios`
5. Submit a pull request

## License

MIT

---

## Changelog
- v1.1.0 (2026-01-14): Added revision tag and document role; refreshed metadata.

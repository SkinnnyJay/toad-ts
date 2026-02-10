# TOADSTOOL Master Plan

> **Terminal Orchestration for AI Development** - The best of OpenCode + TOAD + Claude Code, unified in TypeScript.

**Created**: 2026-02-09
**Status**: Phase 4 in progress (smoke test + 4E verification pending)
**Inspirations**:
- [OpenCode](https://opencode.ai) (95k+ stars) - Full-featured open-source TUI coding agent
- [TOAD](https://github.com/batrachianai/toad) (2.1k stars) - Universal AI terminal interface by Will McGugan (Rich/Textual creator)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) - Anthropic's reference terminal agent

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Inspiration Analysis: Best of Three Worlds](#inspiration-analysis-best-of-three-worlds)
3. [Current State Assessment](#current-state-assessment)
4. [Feature Gap Analysis](#feature-gap-analysis)
5. [Code Quality Audit](#code-quality-audit)
6. [UI/UX Specification](#uiux-specification)
7. [Advanced Features Specification](#advanced-features-specification)
8. [OpenTUI Framework Migration (Approved)](#opentui-framework-migration-approved)
9. [Architecture Recommendations](#architecture-recommendations)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Phase Details](#phase-details)
12. [Success Criteria](#success-criteria)
13. [Risk Assessment](#risk-assessment)
14. [Dependencies & Prerequisites](#dependencies--prerequisites)

---

## Executive Summary

TOADSTOOL is a TypeScript TUI for AI coding agents that combines the best of three pioneering tools: **TOAD** (UX polish, true shell, smooth rendering), **Claude Code** (hooks, checkpointing, power user features), and **OpenCode** (open ecosystem, 75+ providers, extensibility). The codebase has solid foundations (branded types, Zod schemas, harness registry, ACP protocol, persistence) but is missing **~50% of the combined feature surface entirely** and has **~35% only partially implemented**. The code quality has ~200+ type safety issues (`as` casts, `!` assertions), ~80+ magic numbers/strings, and several oversized components exceeding 500 lines.

### Key Stats

| Metric | Value |
|--------|-------|
| Source files | ~164 (src/) |
| Test files | 85 (unit: 68, integration: 14, e2e: 3) |
| Constants files | 40+ (src/constants/) |
| UI Components | 30 React components, 15 hooks |
| Dependencies | 43 production, 18 dev |
| Feature categories audited | 14 (vs OpenCode) |
| Features fully implemented | 2/14 (14%) |
| Features partially implemented | 5/14 (36%) |
| Features missing entirely | 7/14 (50%) |

### Feature Gap Summary (14 Categories)

| Category | Gap | Status |
|----------|-----|--------|
| Agent System | 70% | Partial - types exist, no execution |
| Tool System | 80% | Partial - infrastructure, not wired |
| Slash Commands | 62% | Partial - 6 of 16 |
| Configuration | 60% | Partial - basic, no merging/schema |
| Provider System | 50% | Partial - good foundation |
| Keybind System | 80% | Partial - hardcoded |
| Rules & Instructions | 80% | Partial - files exist, no loader |
| Skills System | 70% | Partial - content exists, no infra |
| Custom Tools | 100% | Missing |
| Server / API Mode | 100% | Missing |
| Session Management | 60% | Partial - basic CRUD only |
| Input System | 60% | Partial - basic, no readline |
| MCP Integration | 80% | Minimal |
| Distribution & CI/CD | 90% | Missing |

---

## Inspiration Analysis: Best of Three Worlds

TOADSTOOL takes its name from TOAD ("Textual Code") and aims to be the best hybrid of three pioneering terminal AI tools. Each brings something the others lack. This section catalogs every notable feature from each, what the community loves most, and exactly what TOADSTOOL should adopt.

### TOAD (Batrachian AI) - The UX Pioneer

Created by Will McGugan (creator of Rich and Textual - the two most popular Python terminal libraries). TOAD's philosophy: **the terminal should feel like a GUI**.

#### What TOAD Does Best (Community Favorites)

| Feature | Why It Matters | Community Sentiment |
|---------|---------------|---------------------|
| **True persistent shell** | `cd`, env vars, interactive apps persist between commands. No other TUI does this. | "Finally, a tool that doesn't break my workflow" |
| **Prompt editor with live Markdown** | Syntax highlighting inside code fences *before* you close them. Mouse selection, cut/copy/paste. | "The prompt editing alone is worth switching" |
| **Zero flicker rendering** | Partial screen updates (Textual engine). Buttery smooth even with large outputs. | "So much smoother than Claude Code" |
| **Notebook-style block navigation** | Cursor through conversation blocks like Jupyter cells. Copy, export, interact per-block. | "I didn't know I needed this until I tried it" |
| **AI App Store** | Discover, install, and launch agents from the UI. No config files needed. | "Makes trying new agents trivial" |
| **File picker with tree + fuzzy** | `@` triggers fuzzy search, `Tab` switches to interactive tree view. Best of both worlds. | "The tree fallback is genius" |
| **Full mouse support** | Click, drag, select, scroll everywhere. Not an afterthought. | Rarely mentioned because it just works |
| **Beautiful side-by-side diffs** | Syntax-highlighted, side-by-side or unified. | "Best diffs in any terminal AI tool" |
| **Shell tab completion** | Tab to complete commands/paths, tab again to cycle, enter to accept. | "Feels like a real terminal" |
| **Auto-detect shell commands** | Configurable list of commands (ls, cd, git, etc.) auto-triggers shell mode. No `!` needed. | "Smart enough to know when I'm talking to the shell" |
| **SVG export** | Export conversation to SVG for documentation/sharing. | Niche but loved by technical writers |
| **Simple settings UI** | Intuitive settings, no manual JSON editing needed. | "I can actually configure things without reading docs" |

#### What TOADSTOOL Should Take From TOAD

1. **True shell integration** - Not just `!` prefix. Persistent state (cd, env vars), interactive apps (htop, vim), full color, mouse support.
2. **Prompt editor quality** - Live Markdown highlighting in input, mouse selection, the "feels like a real editor" experience.
3. **Block navigation** - Cursor through conversation blocks, interact per-block (copy, export, re-send).
4. **File picker dual-mode** - Fuzzy search with tree view fallback via Tab.
5. **Auto-detect shell commands** - Configurable list that auto-triggers shell mode.
6. **Flicker-free rendering** - Partial screen updates, not full redraws.
7. **Simple settings** - TUI-based settings editor, not just JSON files.
8. **SVG export** - Export conversations as beautiful SVGs.

### Claude Code CLI (Anthropic) - The Power User's Tool

Anthropic's reference implementation. Claude Code's philosophy: **maximum control for power users and automation**.

#### What Claude Code Does Best (Community Favorites)

| Feature | Why It Matters | Community Sentiment |
|---------|---------------|---------------------|
| **Hooks system (14 event types)** | SessionStart, PreToolUse, PostToolUse, PermissionRequest, Stop, SubagentStart/Stop, etc. Shell commands, LLM prompts, or agent hooks triggered at lifecycle points. | "Hooks are the killer feature. I auto-lint, auto-test, auto-format without thinking" |
| **Checkpointing (non-git)** | Automatic per-prompt snapshots. Rewind code, conversation, or both independently. `/rewind` with 4 options. Not tied to git. | "Checkpoints saved me from a catastrophic rewrite" |
| **Vim editor mode** | Full vim keybindings in input: h/j/k/l, w/e/b, d/c/y, text objects (iw, i", i{), `.` repeat. | "Finally I can edit prompts properly" |
| **Background tasks** | `Ctrl+B` to background any running command. TaskOutput tool to retrieve results. Build, test, serve while chatting. | "Background tasks are incredibly useful for long builds" |
| **Reverse search (Ctrl+R)** | Interactive history search with highlighted matches. Like bash's Ctrl+R but better. | "Muscle memory from the terminal just works" |
| **AI prompt suggestions** | After each response, grayed-out suggested next prompt. Based on conversation + git history. Tab to accept. | "Suggestions save me from thinking about what to ask next" |
| **PR review status** | Footer shows clickable PR link with colored underline (green=approved, yellow=pending, red=changes requested). | "Love seeing PR status without leaving the terminal" |
| **Agent teams** | Opus 4.6: spawn teams of agents (backend dev, frontend dev, reviewer) working in parallel. | "Agent teams is a paradigm shift" |
| **Permission modes** | Auto-Accept, Plan, Normal, Delegate. Shift+Tab to cycle. Fine-grained tool permissions with glob patterns. | "Plan mode + auto-accept for safe tools is perfect" |
| **Kill ring** | Ctrl+K/U to kill text, Ctrl+Y to paste, Alt+Y to cycle through paste history. Emacs muscle memory. | "Small but delightful for emacs users" |
| **Structured SDK output** | `--json-schema` for validated JSON responses. `--output-format stream-json`. Pipe-friendly. | "Essential for CI/CD integration" |
| **Budget & turn limits** | `--max-budget-usd 5.00`, `--max-turns 3`. Prevent runaway costs. | "Peace of mind in automated pipelines" |
| **Diagnostic commands** | `/doctor` (health check), `/debug` (troubleshoot), `/context` (colored grid), `/stats` (usage), `/cost` (tokens). | "Self-diagnosing tools are rare and amazing" |
| **Session forking from resume** | `--fork-session` branches from any resumed point. `--from-pr` resumes sessions linked to PRs. | "Branching conversations is powerful" |
| **Web sessions** | `--remote` starts on claude.ai, `--teleport` resumes locally. | Interesting for team use |
| **Plugin system** | `--plugin-dir` loads plugin bundles with hooks, tools, and UI. | "Plugins make it extensible without forking" |
| **Image paste** | `Ctrl+V` pastes images from clipboard into conversation for vision models. | "Essential for UI debugging" |

#### What TOADSTOOL Should Take From Claude Code

1. **Hooks system** - The most powerful extensibility mechanism. Pre/Post tool use, permission hooks, session lifecycle hooks. This is how you make the tool infinitely customizable.
2. **Checkpointing** - Independent of git. Automatic per-prompt. Rewind code/conversation/both. This is safer and more granular than OpenCode's git-based undo.
3. **Vim editor mode** - Full vim keybindings as an option in the input editor.
4. **Background tasks** - Ctrl+B to background running commands. Retrieve output later. Essential for long builds/tests.
5. **Prompt suggestions** - AI-generated next-step suggestions after each response. Low-cost (reuses cache).
6. **PR review status** - Colored PR link in footer. Requires `gh` CLI.
7. **Permission modes** - Auto-Accept, Plan, Normal. Shift+Tab to cycle.
8. **Budget & turn limits** - `--max-budget-usd` and `--max-turns` for headless/CI use.
9. **Kill ring** - Ctrl+K/U/Y/Alt+Y. Emacs-style text manipulation.
10. **Reverse search** - Ctrl+R for interactive history search.
11. **Diagnostic commands** - `/doctor`, `/debug`, `/context`, `/stats`, `/cost`.
12. **Plugin system** - Loadable plugin bundles (hooks + tools + UI).
13. **Image paste** - Clipboard paste for vision model conversations.
14. **Structured output mode** - `--json-schema` for SDK/CI use.

### OpenCode - The Open Ecosystem

SST team's open-source coding agent. OpenCode's philosophy: **open, configurable, provider-agnostic**.

#### What OpenCode Does Best (Community Favorites)

| Feature | Why It Matters | Community Sentiment |
|---------|---------------|---------------------|
| **75+ LLM providers** | Every major provider + local models (Ollama, LM Studio). No vendor lock-in. | "I can use any model I want" |
| **Leader key keybinds** | Vim-inspired: `Ctrl+X` then letter. Avoids terminal conflicts. 80+ configurable actions. | "Leader key is elegant, no more key conflicts" |
| **Theme system** | Full color customization, multiple built-in themes, custom theme files. `/themes` to browse. | "Themes make it actually pleasant to look at" |
| **LSP integration** | Auto-loads language servers. Go-to-definition, references, symbols. Agent sees LSP context. | "LSP makes it understand my code way better" |
| **Session sharing** | `/share` creates a URL. View shared sessions in browser. `/unshare` to revoke. | "Great for team debugging and code reviews" |
| **Custom agents (Markdown)** | Define agents with YAML frontmatter + Markdown body. Per-agent tools, permissions, model. | "I have 12 custom agents for different tasks" |
| **Custom tools (.ts files)** | TypeScript tool files with Zod schema args. Context injection. | "Custom tools are incredibly powerful" |
| **Server mode (OpenAPI)** | `opencode serve` - Full HTTP API. TUI is just another client. IDE plugins connect here. | "Server mode enables an entire ecosystem" |
| **Skills system** | SKILL.md files with frontmatter. On-demand loading. Permission control. | "Skills are reusable across projects" |
| **Rules/instructions** | AGENTS.md loading, config instructions array, glob patterns, remote URLs. | "Instructions from git make team consistency easy" |
| **Model variant cycling** | Ctrl+T toggles thinking/non-thinking. F2 cycles recent models. | "Quick model switching is essential" |
| **MCP integration** | stdio, SSE, remote transports. Dynamic add/remove. Permission control. | "MCP makes it connect to everything" |
| **Session timeline** | Navigate chronological history. Fork at any point. Child session navigation. | "Session timeline is like git for conversations" |
| **Watcher system** | File change detection triggers auto-actions. | Niche but valued by CI users |
| **Code formatters** | Auto-format after file writes. Configurable per language. | "Never think about formatting again" |

#### What TOADSTOOL Should Take From OpenCode

1. **Provider breadth** - 75+ providers via AI SDK. Essential for an "open" tool.
2. **Leader key pattern** - Ctrl+X as leader. Avoids every terminal key conflict.
3. **Theme system** - Built-in themes + custom theme files. Essential for daily driver.
4. **LSP integration** - Language server protocol for code intelligence.
5. **Session sharing** - `/share` creates URL. Browser-viewable.
6. **Custom agents** - Markdown files with YAML frontmatter.
7. **Custom tools** - TypeScript files with Zod schemas.
8. **Server mode** - HTTP API, OpenAPI spec, TUI as client.
9. **Skills system** - SKILL.md discovery and loading.
10. **Rules system** - AGENTS.md, instructions config, remote URLs.
11. **Model variant cycling** - Ctrl+T for thinking toggle, F2 for model cycling.
12. **MCP deep integration** - All transport types, dynamic management.
13. **Code formatters** - Auto-format after writes.
14. **Watcher system** - File change detection.

### The TOADSTOOL Hybrid Recipe

TOADSTOOL should be the tool that makes users say: *"This has the UX polish of TOAD, the power of Claude Code, and the openness of OpenCode."*

#### Priority Matrix: What To Build and When

| Priority | Feature | Source | Why |
|----------|---------|--------|-----|
| **P0 - Core Identity** | | | |
| | True shell integration | TOAD | *The* differentiator. No other TS tool does this. |
| | Flicker-free streaming markdown | TOAD | Daily driver requirement. |
| | Beautiful diffs (side-by-side + syntax) | TOAD | Code review is the primary use case. |
| | Prompt editor with live Markdown | TOAD | First thing users interact with. |
| | Provider-agnostic (75+ models) | OpenCode | No vendor lock-in. |
| | Permission modes (Plan/Auto/Normal) | Claude Code | Safety is non-negotiable. |
| | Checkpointing + Rewind | Claude Code | Safety net enables boldness. |
| **P1 - Power User** | | | |
| | Hooks system (lifecycle events) | Claude Code | Infinite extensibility without forking. |
| | Leader key keybinds (configurable) | OpenCode | Avoids terminal conflicts. |
| | Vim editor mode | Claude Code | Power users demand this. |
| | Background tasks (Ctrl+B) | Claude Code | Long builds/tests while chatting. |
| | Reverse search (Ctrl+R) | Claude Code | Terminal muscle memory. |
| | Block navigation (notebook-style) | TOAD | Interact with conversation blocks. |
| | File picker (fuzzy + tree) | TOAD | Best-in-class file context. |
| | Kill ring (Ctrl+K/U/Y) | Claude Code | Emacs muscle memory. |
| **P2 - Ecosystem** | | | |
| | Custom agents (Markdown files) | OpenCode | User-defined agents. |
| | Custom tools (TypeScript files) | OpenCode | User-defined tools. |
| | Skills system (SKILL.md) | OpenCode | Reusable instructions. |
| | Rules system (AGENTS.md) | OpenCode | Team consistency. |
| | MCP integration (all transports) | OpenCode | Connect to everything. |
| | Plugin system (bundles) | Claude Code | Third-party extensibility. |
| | Theme system (customizable) | OpenCode | Personalization. |
| **P3 - Professional** | | | |
| | Server mode (OpenAPI) | OpenCode | IDE integration, automation. |
| | Headless/SDK mode (-p flag) | Claude Code | CI/CD pipelines. |
| | Budget & turn limits | Claude Code | Cost control. |
| | Structured JSON output | Claude Code | Programmatic usage. |
| | Session sharing (URL) | OpenCode | Team collaboration. |
| | PR review status (footer) | Claude Code | Git workflow integration. |
| | AI prompt suggestions | Claude Code | Reduces friction. |
| | Agent teams (multi-agent) | Claude Code | Parallel agent work. |
| **P4 - Polish** | | | |
| | LSP integration | OpenCode | Code intelligence. |
| | AI App Store (agent discovery) | TOAD | Discover new agents. |
| | SVG export | TOAD | Documentation. |
| | Image paste | Claude Code | Vision model support. |
| | Auto-detect shell commands | TOAD | Reduce `!` prefix friction. |
| | Simple settings UI | TOAD | No JSON editing. |
| | Diagnostic commands (/doctor, /stats) | Claude Code | Self-healing. |
| | Code formatters (auto-format) | OpenCode | Post-write formatting. |
| | Web sessions (remote/teleport) | Claude Code | Future expansion. |

#### Unique TOADSTOOL Differentiators

Beyond combining features, TOADSTOOL should have its own identity:

1. **TypeScript-native** - Unlike TOAD (Python) and OpenCode (Go internals). Full TypeScript stack means the same community that builds agents can extend the tool itself.
2. **OpenTUI-powered** - The same rendering engine as OpenCode but available as a framework. Best-in-class terminal rendering.
3. **ACP + MCP dual protocol** - First-class support for both Agent Client Protocol (agent communication) and Model Context Protocol (tool integration).
4. **Hybrid checkpoint system** - Combines Claude Code's per-prompt checkpointing with OpenCode's git-based undo for the best of both worlds.
5. **Settings TUI + JSON** - TOAD's simple settings UI with OpenCode's JSON power user config. Both paths to the same settings.

#### What NOT To Build (Intentional Omissions)

| Feature | Source | Why Skip |
|---------|--------|----------|
| Desktop app (Electron) | OpenCode | Out of scope. Terminal-first. |
| Windows native | TOAD | WSL is sufficient. Target later. |
| Chrome browser integration | Claude Code | MCP browser tools are better. |
| Web sessions (remote/teleport) | Claude Code | Requires cloud infrastructure. Defer to P4+. |
| Agent teams (full multi-agent orchestration) | Claude Code | Complex. Defer until single-agent is perfect. |
| Conda/pixi installation | TOAD | npm/bun/brew covers our audience. |

---

## Current State Assessment

### What's Working Well

1. **Type System** - Branded IDs (`SessionId`, `AgentId`, `MessageId`, `ToolCallId`), Zod schemas everywhere, strict mode
2. **Constants Architecture** - 40+ constant files in `src/constants/`, derived types, `as const` pattern
3. **Harness Registry** - Multi-provider adapter pattern with `HarnessAdapter<TConfig>`
4. **ACP Protocol** - JSON-RPC 2.0 client, session streaming, tool call management
5. **Session Persistence** - Dual backend (JSON + SQLite), search engine
6. **@ File Mentions** - Fuzzy search via fuzzysort, `InputWithAutocomplete` component
7. **Permission System** - Tool call approval with permission profiles
8. **Session Management** - Create, list, switch, resume with hydration

### What's Partially Working

| Feature | Status | Gap |
|---------|--------|-----|
| TUI Interface | Ink 5.x works | Missing OpenTUI's tree-sitter, flexbox, animations |
| Agent System | Types exist in domain.ts | No execution engine, no agent switching via Tab |
| Tools System | ToolCallManager renders calls | No built-in tool implementations (bash, edit, write, read, grep, glob) |
| Slash Commands | 6 commands (/help, /mode, /clear, /plan, /settings, /export) | Missing 10+ commands from OpenCode |
| Theme System | Fixed palette in `theme.ts` | Not user-customizable, no theme files |
| Keybinds | Hardcoded in `useAppKeyboardShortcuts.ts` | No leader key, not configurable |
| Bash Commands | `TerminalHandler` exists | No `!` prefix integration in input |
| Agent Config | JSON config exists | No Markdown agent files |
| Code Formatters | Biome for project | Not agent-integrated |
| Custom Tools | MCP server support | No user-defined tool functions |

### What's Missing Entirely

| Feature | OpenCode Implementation | Priority |
|---------|------------------------|----------|
| **Undo/Redo** | Git-based file change undo/redo | HIGH |
| **Compaction** | Context summarization for long conversations | HIGH |
| **Todo System** | Task tracking during coding sessions | HIGH |
| **Session Sharing** | Share conversations via URL | MEDIUM |
| **LSP Integration** | Go-to-definition, find references, hover, symbols | MEDIUM |
| **External Editor** | Open `$EDITOR` for composing messages | MEDIUM |
| **Multi-edit/Patch** | Batch file modifications | MEDIUM |
| **Scroll Acceleration** | macOS-style smooth scrolling | LOW |
| **Client/Server Architecture** | Remote driving via HTTP server | LOW |

---

## Feature Gap Analysis

### OpenCode vs TOADSTOOL - Complete Feature Matrix

#### 1. Agent System

**OpenCode:**
- [ ] Build agent (full access, default)
- [ ] Plan agent (read-only analysis)
- [ ] General subagent (multi-step tasks)
- [ ] Explore subagent (fast read-only search)
- [ ] Compaction agent (hidden, auto-compacts context)
- [ ] Title agent (hidden, auto-generates session titles)
- [ ] Summary agent (hidden, creates session summaries)
- [ ] Agent switching via Tab key
- [ ] `@agent` mention to invoke subagents
- [ ] JSON + Markdown agent definition files
- [ ] Per-agent model, temperature, tools, permissions
- [ ] Custom agent creation via `opencode agent create`

**TOADSTOOL:**
- [ ] Types defined in `domain.ts` (SubAgent, Plan, Task)
- [ ] HarnessRegistry with adapter pattern
- [ ] Agent selection UI with fuzzy search
- [ ] NO agent switching (Tab key not mapped)
- [ ] NO subagent invocation
- [ ] NO hidden system agents (compaction, title, summary)
- [ ] NO Markdown agent files
- [ ] NO per-agent tool/permission overrides

**Gap:** ~70% missing. Types exist but no execution engine.

#### 2. Tool System

**OpenCode built-in tools:**
- [ ] `bash` - Execute shell commands
- [ ] `edit` - String replacement edits
- [ ] `write` - Create/overwrite files
- [ ] `read` - Read file contents (with line ranges)
- [ ] `grep` - Regex search via ripgrep
- [ ] `glob` - File pattern matching
- [ ] `list` - Directory listing
- [ ] `lsp` - Language server protocol (experimental)
- [ ] `patch` - Apply diff patches
- [ ] `todowrite` - Create/update task lists
- [ ] `todoread` - Query task lists
- [ ] `webfetch` - Fetch web content
- [ ] `websearch` - Search web via Exa AI
- [ ] `question` - Ask user questions
- [ ] `skill` - Load skill files
- [ ] Custom tools via config

**TOADSTOOL:**
- [ ] ToolCallManager renders tool calls
- [ ] ToolCallApproval flow exists
- [ ] TerminalHandler for bash (not integrated)
- [ ] FsHandler for file operations (not integrated)
- [ ] SearchService (ripgrep + AST) exists but not exposed as tool
- [ ] NO read/write/edit/patch as agent tools
- [ ] NO todowrite/todoread
- [ ] NO webfetch/websearch
- [ ] NO question tool
- [ ] NO skill tool
- [ ] NO custom tool definitions

**Gap:** ~80% missing. Infrastructure exists but tools not wired to agents.

#### 3. Slash Commands

**OpenCode (16 commands):**
```
/connect   - Add a provider
/compact   - Compact session context
/details   - Toggle tool execution details
/editor    - Open external editor
/exit      - Exit (/quit, /q)
/export    - Export to Markdown
/help      - Show help
/init      - Create/update AGENTS.md
/models    - List available models
/new       - Start new session (/clear)
/redo      - Redo undone message
/sessions  - List/switch sessions (/resume)
/share     - Share session
/themes    - List themes
/thinking  - Toggle thinking blocks
/undo      - Undo last message
/unshare   - Unshare session
```

**TOADSTOOL (6 commands):**
```
/help     - Show help
/mode     - Change session mode
/clear    - Clear messages
/plan     - Create a plan
/settings - Open settings
/export   - Export conversation
```

**Missing commands (10):**
```
/connect   /compact   /details   /editor    /models
/new       /redo      /sessions  /share     /themes
/thinking  /undo      /unshare
```

#### 4. Configuration System

**OpenCode:**
- [ ] `opencode.json` / `opencode.jsonc` (JSON with Comments)
- [ ] Remote config via `.well-known/opencode`
- [ ] Global config: `~/.config/opencode/opencode.json`
- [ ] Project config: `opencode.json` in project root
- [ ] Custom path via `OPENCODE_CONFIG` env var
- [ ] Inline config via `OPENCODE_CONFIG_CONTENT` env var
- [ ] Config merging with precedence order
- [ ] JSON Schema at `opencode.ai/config.json`
- [ ] Variable substitution: `{env:VAR}`, `{file:path}`
- [ ] Sections: tui, server, tools, models, themes, agents, commands, keybinds, permissions, compaction, watcher, mcp, plugins, formatters, instructions, share

**TOADSTOOL:**
- [ ] `~/.config/toadstool/config.json` (basic)
- [ ] Settings manager with Zod schema
- [ ] Environment variables for key configuration
- [ ] NO config merging
- [ ] NO JSON Schema
- [ ] NO variable substitution
- [ ] NO per-project config
- [ ] NO remote config
- [ ] LIMITED sections (agents, defaults)

**Gap:** ~60% missing. Needs full config system overhaul.

#### 5. Provider System

**OpenCode:**
- [ ] 75+ providers via AI SDK + Models.dev
- [ ] `/connect` command for adding providers
- [ ] Provider-specific options (baseURL, timeout, headers)
- [ ] Custom providers via `npm` field
- [ ] Local model support (Ollama, LM Studio, llama.cpp)
- [ ] OAuth flow (GitHub Copilot, Anthropic, GitLab)
- [ ] `enabled_providers` / `disabled_providers`
- [ ] `small_model` for lightweight tasks (title gen, etc.)

**TOADSTOOL:**
- [ ] Claude CLI harness adapter (primary)
- [ ] Mock harness for testing
- [ ] HarnessRegistry for multiple adapters
- [ ] ACP client for JSON-RPC communication
- [ ] Auth flow with credential stores (keytar, encrypted disk, memory)
- [ ] NO `/connect` UI
- [ ] NO provider-specific config options
- [ ] NO local model support
- [ ] NO OAuth flows
- [ ] NO `small_model` concept

**Gap:** ~50% missing. Good foundation, needs provider breadth.

#### 6. Keybind System

**OpenCode:**
- [ ] Leader key pattern (`ctrl+x` as leader)
- [ ] `ctrl+x c` = compact, `ctrl+x d` = details, etc.
- [ ] Fully configurable via `keybinds` in config
- [ ] Tab to switch agents
- [ ] Navigation between child sessions (Leader+Left/Right)

**TOADSTOOL:**
- [ ] Hardcoded in `useAppKeyboardShortcuts.ts`
- [ ] `Ctrl+P` = switch provider
- [ ] `Ctrl+N` = new session
- [ ] `Ctrl+L` = clear screen
- [ ] `Escape` = cancel
- [ ] `Ctrl+C` = exit
- [ ] NO leader key pattern
- [ ] NO configurable keybinds
- [ ] NO Tab agent switching
- [ ] NO child session navigation

#### 7. Rules & Instructions System

**OpenCode:**
- [ ] `AGENTS.md` loaded by traversing up to git root
- [ ] `CLAUDE.md` as fallback
- [ ] Global rules at `~/.config/opencode/AGENTS.md`
- [ ] `instructions` config array (files, globs, remote URLs)
- [ ] `/init` command to scan project and generate AGENTS.md
- [ ] Claude Code compatibility (disable via env var)

**TOADSTOOL:**
- [ ] `.cursorrules` exists with project instructions
- [ ] `AGENTS.md` and `CLAUDE.md` exist but loaded manually
- [ ] NO automatic rules traversal
- [ ] NO `/init` command
- [ ] NO config-based instructions
- [ ] NO remote URL instructions

**Gap:** ~80% missing. Files exist but no automatic discovery/loading system.

#### 8. Skills System

**OpenCode:**
- [ ] `SKILL.md` discovery in `.opencode/skills/`, `.claude/skills/`, `~/.config/opencode/skills/`
- [ ] `skill` tool for on-demand loading by agents
- [ ] Frontmatter validation (name, description, license)
- [ ] Skill permissions (allow/deny/ask with glob patterns)
- [ ] Per-agent skill permission overrides
- [ ] Ability to disable skill tool entirely per agent

**TOADSTOOL:**
- [ ] `.claude/skills/` directory exists with many skill files
- [ ] Skills listed in agent_skills section
- [ ] NO `skill` tool
- [ ] NO automatic discovery
- [ ] NO permission system for skills

**Gap:** ~70% missing. Content exists, no loading infrastructure.

#### 9. Custom Tools

**OpenCode:**
- [ ] `.opencode/tools/*.ts` custom tool files
- [ ] `tool()` helper with Zod schema args
- [ ] Context injection (agent, sessionID, directory, worktree)
- [ ] Multi-export files create `<file>_<export>` tools
- [ ] Tools written in any language (TypeScript definition wraps them)

**TOADSTOOL:**
- [ ] NO custom tool files
- [ ] NO tool definition helper
- [ ] NO runtime tool loading

**Gap:** 100% missing.

#### 10. Server / API Mode

**OpenCode:**
- [ ] `opencode serve` headless HTTP server
- [ ] Full OpenAPI 3.1 spec
- [ ] Client-server architecture (TUI is just another client)
- [ ] SSE event stream
- [ ] TUI control API (for IDE plugins)
- [ ] Basic auth support
- [ ] mDNS discovery
- [ ] CORS configuration

**TOADSTOOL:**
- [ ] NO server mode
- [ ] NO HTTP API
- [ ] NO IDE integration protocol
- [ ] NO event streaming for external clients

**Gap:** 100% missing.

#### 11. Session Management (Extended)

**OpenCode:**
- [ ] Session CRUD (create, list, get, delete, rename)
- [ ] Session forking (branch at any message)
- [ ] Session timeline (chronological navigation)
- [ ] Session diff (all file changes in session)
- [ ] Session summarize (via summary agent)
- [ ] Session share/unshare
- [ ] Session export to Markdown
- [ ] Child session navigation (subagent sessions)
- [ ] Auto-title generation (via title agent)

**TOADSTOOL:**
- [ ] Session create, list, switch
- [ ] Session persistence (SQLite + JSON)
- [ ] Session export (basic)
- [ ] NO forking
- [ ] NO timeline
- [ ] NO diff view
- [ ] NO summarize
- [ ] NO share
- [ ] NO child session navigation
- [ ] NO auto-title

**Gap:** ~60% missing.

#### 12. Input System

**OpenCode:**
- [ ] Full readline/emacs keybindings (ctrl+a/e/b/f/k/u/w/d/t)
- [ ] Text selection (shift+arrows, word-level)
- [ ] Multi-line input (shift+enter)
- [ ] Input undo/redo (ctrl+z/ctrl+shift+z)
- [ ] Clipboard paste (ctrl+v)
- [ ] Input history (up/down arrows)
- [ ] @ file mention with fuzzy autocomplete
- [ ] / slash command autocomplete
- [ ] ! bash command shortcut

**TOADSTOOL:**
- [ ] `InputWithAutocomplete.tsx` component
- [ ] Basic @ mention autocomplete
- [ ] Basic / command autocomplete
- [ ] NO readline keybindings
- [ ] NO text selection
- [ ] NO input undo/redo
- [ ] NO input history navigation
- [ ] LIMITED multi-line support

**Gap:** ~60% missing.

#### 13. MCP Integration

**OpenCode:**
- [ ] stdio, SSE, and remote transport types
- [ ] Dynamic add/remove MCP servers at runtime
- [ ] MCP tools exposed as agent tools
- [ ] Per-MCP permission control
- [ ] Environment variable substitution in config
- [ ] MCP status monitoring API

**TOADSTOOL:**
- [ ] Basic MCP session concept in `mcp-session.integration.test.ts`
- [ ] MCP mentioned in `.cursor/mcp.json`
- [ ] NO runtime MCP management
- [ ] NO MCP tool exposure to agents
- [ ] NO multi-transport support

**Gap:** ~80% missing.

#### 14. Distribution & CI/CD

**OpenCode:**
- [ ] npm package
- [ ] brew tap
- [ ] Install script
- [ ] Auto-update checks
- [ ] Desktop app (Electron)
- [ ] GitHub Actions CI

**TOADSTOOL:**
- [ ] `bin` field in package.json
- [ ] NO npm publish setup
- [ ] NO brew formula
- [ ] NO install script
- [ ] NO auto-update
- [ ] NO CI pipeline

**Gap:** ~90% missing.

---

## Code Quality Audit

### Critical Issues (Must Fix)

#### 1. Magic Numbers (~50+ instances)

**UI Components:**
| File | Line(s) | Value | Should Be |
|------|---------|-------|-----------|
| `FileTree.tsx` | 193 | `0.15` | `UI.SIDEBAR_WIDTH_RATIO` |
| `FileTree.tsx` | 196 | `80` | `UI.TERMINAL_DEFAULT_COLUMNS` |
| `FileTree.tsx` | 203 | `10` | `LIMIT.FILE_TREE_PADDING` |
| `FileTree.tsx` | 252 | `3` | `LIMIT.FILE_TREE_SAFETY_MARGIN` |
| `Sidebar.tsx` | 228 | `0.15` | `UI.SIDEBAR_WIDTH_RATIO` (duplicate!) |
| `Sidebar.tsx` | 231-233 | `2, 2, 1` | `UI.SIDEBAR_PADDING`, `UI.SCROLLBAR_WIDTH` |
| `Sidebar.tsx` | 239-240 | `0.55, 0.25` | `UI.SIDEBAR_FILES_RATIO`, `UI.SIDEBAR_TASKS_RATIO` |
| `Sidebar.tsx` | 308 | `60` | `LIMIT.SIDEBAR_TRUNCATE_LENGTH` |
| `MarkdownRenderer.tsx` | 31 | `120` | `LIMIT.MARKDOWN_COLLAPSE_AFTER` |
| `MarkdownRenderer.tsx` | 32 | `10` | `TIMEOUT.STREAM_BUFFER_MS` |
| `MarkdownRenderer.tsx` | 113 | `31` | Named hash constant |
| `CommandPalette.tsx` | 14 | `10` | `LIMIT.COMMAND_PALETTE_MAX_RESULTS` |
| `HelpModal.tsx` | 14 | `11` | `LIMIT.HELP_MAX_DESCRIPTION_WIDTH` |
| `HelpModal.tsx` | 68-69 | `20, 80%` | `UI.MODAL_HEIGHT`, `UI.MODAL_WIDTH` |
| `SettingsModal.tsx` | 39-40 | `20, 80%` | `UI.MODAL_HEIGHT`, `UI.MODAL_WIDTH` |
| `SessionsPopup.tsx` | 69-70 | `20, 80%` | `UI.POPUP_HEIGHT`, `UI.POPUP_WIDTH` |
| `LoadingScreen.tsx` | 6 | `40` | `UI.PROGRESS_BAR_WIDTH` |
| `AppIcon.tsx` | 16-17 | `16, 24` | `UI.ICON_SIZE_SM`, `UI.ICON_SIZE_LG` |
| `MessageItem.tsx` | 243 | `50` | `LIMIT.TOOL_NAME_TRUNCATE` |
| `InputWithAutocomplete.tsx` | 271 | `10` | `LIMIT.LINE_KEY_SLICE` |
| `DiffRenderer.tsx` | 353,359,377,391 | `50%` | `UI.DIFF_COLUMN_WIDTH` |
| `useMentionSuggestions.ts` | 6 | `150` | `TIMEOUT.MENTION_DEBOUNCE_MS` |
| `useTerminalDimensions.ts` | 11-12 | `10, 50` | `LIMIT.MIN_TERMINAL_ROWS`, `LIMIT.MIN_TERMINAL_COLS` |

#### 2. Magic Strings (~30+ instances)

| File | Value | Should Be |
|------|-------|-----------|
| `app-store.ts:42` | `"disconnected"` | `CONNECTION_STATUS.DISCONNECTED` |
| `app-store.ts:48` | `"files"` | `SIDEBAR_TAB.FILES` |
| `ToolCallManager.tsx:482` | `"denied"` | `TOOL_CALL_STATUS.DENIED` |
| `MessageItem.tsx:226-231` | `"complete"`, `"in-progress"`, `"failed"`, `"pending"` | Status constants |
| `Chat.tsx:64,79,84,88,93,121,125,314` | Error/info message strings | `ERROR_MESSAGE.*` / `INFO_MESSAGE.*` |
| `FileTree.tsx:46` | `[".git", "node_modules"]` | `IGNORE_PATTERNS.FILE_TREE` |
| `useProjectFiles.ts:17` | `[".git", "node_modules", "dist", ".next"]` | `IGNORE_PATTERNS.PROJECT_FILES` |
| `theme.ts:34,36` | `"#1a3d1a"`, `"#3d1a1a"`, `"#1a2a3a"` | `COLOR.DIFF_ADDED_BG`, etc. |

#### 3. Type Safety Issues (~180+ instances)

**`as` type assertions (100+):**
- [ ] `session-stream.ts` - `as MessageRole` (3 instances)
- [ ] `app-store.ts` - `as Array<[string, Message]>`, `as AppState["messages"]`
- [ ] `DiffRenderer.tsx` - `as unknown as` chain (complex cast)
- [ ] `MessageItem.tsx` - `as ChatContentBlock`, `as unknown as` chain
- [ ] `ToolCallManager.tsx` - `as string` (4 instances)
- [ ] Many more across persistence and token optimizer modules

**Non-null assertions `!` (80+):**
- [ ] `FileTree.tsx` - 6 instances
- [ ] `App.tsx` - 4 instances
- [ ] `ToolCallManager.tsx` - 10 instances
- [ ] `MessageItem.tsx` - 8 instances
- [ ] `Sidebar.tsx` - 7 instances
- [ ] `Chat.tsx` - 10 instances

**Recommended fix:** Add proper type narrowing with discriminated unions, use `satisfies` operator, add null-safe access patterns.

#### 4. Oversized Components

| File | Lines | Issue |
|------|-------|-------|
| `ToolCallManager.tsx` | 575 | Needs splitting into ToolCallItem, ToolCallStatus, ToolCallResult |
| `DiffRenderer.tsx` | 493 | Split into DiffHeader, DiffHunk, DiffLine |
| `Chat.tsx` | 479 | Extract slash command handler, message sender, mode manager |
| `MessageItem.tsx` | 476 | Extract ContentBlockRenderer, ToolCallSummary, ThinkingBlock |
| `App.tsx` | 306 | Extract ViewRouter, BootstrapLoader |

#### 5. Deep Nesting (4+ levels)

- [ ] `Chat.tsx:231-293` - Switch statement with nested ifs
- [ ] `ToolCallManager.tsx:398-443` - Nested forEach with conditionals
- [ ] `DiffRenderer.tsx:367-406` - Nested map with conditionals
- [ ] `MessageItem.tsx:158-172` - Nested map with nested map

#### 6. Missing Error Handling

- [ ] `FileTree.tsx:64` - `buildTree` async function has no try/catch
- [ ] `MessageItem.tsx:31` - `merged[merged.length - 1]` unchecked array access
- [ ] `Sidebar.tsx:215` - `sessions[sessionIndex]` could be out of bounds

---

## UI/UX Specification

### Full Application Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOADSTOOL   [Build ▾]   session: refactor-auth   ctx: 45k/128k    │  <- Header Bar
├────────────┬────────────────────────────────────────────────────────┤
│ FILES      │                                                        │
│ ├─ src/    │  🧑 You                                    10:32 AM   │  <- Message (user)
│ │  ├─ ...  │  How does auth work in this project?                   │
│ │  └─ ...  │                                                        │
│ ├─ tests/  │  🤖 Claude (sonnet-4)                      10:32 AM   │  <- Message (assistant)
│ └─ ...     │  The authentication system uses JWT tokens...          │
│            │                                                        │
│ TASKS      │  ```typescript                                         │  <- Code block (tree-sitter)
│ ☐ Refactor │  const token = jwt.sign(payload, secret);              │
│ ● Fix auth │  ```                                                   │
│ ✓ Add test │                                                        │
│            │  🔧 read src/auth/jwt.ts (✓ completed)                 │  <- Tool call
│ AGENTS     │  🔧 edit src/auth/jwt.ts (⏳ pending approval)         │  <- Tool call (needs approval)
│ • Build    │                                                        │
│ • Plan     │  ─── thinking ───────────────────────────              │  <- Thinking block (collapsible)
│            │  Let me analyze the token flow...                       │
│            │  ──────────────────────────────────────                │
├────────────┴────────────────────────────────────────────────────────┤
│ > Type a message... (@file, /command, !bash)           [Shift+↵]   │  <- Input area (textarea)
├─────────────────────────────────────────────────────────────────────┤
│ ● Connected  │ Build  │ claude-sonnet-4  │ 45k tokens  │ Ctrl+X ?  │  <- Status Footer
└─────────────────────────────────────────────────────────────────────┘
```

### Input Area (`<textarea>`) - Detailed Behavior

The input area is the primary interaction point. It must feel as responsive as a native editor.

#### Text Entry
| Action | Behavior |
|--------|----------|
| **Type text** | Characters appear at cursor position |
| **Enter** | Send message to agent |
| **Shift+Enter** | Insert newline (multi-line editing) |
| **Up arrow** (empty input) | Navigate to previous message in history |
| **Down arrow** (at latest) | Navigate forward in history |
| **Ctrl+A** | Select all text |
| **Ctrl+C** (no selection) | Cancel current agent request / Exit if idle |
| **Ctrl+C** (with selection) | Copy selected text |
| **Ctrl+V** | Paste from clipboard |
| **Backspace** | Delete character before cursor |
| **Delete** | Delete character after cursor |
| **Home / Ctrl+A** | Move cursor to start of line |
| **End / Ctrl+E** | Move cursor to end of line |
| **Ctrl+U** | Clear entire input |
| **Escape** | Cancel current agent request, clear input if no active request |
| **Tab** | Accept autocomplete suggestion (if showing) |

#### Autocomplete Triggers
| Trigger | Behavior | Component |
|---------|----------|-----------|
| `@` | Fuzzy file search popup - shows matching files from project | `<select>` overlay |
| `/` (at start) | Slash command autocomplete - shows matching commands | `<select>` overlay |
| `@agent_name` | Subagent mention - shows matching agents | `<select>` overlay |
| `!` (at start) | Bash mode indicator - entire message executed as shell command | Visual indicator |

#### @ File Mention Flow
1. User types `@` in input
2. Popup appears with fuzzy-matched project files
3. Typing narrows results (fuzzysort scoring)
4. Up/Down arrows navigate the list
5. Enter/Tab selects the file, inserts `@path/to/file` into input
6. File content is automatically attached as context to the message
7. Escape dismisses the popup without selecting

#### / Slash Command Flow
1. User types `/` at the beginning of input
2. Popup appears with all available commands
3. Typing narrows results (fuzzy match on command name + description)
4. Enter executes the command immediately
5. Commands that need arguments show inline parameter input
6. Escape dismisses the popup

#### ! Bash Command Flow
1. User types `!` at the beginning of input
2. Input background changes to indicate bash mode
3. Enter sends the command for shell execution
4. Output is added to the conversation as a tool result
5. No agent involvement - direct shell execution

### Message List - Detailed Behavior

#### Message Display
| Element | Rendering |
|---------|-----------|
| **User message** | Blue role indicator, plain text or markdown |
| **Assistant message** | Green/purple role indicator, full markdown rendering |
| **System message** | Yellow role indicator, italic text |
| **Timestamps** | Right-aligned, dimmed, format: `HH:MM AM/PM` |
| **Role name** | Configurable display (show/hide via `/details`) |
| **Code blocks** | `<code>` with tree-sitter highlighting, line numbers, language tag |
| **Inline code** | Highlighted with `<span>` styling |
| **Links** | Underlined, colored, clickable (opens browser) |
| **Lists** | Proper bullet/number rendering with indentation |
| **Tables** | Aligned columns with borders |
| **Thinking blocks** | Collapsible section, dimmed, toggleable via `/thinking` |

#### Streaming Behavior
| State | Visual |
|-------|--------|
| **Waiting for response** | Animated spinner or "..." indicator |
| **Streaming text** | Characters appear progressively, markdown rendered incrementally |
| **Streaming code** | `<code streaming={true}>` - syntax highlighting updates as code arrives |
| **Streaming markdown** | `<markdown streaming={true}>` - renders progressively |
| **Stream complete** | Final render pass, timestamp appears |
| **Error during stream** | Red error message, option to retry |

#### Tool Call Display
| State | Visual |
|-------|--------|
| **Pending** | `⏳ tool_name (pending)` - dimmed |
| **Running** | `⏳ tool_name (running...)` - animated spinner |
| **Pending approval** | `⚠️ tool_name - [Allow] [Deny] [Always Allow]` - highlighted |
| **Succeeded** | `✓ tool_name (completed)` - green, collapsible result |
| **Failed** | `✗ tool_name (failed)` - red, error details shown |
| **Denied** | `🚫 tool_name (denied)` - dimmed, strikethrough |

#### Tool Call Approval Flow
1. Agent requests tool execution (e.g., `edit src/auth.ts`)
2. Tool call appears with `[Allow]`, `[Deny]`, `[Always Allow]` buttons
3. User navigates with arrow keys, selects with Enter
4. `Allow` - Execute this once
5. `Deny` - Block this call, agent receives denial
6. `Always Allow` - Add to permission allowlist for session
7. Approval state shown in status footer during pending

### Sidebar - Detailed Behavior

#### Tab Structure
```
┌──────────┬──────────┬──────────┐
│  FILES   │  TASKS   │  AGENTS  │   <- Tab headers (via <tab-select>)
└──────────┴──────────┴──────────┘
```

#### FILES Tab
| Feature | Behavior |
|---------|----------|
| **File tree** | Hierarchical directory display with indentation |
| **Expand/Collapse** | Arrow keys or Enter to toggle directories |
| **File selection** | Enter on a file inserts `@path` into input |
| **Ignore patterns** | `.git`, `node_modules`, `dist`, `.next` hidden |
| **Git status** | Modified files marked with `M`, new with `?` (future) |
| **Current file** | Highlighted if agent is working on it |

#### TASKS Tab (Todo System)
| Feature | Behavior |
|---------|----------|
| **Task list** | Shows current session's todo items |
| **Status icons** | `☐` pending, `●` in_progress, `✓` completed, `✗` cancelled |
| **Priority** | High=red, Medium=yellow, Low=dim |
| **Real-time updates** | Refreshes when agent calls `todowrite` |
| **Count badge** | Tab header shows `TASKS (3)` with active count |

#### AGENTS Tab
| Feature | Behavior |
|---------|----------|
| **Agent list** | Shows all registered agents (primary + subagents) |
| **Current agent** | Highlighted with `→` indicator |
| **Agent info** | Name, model, mode (primary/subagent), tool access |
| **Quick switch** | Enter to switch primary agent (same as Tab key) |

#### Sidebar Resize
- [ ] Default width: 15% of terminal width
- [ ] Minimum: 20 columns
- [ ] Can be collapsed entirely with keybind (Ctrl+B or leader key)
- [ ] Files section: 55% of sidebar height
- [ ] Tasks section: 25% of sidebar height
- [ ] Agents section: 20% of sidebar height

### Modals & Popups

#### Help Modal (`/help` or `Ctrl+X H`)
```
┌─ Help ──────────────────────────────────────────────┐
│                                                      │
│  Keyboard Shortcuts                                  │
│  ─────────────────                                   │
│  Enter          Send message                         │
│  Shift+Enter    New line                             │
│  Tab            Switch agent                         │
│  Ctrl+X C       Compact session                      │
│  Ctrl+X D       Toggle details                       │
│  Ctrl+X E       Open editor                          │
│  Ctrl+X H       Show help                            │
│  Ctrl+X L       List sessions                        │
│  Ctrl+X M       List models                          │
│  Ctrl+X N       New session                          │
│  Ctrl+X Q       Quit                                 │
│  Ctrl+X S       Share session                        │
│  Ctrl+X T       Change theme                         │
│  Ctrl+X U       Undo                                 │
│  Ctrl+X R       Redo                                 │
│                                                      │
│  Slash Commands                                      │
│  ──────────────                                      │
│  /help /connect /compact /details /editor            │
│  /export /models /new /sessions /themes              │
│  /thinking /undo /redo /share /unshare               │
│                                                      │
│  Press Escape to close                               │
└──────────────────────────────────────────────────────┘
```

#### Settings Modal (`/settings`)
| Setting | Control | Values |
|---------|---------|--------|
| Theme | `<select>` | List of available themes |
| Default agent | `<select>` | Build, Plan, custom agents |
| Default model | `<select>` | Available models from providers |
| Show timestamps | Toggle | on/off |
| Show username | Toggle | on/off |
| Show thinking | Toggle | on/off |
| Tool detail level | `<select>` | minimal, normal, verbose |
| Diff style | `<select>` | auto, stacked, split |

#### Sessions Popup (`/sessions` or `Ctrl+X L`)
| Column | Content |
|--------|---------|
| Title | Auto-generated session title |
| Agent | Agent used in session |
| Date | Last message timestamp |
| Messages | Message count |
| Status | Active / Paused / Archived |

Navigate with Up/Down, Enter to switch, `D` to delete, `N` for new.

#### Command Palette (`/` or `Ctrl+X`)
Quick action search - fuzzy matches across:
- [ ] All slash commands
- [ ] Recent sessions
- [ ] Available agents
- [ ] Settings

#### Model Selector (`/models` or `Ctrl+X M`)
| Column | Content |
|--------|---------|
| Provider | anthropic, openai, google, etc. |
| Model | claude-sonnet-4, gpt-4o, gemini-2.5-pro, etc. |
| Context | 128k, 200k, etc. |
| Features | vision, thinking, streaming |

### Status Footer - Detailed Spec

```
┌─────────────────────────────────────────────────────────────────────┐
│ ● Connected  │ Build  │ claude-sonnet-4  │ 45k/128k  │ Ctrl+X ?   │
└─────────────────────────────────────────────────────────────────────┘
```

| Section | Content | Colors |
|---------|---------|--------|
| Connection | `● Connected` / `○ Connecting...` / `✗ Disconnected` | Green / Yellow / Red |
| Agent | Current primary agent name (`Build` / `Plan` / custom) | Theme accent |
| Model | Current model name | Dim white |
| Context | `{used}k/{limit}k` token usage (from compaction tracker) | Green (<50%), Yellow (50-80%), Red (>80%) |
| Hint | Context-sensitive shortcut hint | Dim |
| Mode | `[Read-Only]` if Plan agent active | Yellow badge |
| Pending | `[1 pending approval]` if tool calls waiting | Orange badge |

### Loading & Connection States

| State | Visual |
|-------|--------|
| **App startup** | ASCII banner + progress bar + "Initializing..." |
| **Agent selection** | Full-screen `<select>` list of available agents |
| **Connecting to agent** | Spinner + "Connecting to {agent}..." |
| **Connected** | Transition to chat view |
| **Connection lost** | Red banner + "Connection lost. Reconnecting..." + auto-retry |
| **Reconnected** | Green flash + "Reconnected" that fades after 2s |
| **Agent error** | Red message in chat + error details + retry option |
| **Session loading** | Spinner + "Loading session..." while hydrating from persistence |

### Responsive Terminal Behavior

| Terminal Width | Layout |
|---------------|--------|
| **< 60 cols** | Sidebar hidden, full-width chat |
| **60-100 cols** | Sidebar collapsed (icons only), chat takes remaining space |
| **100-160 cols** | Standard layout: 15% sidebar + 85% chat |
| **> 160 cols** | Max sidebar width capped at 40 cols |

| Terminal Height | Behavior |
|----------------|----------|
| **< 15 rows** | Status footer hidden, minimal header |
| **15-30 rows** | Standard layout |
| **> 30 rows** | Sidebar shows more items, longer message preview |

### Keyboard Shortcut Full Map

#### Global (always active)
| Key | Action |
|-----|--------|
| `Ctrl+C` | Cancel current request / Exit (if idle + confirmed) |
| `Escape` | Cancel current request / Close modal |
| `Tab` | Switch between Build/Plan agents |
| `Ctrl+B` | Toggle sidebar |

#### Leader Key Sequences (`Ctrl+X` then...)
| Sequence | Action | Slash equivalent |
|----------|--------|-----------------|
| `Ctrl+X` then `C` | Compact session | `/compact` |
| `Ctrl+X` then `D` | Toggle tool details | `/details` |
| `Ctrl+X` then `E` | Open external editor | `/editor` |
| `Ctrl+X` then `H` | Show help | `/help` |
| `Ctrl+X` then `L` | List sessions | `/sessions` |
| `Ctrl+X` then `M` | List models | `/models` |
| `Ctrl+X` then `N` | New session | `/new` |
| `Ctrl+X` then `Q` | Quit | `/exit` |
| `Ctrl+X` then `R` | Redo | `/redo` |
| `Ctrl+X` then `S` | Share session | `/share` |
| `Ctrl+X` then `T` | Change theme | `/themes` |
| `Ctrl+X` then `U` | Undo | `/undo` |
| `Ctrl+X` then `→` | Navigate to child session (subagent) |
| `Ctrl+X` then `←` | Navigate to parent session |

#### Input-Focused (when typing)
| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | Insert newline |
| `Up` (empty) | Previous history entry |
| `Down` | Next history entry |
| `Tab` | Accept autocomplete / cycle suggestions |
| `@` | Trigger file mention autocomplete |
| `/` (at start) | Trigger command autocomplete |
| `!` (at start) | Enter bash mode |

---

## Advanced Features Specification

### 1. Undo/Redo System (Git-Based)

**How OpenCode does it:** Every file modification by the agent creates a git stash point.
`/undo` reverts the last message AND all file changes it caused. `/redo` restores them.

#### Implementation Design
```
User sends message -> Agent responds -> Agent calls edit/write tools
                                              ↓
                                     Git: create stash point BEFORE tool execution
                                              ↓
                                     Tool executes (files modified)
                                              ↓
                                     Git: record commit SHA AFTER tool execution
                                              ↓
                                     Store: (messageId, beforeSHA, afterSHA) in undo stack
```

#### Undo Flow
1. User types `/undo`
2. Pop last entry from undo stack -> get `(messageId, beforeSHA, afterSHA)`
3. Git: reset to `beforeSHA` (restoring original files)
4. Store: remove message and all subsequent messages
5. Store: restore the original user prompt in input (so user can edit and retry)
6. Push entry to redo stack
7. UI: show "Undone. Your message is restored in the input."

#### Redo Flow
1. User types `/redo`
2. Pop from redo stack -> get `(messageId, beforeSHA, afterSHA)`
3. Git: cherry-pick or apply the changes from `afterSHA`
4. Store: restore the messages
5. UI: show "Redone."

#### Edge Cases
- [ ] Undo when no messages exist -> show error
- [ ] Undo when user has uncommitted changes -> warn, offer to stash first
- [ ] Multiple consecutive undos -> pop multiple entries
- [ ] Redo after new message (invalidates redo stack) -> clear redo stack

### 2. Context Compaction System

**Problem:** Long conversations exceed model context windows (128k-200k tokens).
**Solution:** Hidden compaction agent summarizes old messages, freeing context space.

#### Compaction Flow
```
Context approaches 80% of model limit
        ↓
Auto-compaction triggered (or user runs /compact)
        ↓
Compaction agent receives: first N messages that are oldest
        ↓
Compaction agent returns: summary of those messages
        ↓
Old messages replaced with single "[Compacted] Summary: ..."
        ↓
Context usage drops, conversation continues
```

#### Configuration
```json
{
  "compaction": {
    "auto": true,          // Auto-compact at threshold
    "threshold": 0.8,      // Trigger at 80% context usage
    "prune": true,         // Also prune old tool outputs
    "preserve_recent": 5   // Always keep last N message pairs
  }
}
```

#### Context Tracking UI
- [ ] Status footer shows `45k/128k` with color coding
- [ ] Green (<50%), Yellow (50-80%), Red (>80%)
- [ ] When compaction runs: brief "Compacting context..." indicator

### 3. Todo System

#### Data Model
```typescript
interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
}
```

#### Agent Integration
- [ ] Agent calls `todowrite` tool to create/update task lists
- [ ] Agent calls `todoread` tool to check current state
- [ ] Todos are session-scoped (each session has its own list)
- [ ] Persisted to storage alongside session data

#### UI Display (Sidebar TASKS tab)
```
TASKS (3 active)
────────────────
● [HIGH] Refactor auth module          <- in_progress (yellow)
☐ [MED]  Add unit tests for JWT        <- pending (dim)
☐ [LOW]  Update API documentation       <- pending (dim)
✓ [MED]  Fix token expiry bug           <- completed (green, strikethrough)
✗ [LOW]  Remove deprecated endpoint     <- cancelled (red, strikethrough)
```

### 4. Session Sharing

#### Share Flow
1. User runs `/share`
2. Session data serialized to JSON
3. Uploaded to sharing endpoint (configurable)
4. URL returned and copied to clipboard
5. URL shown in chat: "Session shared: https://..."

#### Unshare Flow
1. User runs `/unshare`
2. Session removed from sharing endpoint
3. Confirmation shown in chat

#### Privacy
- [ ] Default: `"manual"` - user must explicitly share
- [ ] Option: `"auto"` - new sessions auto-shared
- [ ] Option: `"disabled"` - sharing disabled entirely

### 5. External Editor Integration

#### Flow
1. User runs `/editor` or `Ctrl+X E`
2. Current input content written to temp file
3. `$EDITOR` opened with temp file (blocking wait)
4. On editor close, temp file content read back into input
5. Temp file cleaned up
6. If content changed, input updated; otherwise no-op

#### Export to Editor
1. User runs `/export` or `Ctrl+X X`
2. Full conversation exported to Markdown temp file
3. `$EDITOR` opened with the export
4. On close, temp file is the user's copy (not auto-imported back)

### 6. Provider System (Multi-Model)

#### Provider Architecture
```
ProviderRegistry
├── AnthropicProvider    (Claude models via CLI harness / API)
├── OpenAIProvider       (GPT models via API)
├── GoogleProvider       (Gemini models via API)
├── OllamaProvider       (Local models via OpenAI-compatible API)
├── OpenRouterProvider   (Multi-model proxy)
└── CustomProvider       (User-defined via config)
```

#### /connect Flow
1. User runs `/connect`
2. `<select>` list of available providers shown
3. User selects provider
4. Provider-specific auth flow:
   - API key entry (most providers)
   - OAuth browser flow (GitHub Copilot, Anthropic Pro/Max)
   - No auth needed (local models)
5. API key stored in credential store (keytar/encrypted disk)
6. Provider models become available in `/models`

#### /models Flow
1. User runs `/models` or `Ctrl+X M`
2. `<select>` list grouped by provider
3. Shows: provider name, model name, context window, capabilities
4. User selects model -> becomes active for current agent
5. Optional: set as default in config

#### small_model
- [ ] Lightweight model used for automated tasks:
  - [ ] Session title generation
  - [ ] Compaction summaries
  - [ ] Search result summarization
- [ ] Defaults to cheapest available model from active provider
- [ ] Configurable: `"small_model": "anthropic/claude-haiku-4"`

### 7. LSP Integration (Experimental)

#### Supported Operations
| Operation | Description | UI |
|-----------|-------------|-----|
| `goToDefinition` | Jump to symbol definition | Show file + line in chat |
| `findReferences` | Find all references to symbol | List in sidebar or chat |
| `hover` | Get type info for symbol | Tooltip-style display |
| `documentSymbol` | List symbols in file | Tree in sidebar |
| `workspaceSymbol` | Search symbols across project | `<select>` popup |
| `goToImplementation` | Jump to interface implementation | Show file + line |
| `incomingCalls` | Find callers of function | Tree display |
| `outgoingCalls` | Find functions called by function | Tree display |

#### LSP as Agent Tool
- [ ] Exposed as `lsp` tool that agents can call
- [ ] Agent can ask for type info, find references, etc.
- [ ] Results returned as tool output in conversation

### 8. Plugin System

#### Plugin Types
| Type | Description |
|------|-------------|
| **Tool plugins** | Add custom tools (e.g., database query, API calls) |
| **Hook plugins** | Intercept events (pre-send, post-receive, on-tool-call) |
| **Provider plugins** | Add custom LLM providers |
| **UI plugins** | Add sidebar tabs, status bar sections |
| **Formatter plugins** | Add code formatters for specific languages |

#### Plugin Definition
```typescript
// .opencode/plugins/my-plugin.ts
export default {
  name: "my-plugin",
  tools: {
    "db-query": {
      description: "Query the project database",
      parameters: z.object({ sql: z.string() }),
      execute: async (params) => { /* ... */ }
    }
  },
  hooks: {
    onToolCall: async (tool, args) => { /* intercept */ },
    onMessage: async (message) => { /* post-process */ }
  }
};
```

### 9. Custom Commands

#### Definition (Markdown)
```markdown
---
description: Run the full test suite with coverage
agent: build
model: anthropic/claude-haiku-4
---

Run the full test suite with coverage report and show any failures.
Focus on the failing tests and suggest fixes.
```

Save as `.opencode/commands/test.md` -> invokable via `/test`.

#### Parameterized Commands
```markdown
---
description: Create a new React component
---

Create a new React component named $ARGUMENTS with TypeScript support.
Include proper typing and basic structure.
```

`/component MyButton` -> substitutes `$ARGUMENTS` with `MyButton`.

### 10. Code Formatters

#### How It Works
- [ ] After agent writes/edits a file, run the configured formatter
- [ ] Formatters are file-extension-aware
- [ ] Results are silent unless they fail

#### Configuration
```json
{
  "formatter": {
    "biome": {
      "command": ["npx", "biome", "format", "--write", "$FILE"],
      "extensions": [".ts", ".tsx", ".js", ".jsx", ".json"]
    },
    "prettier": {
      "disabled": true
    }
  }
}
```

### 11. Themes System

#### Theme File Structure
```typescript
// .opencode/themes/dracula.ts or ~/.config/toadstool/themes/dracula.ts
export default {
  name: "dracula",
  colors: {
    background: "#282a36",
    foreground: "#f8f8f2",
    user: "#8be9fd",
    assistant: "#bd93f9",
    system: "#f1fa8c",
    error: "#ff5555",
    success: "#50fa7b",
    warning: "#ffb86c",
    border: "#6272a4",
    dim: "#6272a4",
  },
  syntax: SyntaxStyle.fromStyles({
    keyword: { fg: RGBA.fromHex("#ff79c6"), bold: true },
    string: { fg: RGBA.fromHex("#f1fa8c") },
    comment: { fg: RGBA.fromHex("#6272a4"), italic: true },
    // ... etc
  }),
  diff: {
    addedBg: "#1a3d1a",
    removedBg: "#3d1a1a",
  }
};
```

#### Theme Application
- [ ] `syntaxStyle` fed to `<code>`, `<markdown>`, `<diff>` components
- [ ] `colors` fed to palette for all UI elements
- [ ] Changed via `/themes` command or config
- [ ] Persisted in user settings

### 12. Watcher & Hot Reload

#### Config Watcher
- [ ] Watches `toadstool.json` / `opencode.json` for changes
- [ ] On change: reload config, apply new settings without restart
- [ ] Debounced (500ms) to avoid rapid reloads

#### Agent File Watcher
- [ ] Watches `.opencode/agents/` for new/changed agent definitions
- [ ] Auto-registers new agents, updates existing ones
- [ ] Removed agent files -> deregister agent

### 13. Image & Media Support

#### Input
- [ ] Drag-and-drop images into terminal (if terminal supports)
- [ ] `@image.png` file mention for image files
- [ ] Image content sent as base64 to vision-capable models

#### Output
- [ ] Agent responses with images: render as ASCII art or show path
- [ ] `<ascii-font>` for text-based visual rendering
- [ ] External image viewer fallback: open in system viewer

### 14. Rules & Instructions System

OpenCode loads custom instructions from multiple sources. TOADSTOOL needs the same:

#### File Locations (Precedence Order)
1. **Project `AGENTS.md`** - Traverse up from cwd to git root
2. **Project `CLAUDE.md`** (fallback) - If no AGENTS.md exists
3. **Global `~/.config/toadstool/AGENTS.md`** - User-wide rules
4. **Global `~/.claude/CLAUDE.md`** (fallback) - Claude Code compatibility
5. **Config `instructions` array** - Additional files/globs/URLs

#### `/init` Command
- [ ] Scans project files and structure
- [ ] Generates `AGENTS.md` with project context
- [ ] If AGENTS.md exists, appends to it

#### Config Instructions
```json
{
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    ".cursor/rules/*.md",
    "https://raw.githubusercontent.com/org/rules/main/style.md"
  ]
}
```

### 15. Skills System (SKILL.md)

Agent skills are on-demand instruction sets the agent can load via the `skill` tool.

#### Discovery Locations
```
.opencode/skills/<name>/SKILL.md      # Project-local
~/.config/toadstool/skills/<name>/SKILL.md  # Global
.claude/skills/<name>/SKILL.md         # Claude Code compatible
```

#### SKILL.md Format
```yaml
---
name: git-release
description: Create consistent releases and changelogs
license: MIT
---

## What I do
- [ ] Draft release notes from merged PRs
- [ ] Propose a version bump
```

#### Permissions
```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny"
    }
  }
}
```

### 16. Custom Tools (TypeScript/JS Files)

User-defined tools as `.ts`/`.js` files in `.opencode/tools/` or `~/.config/toadstool/tools/`.

#### Tool Definition
```typescript
// .opencode/tools/database.ts
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "Query the project database",
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
  },
  async execute(args, context) {
    const { agent, sessionID, directory, worktree } = context;
    return `Executed: ${args.query}`;
  },
});
```

Filename becomes tool name. Multiple exports create `<file>_<export>` tools.

### 17. Server / API Mode (Client-Server Architecture)

OpenCode has `opencode serve` for headless HTTP server mode. TOADSTOOL needs equivalent.

#### Architecture
```
TUI Client ────┐
Desktop App ───┼──→ HTTP Server (OpenAPI 3.1) ──→ Agent Sessions
IDE Plugin ────┤                                    ├─→ Tool Execution
Mobile App ────┘                                    ├─→ File Operations
                                                    └─→ Provider APIs
```

#### Key API Endpoints
| Category | Endpoints |
|----------|-----------|
| **Sessions** | CRUD, fork, abort, share, summarize, revert, diff |
| **Messages** | List, send (sync/async), commands, shell |
| **Config** | Get, update, providers |
| **Files** | Search, find, read, status |
| **Agents** | List available agents |
| **Events** | SSE stream for real-time updates |
| **TUI Control** | Append/submit/clear prompt, open dialogs |
| **Auth** | Set provider credentials |

#### TUI Control API (for IDE integration)
```
POST /tui/append-prompt    # Inject text into input
POST /tui/submit-prompt    # Submit current prompt
POST /tui/execute-command  # Run a slash command
POST /tui/open-models      # Open model selector
POST /tui/show-toast       # Show notification
```

### 18. CLI Non-TUI Commands

Beyond the TUI, TOADSTOOL needs these CLI subcommands:

| Command | Description |
|---------|-------------|
| `toadstool` | Launch TUI (default) |
| `toadstool run "prompt"` | Non-interactive: send prompt, print response, exit |
| `toadstool serve` | Start headless HTTP server |
| `toadstool agent create` | Interactive agent creation wizard |
| `toadstool models` | List available models |
| `toadstool version` | Show version info |

### 19. Full Input Editing (Readline/Emacs Keybindings)

OpenCode's input supports full readline-style editing. Must replicate:

#### Cursor Movement
| Key | Action |
|-----|--------|
| `Ctrl+A` | Move to start of line |
| `Ctrl+E` | Move to end of line |
| `Ctrl+B` / `Left` | Move back one character |
| `Ctrl+F` / `Right` | Move forward one character |
| `Alt+B` / `Alt+Left` | Move back one word |
| `Alt+F` / `Alt+Right` | Move forward one word |
| `Home` | Move to start of buffer |
| `End` | Move to end of buffer |

#### Text Selection
| Key | Action |
|-----|--------|
| `Shift+Left` | Select one character left |
| `Shift+Right` | Select one character right |
| `Shift+Up` | Select one line up |
| `Shift+Down` | Select one line down |
| `Alt+Shift+Left` | Select one word left |
| `Alt+Shift+Right` | Select one word right |
| `Shift+Home` | Select to start of buffer |
| `Shift+End` | Select to end of buffer |

#### Deletion
| Key | Action |
|-----|--------|
| `Ctrl+D` / `Delete` | Delete character at cursor |
| `Ctrl+K` | Kill to end of line |
| `Ctrl+U` | Kill to start of line |
| `Ctrl+W` | Kill previous word |
| `Alt+D` | Kill next word |
| `Ctrl+Shift+D` | Delete entire line |

#### Input History & Undo
| Key | Action |
|-----|--------|
| `Up` (empty input) | Previous message in history |
| `Down` | Next message in history |
| `Ctrl+Z` / `Ctrl+-` | Undo in input |
| `Ctrl+Shift+Z` / `Ctrl+.` | Redo in input |

### 20. Full Keybind Configuration (80+ Actions)

The complete configurable keybind map (all customizable via config):

```json
{
  "keybinds": {
    "leader": "ctrl+x",
    "app_exit": "ctrl+c,ctrl+d,<<leader>q",
    "sidebar_toggle": "<<leader>b",
    "session_new": "<<leader>n",
    "session_list": "<<leader>l",
    "session_compact": "<<leader>c",
    "session_interrupt": "escape",
    "session_child_cycle": "<<leader>right",
    "session_child_cycle_reverse": "<<leader>left",
    "session_parent": "<<leader>up",
    "session_export": "<<leader>x",
    "session_share": "<<leader>s",
    "session_fork": "none",
    "session_rename": "none",
    "messages_undo": "<<leader>u",
    "messages_redo": "<<leader>r",
    "messages_copy": "<<leader>y",
    "messages_page_up": "pageup",
    "messages_page_down": "pagedown",
    "messages_first": "home",
    "messages_last": "end",
    "messages_toggle_conceal": "<<leader>h",
    "model_list": "<<leader>m",
    "model_cycle_recent": "f2",
    "variant_cycle": "ctrl+t",
    "command_list": "ctrl+p",
    "agent_list": "<<leader>a",
    "agent_cycle": "tab",
    "agent_cycle_reverse": "shift+tab",
    "editor_open": "<<leader>e",
    "theme_list": "<<leader>t",
    "tool_details": "<<leader>d",
    "display_thinking": "none",
    "input_submit": "return",
    "input_newline": "shift+return,ctrl+return",
    "input_clear": "ctrl+c",
    "input_paste": "ctrl+v"
  }
}
```

### 21. Session Management (Extended)

Beyond basic CRUD, OpenCode supports:

| Feature | Description |
|---------|-------------|
| **Session forking** | Fork at a specific message point (branching conversations) |
| **Session rename** | Rename session title |
| **Session timeline** | Navigate chronological session history |
| **Session diff** | View all file changes made in a session |
| **Session summarize** | Generate summary of session (via summary agent) |
| **Session abort** | Cancel running session |
| **Child session navigation** | Cycle through subagent child sessions |
| **Auto-title generation** | Hidden title agent generates session titles |

### 22. Distribution & Installation

| Method | Command |
|--------|---------|
| **npm** | `npm i -g toadstool-ts` |
| **bun** | `bun i -g toadstool-ts` |
| **brew** | `brew install your-org/tap/toadstool` |
| **Install script** | `curl -fsSL https://toadstool.dev/install \| bash` |

#### package.json Updates Needed
```json
{
  "bin": { "toadstool": "./dist/cli.js" },
  "engines": { "bun": ">=1.0.0" },
  "files": ["dist", "README.md", "LICENSE"]
}
```

### 23. CI/CD Pipeline

| Step | Tool | Purpose |
|------|------|---------|
| **Lint** | Biome | Code formatting & lint |
| **Typecheck** | tsc | Type safety verification |
| **Unit Tests** | Vitest + Bun | Fast unit tests |
| **Integration Tests** | Vitest + Bun | Cross-module tests |
| **E2E Tests** | Vitest / Playwright | Full user flow tests |
| **Build** | tsup | Bundle to dist/ |
| **Publish** | npm publish | Release to npm |
| **Homebrew** | GitHub Release | Auto-update brew tap |

### 24. MCP Server Integration (Deep Dive)

#### MCP Server Types
| Type | Transport | Use Case |
|------|-----------|----------|
| **stdio** | stdin/stdout | Local tools (e.g., database, filesystem) |
| **sse** | HTTP Server-Sent Events | Remote services |
| **remote** | HTTP | Cloud-hosted MCP servers |

#### Configuration
```json
{
  "mcp": {
    "database": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-database"],
      "env": { "DB_URL": "{env:DATABASE_URL}" }
    },
    "browser": {
      "type": "sse",
      "url": "http://localhost:3100/sse"
    },
    "jira": {
      "type": "remote",
      "url": "https://jira.example.com/mcp",
      "enabled": false
    }
  }
}
```

#### Dynamic MCP Management
- [ ] Add/remove MCP servers at runtime via API
- [ ] MCP tools appear as agent tools with `<mcp_name>_<tool_name>` naming
- [ ] Permission control per MCP server via wildcards: `"mymcp_*": "ask"`

### 25. Model Variant Cycling

Some models have variants (e.g., thinking/non-thinking, different reasoning efforts):

| Key | Action |
|-----|--------|
| `Ctrl+T` | Cycle through model variants (thinking on/off) |
| `F2` | Cycle through recently used models |
| `Shift+F2` | Cycle reverse through recent models |

### 26. Accessibility & Terminal Compatibility

| Concern | Approach |
|---------|----------|
| **Shift+Enter support** | Document terminal configuration needed (Windows Terminal, etc.) |
| **Color contrast** | Themes must meet WCAG AA contrast ratios |
| **Screen reader** | Alt-text for visual indicators (status icons, progress) |
| **Minimum terminal size** | Graceful degradation below 60x15 |
| **Unicode support** | Fallback ASCII characters if terminal lacks unicode |
| **True color** | Detect 24-bit color support, fallback to 256-color |

### 27. Hooks System (from Claude Code)

The most powerful extensibility mechanism. User-defined shell commands, LLM prompts, or agent hooks that fire at lifecycle events.

#### Hook Events (14 types)

| Event | When It Fires | Can Block? |
|-------|--------------|-----------|
| `SessionStart` | Session begins or resumes | No |
| `UserPromptSubmit` | User submits a prompt | Yes |
| `PreToolUse` | Before a tool call executes | Yes |
| `PermissionRequest` | Permission dialog appears | Yes |
| `PostToolUse` | After a tool call succeeds | No |
| `PostToolUseFailure` | After a tool call fails | No |
| `Notification` | Notification sent | No |
| `SubagentStart` | Subagent spawned | No |
| `SubagentStop` | Subagent finishes | Yes |
| `Stop` | Agent finishes responding | Yes |
| `TaskCompleted` | Task marked complete | Yes |
| `PreCompact` | Before context compaction | No |
| `SessionEnd` | Session terminates | No |

#### Hook Types
- [ ] **Command hooks** (`type: "command"`): Run shell scripts. JSON context via stdin. Exit code controls flow.
- [ ] **Prompt hooks** (`type: "prompt"`): Send prompt to LLM for single-turn evaluation. Returns yes/no decision.
- [ ] **Agent hooks** (`type: "agent"`): Spawn subagent with tools (Read, Grep, Glob) to verify conditions.

#### Hook Configuration
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": ".toadstool/hooks/auto-lint.sh"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": ".toadstool/hooks/block-rm.sh"
      }]
    }]
  }
}
```

#### Common Use Cases
- [ ] Auto-lint after file edits
- [ ] Auto-test after file changes
- [ ] Block dangerous bash commands (rm -rf, etc.)
- [ ] Inject git status context at session start
- [ ] Auto-approve safe tool operations
- [ ] Run formatters after writes
- [ ] Validate file paths before tool execution

### 28. Checkpointing System (from Claude Code)

Automatic per-prompt snapshots independent of git. Safer and more granular than git-only undo.

#### How It Works
1. Before each user prompt, snapshot all tracked file states
2. Store snapshots with session ID + message ID
3. Persist across sessions (auto-cleanup after 30 days, configurable)
4. Only tracks files modified through agent tools (not external changes)

#### Rewind Options (`/rewind` or `Esc+Esc`)
| Option | Effect |
|--------|--------|
| Restore code + conversation | Revert both to prior point |
| Restore conversation only | Rewind messages, keep current code |
| Restore code only | Revert files, keep conversation |
| Summarize from here | Compress conversation from point, free context |

#### Storage
```
~/.config/toadstool/checkpoints/
  <session-id>/
    <message-id>/
      files.json       # File paths + hashes
      <hash>.snapshot   # File content snapshots
```

### 29. True Shell Integration (from TOAD)

Unlike other tools that just run commands, TOAD has a persistent shell where state survives between commands.

#### What This Means
- [ ] `cd /foo` then later `ls` shows `/foo` contents (state persists)
- [ ] `export FOO=bar` then `echo $FOO` shows `bar` (env vars persist)
- [ ] `htop`, `vim`, `less` work inline with full color and mouse support
- [ ] Tab completion from the shell (commands, paths, git branches)
- [ ] No flickering or garbled output from interactive commands

#### Auto-Detect Shell Mode
Configurable list of commands that auto-trigger shell mode (no `!` prefix needed):
```json
{
  "shell": {
    "auto_detect": ["ls", "cd", "pwd", "cat", "less", "git", "npm", "yarn",
                     "docker", "kubectl", "make", "cargo", "go", "python"]
  }
}
```

### 30. Prompt Suggestions (from Claude Code)

AI-generated next-step suggestions after each agent response.

#### Behavior
- [ ] Grayed-out suggestion appears in input after agent responds
- [ ] First session: based on git history (recently changed files)
- [ ] Subsequent turns: based on conversation context
- [ ] Tab to accept suggestion text, Enter to accept + submit
- [ ] Start typing to dismiss
- [ ] Reuses parent conversation's prompt cache (minimal additional cost)
- [ ] Skipped when: cache is cold, non-interactive mode, plan mode, first turn

### 31. Background Tasks (from Claude Code)

Background long-running commands while continuing to chat.

#### Usage
- [ ] `Ctrl+B` during any running command to background it
- [ ] Agent can retrieve output later via `TaskOutput` tool
- [ ] Status indicator shows running background tasks
- [ ] `/tasks` lists all background tasks
- [ ] Auto-cleanup when session ends

#### Common Backgrounded Operations
- [ ] Build tools (webpack, vite, tsup)
- [ ] Test runners (vitest, jest, pytest)
- [ ] Dev servers
- [ ] Docker operations
- [ ] Terraform/infrastructure commands

### 32. Cross-Tool Compatibility (Universal Config Loading)

TOADSTOOL must be a **drop-in replacement** for users coming from Claude Code, Cursor, Gemini CLI, or OpenCode. When users launch TOADSTOOL in a project, all their existing rules, skills, commands, hooks, and agent definitions must work immediately. No migration needed.

#### Tool Folder Structures (What Exists Today)

| Tool | Project Folder | Global Folder | Rules File |
|------|---------------|---------------|------------|
| **Claude Code** | `.claude/` | `~/.claude/` | `CLAUDE.md` |
| **Cursor** | `.cursor/` | `~/.cursor/` | `.cursorrules` (legacy) |
| **Gemini CLI** | `.gemini/` | `~/.gemini/` | `GEMINI.md` |
| **OpenCode** | `.opencode/` | `~/.config/opencode/` | `AGENTS.md` |
| **TOADSTOOL** | `.toadstool/` | `~/.config/toadstool/` | `TOADSTOOL.md` |

#### Complete Folder Discovery Map

TOADSTOOL scans all tool folders in precedence order. The first match in each category wins, but all are discovered.

**Rules/Instructions Files** (loaded in order, all combined):
```
# 1. TOADSTOOL-native (highest precedence)
TOADSTOOL.md                          # Project root
~/.config/toadstool/TOADSTOOL.md      # Global

# 2. OpenCode-compatible
AGENTS.md                              # Project root (traverse up to git root)
~/.config/opencode/AGENTS.md           # Global

# 3. Claude Code-compatible
CLAUDE.md                              # Project root (traverse up to git root)
~/.claude/CLAUDE.md                    # Global

# 4. Gemini-compatible
GEMINI.md                              # Project root (traverse up to git root)
~/.gemini/GEMINI.md                    # Global

# 5. Cursor-compatible (legacy)
.cursorrules                           # Project root
```

**Skills Discovery** (all locations scanned, merged by name):
```
.toadstool/skills/<name>/SKILL.md     # TOADSTOOL project
~/.config/toadstool/skills/*/SKILL.md # TOADSTOOL global
.opencode/skills/<name>/SKILL.md      # OpenCode project
~/.config/opencode/skills/*/SKILL.md  # OpenCode global
.claude/skills/<name>/SKILL.md        # Claude Code project
~/.claude/skills/*/SKILL.md           # Claude Code global
.cursor/skills/<name>/SKILL.md        # Cursor project (if exists)
```

**Commands Discovery:**
```
.toadstool/commands/*.md               # TOADSTOOL project
~/.config/toadstool/commands/*.md      # TOADSTOOL global
.opencode/command/*.md                 # OpenCode project (note: singular)
.claude/commands/*.md                  # Claude Code project
.cursor/commands/*.md                  # Cursor project
```

**Agents Discovery:**
```
.toadstool/agents/*.md                 # TOADSTOOL project
~/.config/toadstool/agents/*.md        # TOADSTOOL global
.opencode/agents/*.md                  # OpenCode project
.claude/agents/*.md                    # Claude Code project
.cursor/agents/*.md                    # Cursor project
```

**Hooks Discovery:**
```
.toadstool/hooks/                      # TOADSTOOL project scripts
.toadstool/settings.json               # TOADSTOOL hook config
~/.config/toadstool/settings.json      # TOADSTOOL global hooks
.claude/hooks/                         # Claude Code project scripts
.claude/settings.json                  # Claude Code hook config
~/.claude/settings.json                # Claude Code global hooks
```

**Rules Discovery (Cursor .mdc format + Claude .md):**
```
.toadstool/rules/*.md                  # TOADSTOOL project
~/.config/toadstool/rules/*.md         # TOADSTOOL global
.cursor/rules/*.mdc                    # Cursor project (parse MDC frontmatter)
.claude/rules/*.md                     # Claude Code project
```

**Settings/Config Files:**
```
toadstool.json / toadstool.jsonc       # TOADSTOOL project config
~/.config/toadstool/config.json        # TOADSTOOL global config
opencode.json / opencode.jsonc         # OpenCode project config
~/.config/opencode/opencode.json       # OpenCode global config
.gemini/settings.json                  # Gemini project config
~/.gemini/settings.json                # Gemini global config
.cursor/mcp.json                       # Cursor MCP config
```

#### Precedence Rules

1. **TOADSTOOL-native always wins** - `.toadstool/` overrides all others
2. **Explicit tool selection** - Config option to prefer a specific tool's conventions
3. **Name conflicts** - If two tools define the same skill name, TOADSTOOL's wins, then alphabetical by tool
4. **Format compatibility** - Cursor `.mdc` frontmatter is parsed and converted to internal format
5. **Disable per-tool** - Config option to disable loading from specific tool folders:
```json
{
  "compatibility": {
    "claude": true,
    "cursor": true,
    "gemini": true,
    "opencode": true,
    "disabled_tools": []
  }
}
```

#### MDC Format Support (Cursor Rules)

Cursor uses `.mdc` files with YAML-like frontmatter. TOADSTOOL must parse these:
```
---
description: TypeScript code style rules
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
---

# Code Style Rules
- [ ] Use 2-space indentation
- [ ] ...
```

Map to TOADSTOOL internal format:
- [ ] `alwaysApply: true` -> rule type `"always"`
- [ ] `globs` present -> rule type `"auto_attached"` with glob patterns
- [ ] `description` present, no globs -> rule type `"agent_requested"`

#### Gemini Context File Support

Gemini uses `GEMINI.md` with `@file.md` import syntax. TOADSTOOL parses these imports:
```markdown
# Project Rules
@docs/coding-standards.md
@docs/api-guidelines.md
```

Imported files are resolved relative to the GEMINI.md location and merged into context.

#### What This Enables

A user with this project structure:
```
my-project/
├── .claude/
│   ├── agents/code-reviewer.md
│   ├── skills/test-forge/SKILL.md
│   ├── hooks/auto-lint.sh
│   └── settings.json
├── .cursor/
│   ├── commands/build.md
│   ├── rules/code-style.mdc
│   └── mcp.json
├── .opencode/
│   └── command/plan-todo.md
├── CLAUDE.md
├── AGENTS.md
└── GEMINI.md
```

Launches TOADSTOOL and **everything just works**:
- [ ] All 3 rule files loaded and combined (CLAUDE.md + AGENTS.md + GEMINI.md)
- [ ] `code-reviewer` agent available from `.claude/agents/`
- [ ] `test-forge` skill available from `.claude/skills/`
- [ ] `build` command available from `.cursor/commands/`
- [ ] `plan-todo` command available from `.opencode/command/`
- [ ] Auto-lint hook active from `.claude/hooks/`
- [ ] MCP servers loaded from `.cursor/mcp.json`
- [ ] Cursor `.mdc` rules applied when matching file globs

### 33. Performance & Responsiveness

A daily-driver TUI must never feel slow. These are the non-negotiable performance requirements and the patterns to achieve them.

#### Terminal Resize Handling

| Problem | Solution |
|---------|----------|
| Layout thrash on resize | Debounce resize events (50ms). Batch layout recalculation. |
| Content reflow flicker | OpenTUI uses Yoga (Flexbox) which recalculates in <1ms for typical layouts. |
| Sidebar resize jank | CSS-like `flexGrow`/`flexShrink` avoids manual width calculation. |
| Minimum terminal size | Graceful degradation: hide sidebar below 80 cols, collapse footer below 60 cols, show "terminal too small" below 40 cols. |

```typescript
// Resize handler with debounce
const RESIZE_DEBOUNCE_MS = 50;

useEffect(() => {
  let timer: Timer;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { columns, rows } = process.stdout;
      store.setTerminalSize(columns, rows);
    }, RESIZE_DEBOUNCE_MS);
  };
  process.stdout.on("resize", onResize);
  return () => process.stdout.off("resize", onResize);
}, []);
```

#### Large Diff Rendering

Diffs from agent operations can be massive (10k+ lines). Rendering all at once kills performance.

| Technique | Description | When |
|-----------|-------------|------|
| **Viewport culling** | Only render visible lines + buffer above/below. OpenTUI's `<scrollbox viewportCulling={true}>`. | Always for diffs > 500 lines |
| **Lazy syntax highlighting** | Highlight only visible lines. Queue off-screen highlighting in idle callbacks. | Always |
| **Chunked rendering** | Break large diffs into 100-line chunks. Render chunk-by-chunk with requestAnimationFrame equivalent. | Diffs > 2000 lines |
| **Virtual scrolling** | Maintain virtual list of diff hunks. Only mount DOM nodes for visible hunks. | Diffs > 5000 lines |
| **Diff computation offloading** | Compute diffs in a Worker thread. Stream hunks to main thread. | Files > 1MB |
| **Progressive loading** | Show first 500 lines immediately, load rest in background. "Loading more..." indicator. | Diffs > 1000 lines |

```typescript
// Virtual scrolling for large diffs
function LargeDiffViewer({ diff, filetype }: { diff: string; filetype: string }) {
  const lines = useMemo(() => diff.split("\n"), [diff]);
  const VIEWPORT_BUFFER = 50; // Lines above/below viewport to pre-render

  return (
    <scrollbox
      viewportCulling={true}
      stickyScroll={false}
      style={{ flexGrow: 1 }}
    >
      <diff
        diff={diff}
        filetype={filetype}
        view="split"
        showLineNumbers={true}
      />
    </scrollbox>
  );
}
```

#### Background Threading & Worker Offloading

The main thread must never block for more than 16ms (60fps target). Heavy work goes to workers.

| Operation | Thread | Pattern |
|-----------|--------|---------|
| **Diff computation** | Worker | `new Worker("diff-worker.ts")` computes diffs, posts hunks back |
| **Syntax highlighting** | Worker | Tree-sitter parsing in worker, highlighted tokens posted back |
| **File search (ripgrep)** | Subprocess | Already async via `@vscode/ripgrep` |
| **Token counting** | Worker | Tokenizer runs in worker for large contexts |
| **SQLite persistence** | Worker | Already using `sqlite-worker` pattern |
| **Git operations** | Subprocess | `simple-git` runs git as child process |
| **Checkpoint creation** | Worker | File hashing + snapshot in background |
| **Compaction** | Async | LLM call is naturally async |
| **MCP tool execution** | Subprocess | Each MCP server runs in its own process |

```typescript
// Worker thread pattern for expensive operations
// src/workers/diff-worker.ts
import { parentPort } from "worker_threads";
import { createPatch } from "diff";

parentPort?.on("message", ({ oldContent, newContent, filePath }) => {
  const patch = createPatch(filePath, oldContent, newContent);
  parentPort?.postMessage({ type: "diff-result", patch, filePath });
});
```

#### Scroll Performance

| Technique | Description |
|-----------|-------------|
| **Sticky scroll** | `stickyScroll={true}` with `stickyStart="bottom"` - auto-scroll to bottom during streaming |
| **Scroll acceleration** | `scrollAcceleration={2.5}` - faster scroll for large content (OpenTUI native) |
| **Viewport culling** | Only render visible messages + buffer. Critical for 100+ message conversations. |
| **Pixel-level scrolling** | OpenTUI supports sub-cell scrolling for smooth movement |
| **Scroll position memory** | Remember scroll position per-conversation. Restore on switch. |
| **Manual scroll detection** | If user scrolls up, disable sticky scroll. Re-enable when user scrolls to bottom. |

#### Streaming Performance (60fps Target)

LLM responses stream token-by-token. Rendering each token individually causes jank.

| Technique | Description |
|-----------|-------------|
| **Batch buffer** | Collect tokens for 16ms (one frame), render batch. Never render individual tokens. |
| **Markdown incremental parse** | Don't re-parse entire content on each token. Maintain parser state, append incrementally. |
| **Backpressure** | If render queue > 10 chunks, pause reading from stream. Resume when queue drains. |
| **Content hash skip** | Skip re-render if content hash unchanged (dedup rapid identical updates). |
| **Partial screen update** | OpenTUI only redraws changed regions, not full screen. |

```typescript
// Streaming buffer with frame-aligned rendering
const FRAME_MS = 16; // 60fps
let buffer = "";
let frameTimer: Timer | null = null;

function onStreamToken(token: string) {
  buffer += token;
  if (!frameTimer) {
    frameTimer = setTimeout(() => {
      store.appendToCurrentMessage(buffer);
      buffer = "";
      frameTimer = null;
    }, FRAME_MS);
  }
}
```

#### Memory Management for Long Conversations

| Concern | Solution |
|---------|----------|
| **Message list bloat** | Virtualize: only keep visible + buffer messages in React tree. Older messages in Zustand store but unmounted. |
| **Tool output retention** | After compaction, replace large tool outputs with summaries. Keep originals in SQLite only. |
| **Image/media cleanup** | Base64 images stored in SQLite, not in-memory. Load on demand when scrolled into view. |
| **Session switching** | On switch, unmount previous session's message components. Zustand slice remains but React tree is minimal. |
| **Context window tracking** | Token count per message cached. Total context shown in footer. Warning at 80% capacity. |
| **Garbage collection** | Explicit cleanup of detached event listeners, timers, and stream subscriptions on session end. |

```typescript
// Virtualized message list
function VirtualMessageList({ sessionId }: { sessionId: string }) {
  const messages = useAppStore(s => s.sessions[sessionId]?.messages ?? []);
  const visibleRange = useVisibleRange(); // Custom hook tracking scroll position

  return (
    <scrollbox stickyScroll={true} stickyStart="bottom" viewportCulling={true}>
      {messages.map((msg, i) => {
        // Only render full content for visible messages
        const isVisible = i >= visibleRange.start - BUFFER && i <= visibleRange.end + BUFFER;
        return isVisible
          ? <MessageItem key={msg.id} message={msg} />
          : <MessagePlaceholder key={msg.id} height={msg.estimatedHeight} />;
      })}
    </scrollbox>
  );
}
```

#### Performance Budgets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| App startup | < 200ms p50, < 500ms p95 | Time from `toadstool` to first paint |
| Session load | < 100ms p50, < 300ms p95 | Time from session switch to messages visible |
| Stream chunk render | < 16ms p50, < 50ms p95 | Frame time during streaming |
| Token optimization | < 50ms p50, < 200ms p95 | Time for context compaction |
| Resize reflow | < 50ms p50 | Time from resize event to stable layout |
| Large diff display | < 200ms for first visible chunk | Time to show first viewport of 10k-line diff |
| Keyboard input latency | < 8ms p50 | Time from keypress to character display |
| File picker open | < 100ms p50 | Time from `@` press to picker visible |
| Scroll frame time | < 16ms (60fps) | No dropped frames during scroll |

#### Performance Monitoring

Built-in performance telemetry (opt-in, local only):

```typescript
// Performance marks for critical paths
performance.mark("stream-chunk-start");
// ... render chunk ...
performance.mark("stream-chunk-end");
performance.measure("stream-chunk", "stream-chunk-start", "stream-chunk-end");

// /stats command shows p50/p95/p99 for all operations
// /debug shows real-time frame timing
```

---

## OpenTUI Framework Migration (Approved)

### What is OpenTUI?

OpenTUI is the TypeScript TUI framework that powers OpenCode itself. It provides:

- [ ] **Flexbox Layout** - Yoga-powered CSS-like positioning
- [ ] **Tree-sitter Syntax Highlighting** - Native code rendering (replaces Shiki)
- [ ] **Rich Components** - Text, Box, Input, Select, Textarea, ScrollBox, ScrollBar, Slider, Code, Markdown, Diff, LineNumbers, FrameBuffer, ASCIIFont, TabSelect
- [ ] **React Reconciler** - `@opentui/react` with JSX intrinsic elements
- [ ] **Keyboard/Focus** - Built-in focus management via `useKeyboard()` hook
- [ ] **Animations** - Timeline API via `useTimeline()` hook
- [ ] **Streaming Mode** - First-class support on Code, Markdown, and Diff components

### Packages

```
@opentui/core   - Imperative API + primitives (required)
@opentui/react  - React reconciler with JSX intrinsics (our binding)
```

### Why Migrate Now

The migration eliminates **~1000+ lines of complex custom rendering code** and replaces it with battle-tested components that OpenCode itself uses:

| TOADSTOOL Today | Lines | OpenTUI Replacement | Benefit |
|---|---|---|---|
| `DiffRenderer.tsx` (custom parser + renderer) | 493 | `<diff>` intrinsic | Split/unified view, syntax highlighting, line numbers |
| `MarkdownRenderer.tsx` (Shiki + marked) | 120+ | `<markdown>` intrinsic | Tree-sitter, streaming mode, concealment |
| `ScrollArea.tsx` (custom) | ~80 | `<scrollbox>` intrinsic | Sticky scroll, viewport culling, scroll acceleration |
| Input components + autocomplete | ~300 | `<input>` + `<textarea>` | Focus states, placeholder, events built-in |
| Syntax highlighting (Shiki, async) | scattered | Tree-sitter (native, instant) | No async loading, better performance |
| Terminal dimensions (custom hook) | ~30 | `useTerminalDimensions()` | Built-in, reactive |
| Keyboard handling (useInput from Ink) | custom | `useKeyboard()` | Key release events, better API |

### What Changes

**Runtime:** Node.js + npm -> **Bun** (OpenTUI requirement)

**Entry point:**
```typescript
// BEFORE (Ink)
import { render } from "ink";
render(<App />);

// AFTER (OpenTUI)
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<App />);
```

**JSX primitives (lowercase intrinsics):**
```typescript
// BEFORE (Ink)
import { Box, Text } from "ink";
<Box flexDirection="column" borderStyle="round">
  <Text color="green">Hello</Text>
</Box>

// AFTER (OpenTUI React)
<box style={{ flexDirection: "column", border: true }}>
  <text fg="#00FF00">Hello</text>
</box>
```

**TypeScript config:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react"
  }
}
```

**Dependencies removed:** `ink`, `@inkjs/ui`, `ink-picture`, `ink-tab`, `shiki`, `marked`, `marked-terminal`
**Dependencies added:** `@opentui/core`, `@opentui/react`

### What Does NOT Change

- [ ] **All React hooks** (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`)
- [ ] **Zustand store** (`app-store.ts`, all store/ logic)
- [ ] **All business logic** (`core/`, `utils/`, `types/`, `constants/`, `harness/`)
- [ ] **All non-UI tests** (68 unit + 14 integration tests)
- [ ] **TypeScript strict mode**, Zod schemas, branded types, constants architecture
- [ ] **ACP protocol**, session streaming, persistence, credential stores

### Component Migration Map

| Ink Component | OpenTUI JSX | Notes |
|---|---|---|
| `<Box>` | `<box>` | Props move to `style={}` object |
| `<Text>` | `<text>` | `color` -> `fg`, `backgroundColor` -> `bg` |
| `<Text bold>` | `<strong>` or `<b>` | Semantic elements available |
| Ink `useInput()` | `useKeyboard()` | Different event shape, release events supported |
| Ink `useFocus()` | Component `focused` prop | Focus managed per-component |
| `@inkjs/ui` Select | `<select>` | Built-in selection list |
| `ink-tab` | `<tab-select>` | Built-in tab navigation |
| Custom `ScrollArea` | `<scrollbox>` | stickyScroll, viewportCulling, scrollAcceleration |
| Custom `MarkdownRenderer` | `<markdown>` | streaming, concealment, tree-sitter |
| Custom `DiffRenderer` | `<diff>` | split/unified, syntax highlighting, line numbers |
| Custom syntax highlight | `<code>` | tree-sitter, streaming mode, selectable |
| `ink-picture` | `<ascii-font>` (partial) | ASCII art text available; image rendering TBD |

### Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OpenTUI not production-ready | MEDIUM | It powers OpenCode (100k+ stars); actively maintained |
| Bun runtime switch | MEDIUM | Bun is Node-compatible; most deps work unchanged |
| React reconciler gaps | LOW | `@opentui/react` tested via OpenCode itself |
| API breaking changes | MEDIUM | Pin version, monitor releases, contribute fixes upstream |
| Zig build requirement | LOW | Only for building from source; we use npm packages |
| Vitest with Bun | LOW | Vitest supports Bun runner; tests should work |

---

## Architecture Recommendations

### 1. Tool System Architecture (Critical Path)

TOADSTOOL needs a proper tool registry that mirrors OpenCode's approach:

```
src/tools/
├── registry.ts          # Tool registry (register, discover, execute)
├── types.ts             # Tool interfaces (ToolDefinition, ToolContext, ToolResult)
├── builtin/
│   ├── bash.ts          # Shell command execution
│   ├── read.ts          # File reading (with line ranges)
│   ├── write.ts         # File creation/overwrite
│   ├── edit.ts          # String replacement edits
│   ├── patch.ts         # Diff patch application
│   ├── grep.ts          # Regex search (ripgrep)
│   ├── glob.ts          # File pattern matching
│   ├── list.ts          # Directory listing
│   ├── todowrite.ts     # Task list management
│   ├── todoread.ts      # Task list query
│   ├── webfetch.ts      # Web content fetching
│   ├── question.ts      # User question tool
│   └── skill.ts         # Skill file loading
└── custom/
    └── loader.ts        # Load user-defined tools from config
```

### 2. Agent Execution Engine

```
src/agents/
├── agent-manager.ts     # Agent lifecycle management
├── agent-config.ts      # JSON + Markdown config loading
├── builtin/
│   ├── build.ts         # Default full-access agent
│   ├── plan.ts          # Read-only analysis agent
│   ├── compaction.ts    # Hidden context compactor
│   ├── title.ts         # Hidden title generator
│   └── summary.ts       # Hidden summary generator
└── subagent/
    ├── general.ts       # Multi-step task agent
    ├── explore.ts       # Fast read-only agent
    └── runner.ts        # Subagent execution runtime
```

### 3. Configuration System Overhaul

```
src/config/
├── config-loader.ts     # Multi-source config loading with precedence
├── config-schema.ts     # Zod schema matching OpenCode's config.json
├── config-merger.ts     # Deep merge with override rules
├── variable-resolver.ts # {env:VAR} and {file:path} substitution
└── sections/
    ├── tui.ts
    ├── agents.ts
    ├── tools.ts
    ├── providers.ts
    ├── keybinds.ts
    ├── themes.ts
    ├── commands.ts
    ├── permissions.ts
    └── mcp.ts
```

### 4. Event Bus

OpenCode uses an event bus for decoupled communication. TOADSTOOL should add one:

```
src/bus/
├── bus.ts               # Typed event bus (publish/subscribe)
├── bus-event.ts         # Event definitions with Zod schemas
└── events/
    ├── session.ts       # Session lifecycle events
    ├── message.ts       # Message events
    ├── tool.ts          # Tool execution events
    ├── todo.ts          # Todo update events
    └── agent.ts         # Agent switch events
```

---

## Implementation Roadmap

### Phase 4: OpenTUI Migration & Code Quality (2-3 weeks)

**Goal:** Migrate from Ink to OpenTUI React, fix code quality issues simultaneously.

The migration and cleanup happen together because many of the components being rewritten
(DiffRenderer, MarkdownRenderer, ScrollArea) are the same ones that have the worst
code quality issues. Rewriting them with OpenTUI intrinsics fixes both problems at once.

#### 4A: Runtime & Build Migration (3-5 days)

- [X] Install Bun: `curl -fsSL https://bun.sh/install | bash`
- [X] Convert `package.json` scripts from `npm` to `bun`
- [X] Run `bun install` to generate `bun.lock` (keep `package-lock.json` temporarily)
- [X] Verify `bun run build` works with tsup
- [X] Verify `bun run test` works with Vitest
- [X] Verify `bun run typecheck` works with tsc
- [X] Install OpenTUI: `bun add @opentui/core @opentui/react`
- [X] Remove Ink deps: `bun remove ink @inkjs/ui ink-picture ink-tab`
- [X] Remove rendering deps: `bun remove shiki marked marked-terminal`
- [X] Update `tsconfig.json`: set `jsxImportSource: "@opentui/react"`
- [X] Update `src/cli.ts` entry point: `createCliRenderer()` + `createRoot()`
- [ ] Verify the app starts with a blank screen (smoke test)

#### 4B: Core Component Migration (5-7 days)

Rewrite components from Ink to OpenTUI React intrinsics. Business logic stays,
only rendering primitives change.

**Layout primitives (all 30 components):**
- [X] Global find-replace: `import { Box, Text } from "ink"` -> OpenTUI intrinsics
- [X] Convert `<Box>` -> `<box>`, `<Text>` -> `<text>` throughout
- [X] Convert `<Text color="green">` -> `<text fg="#00FF00">` (use COLOR constants)
- [X] Convert `<Box borderStyle="round">` -> `<box style={{ border: true }}>`
- [X] Convert `useInput()` (Ink) -> `useKeyboard()` (OpenTUI) in all hooks

**High-value replacements:**
- [X] Replace `DiffRenderer.tsx` (493 lines) with `<diff>` intrinsic (~30 lines)
- [X] Replace `MarkdownRenderer.tsx` with `<markdown>` intrinsic (~20 lines)
- [X] Replace `ScrollArea.tsx` with `<scrollbox>` (stickyScroll for chat!)
- [X] Replace custom `Input.tsx` with `<input>` / `<textarea>` intrinsics
- [X] Replace `@inkjs/ui` Select usage with `<select>` intrinsic
- [X] Replace `ink-tab` usage with `<tab-select>` intrinsic
- [X] Replace `AsciiBanner.tsx` with `<ascii-font>` intrinsic
- [X] Update `AgentSelect.tsx` to use `<select>`
- [X] Update `CommandPalette.tsx` to use `<select>`
- [X] Update `SessionsPopup.tsx` to use `<select>` + `<box>`
- [ ] Replace remaining custom selects with `<select>` intrinsic (AgentSelect, CommandPalette, SessionsPopup)
- [ ] Replace sidebar tabs with `<tab-select>` intrinsic
- [ ] Replace `InputWithAutocomplete` multiline mode with `<textarea>` intrinsic
- [ ] Audit OpenTUI best practices (focus, autoFocus, scrollbox, styling)
- [ ] Validate OpenTUI input/textarea feature parity (mouse selection, word select, copy/paste)
- [ ] Implement missing text editing shortcuts (kill ring, word jump, selection extend)

**Hook migration:**
- [X] `useTerminalDimensions.ts` -> OpenTUI `useTerminalDimensions()`
- [X] `useAppKeyboardShortcuts.ts` -> OpenTUI `useKeyboard()`
- [X] All other hooks: update any Ink-specific imports

#### 4C: Code Quality Cleanup (3-5 days)

Fix remaining issues in migrated and non-migrated code:

**Magic numbers -> constants:**
- [X] Extract all magic numbers to `src/config/ui.ts` and `src/config/limits.ts`
- [X] Add UI layout constants: `SIDEBAR_WIDTH_RATIO`, `SIDEBAR_FILES_RATIO`, etc.
- [X] Add LIMIT constants: `FILE_TREE_PADDING`, `MARKDOWN_COLLAPSE_AFTER`, etc.
- [X] Add TIMEOUT constants: `STREAM_BUFFER_MS`, `MENTION_DEBOUNCE_MS`

**Magic strings -> constants:**
- [X] Fix `"disconnected"` and `"files"` literals in `app-store.ts`
- [X] Add `COLOR.DIFF_ADDED_BG`, `COLOR.DIFF_REMOVED_BG`, `COLOR.DIFF_HUNK_BG`
- [X] Add `IGNORE_PATTERN` constant for file tree / project files
- [X] Add `SIDEBAR_TAB` constant for sidebar tab names
- [X] Extract Chat.tsx error message strings to constants

**Type safety:**
- [X] Reduce `as` type assertions by improving discriminated union narrowing
- [X] Replace `!` non-null assertions with proper null checks / optional chaining
- [X] Add bounds checking for array access in MessageItem, Sidebar
- [X] Add error handling to FileTree.tsx `buildTree` function

**Component structure:**
- [X] Split `ToolCallManager.tsx` (575 lines) -> ToolCallItem, ToolCallStatus, ToolCallResult
- [X] Split `Chat.tsx` (479 lines) -> extract SlashCommandHandler, MessageSender
- [X] Split `MessageItem.tsx` (476 lines) -> extract ContentBlockRenderer, ThinkingBlock
- [X] Ensure no file exceeds 300 lines

#### 4D: Performance Foundations (2-3 days)

Establish performance patterns during migration while components are being rewritten:

- [X] Implement resize debounce handler (50ms debounce, batch Zustand updates)
- [X] Add `viewportCulling={true}` to all `<scrollbox>` components
- [X] Implement streaming buffer (16ms batch, not per-token rendering)
- [X] Add `stickyScroll={true}` + manual scroll detection for message list
- [X] Set up Worker thread for diff computation (`src/workers/diff-worker.ts`)
- [X] Add performance.mark/measure for critical paths (startup, session load, stream render)
- [X] Implement message list virtualization (only mount visible + buffer messages)
- [X] Add progressive diff loading (first 500 lines immediate, rest in background)
- [X] Memory: unmount previous session's React tree on session switch

#### 4E: Test Migration & Verification (2-3 days)

- [ ] Update UI unit tests for OpenTUI (replace `ink-testing-library`)
- [ ] Update UI integration tests for new component structure
- [ ] Verify all non-UI tests pass unchanged with Bun
- [ ] Run full quality gate: `bun run lint && bun run typecheck && bun run test && bun run build`
- [ ] Manual smoke test: launch app, send message, verify streaming renders correctly
- [ ] Verify DiffRenderer replacement renders diffs correctly
- [ ] Verify MarkdownRenderer replacement renders code blocks correctly
- [ ] Performance smoke test: verify < 200ms startup, < 16ms stream frame time
- [ ] Verify ScrollBox sticky scroll works for chat auto-scroll

### Phase 5: Tool System & Shell Integration (2-3 weeks)

**Goal:** Full tool registry, built-in tools, and TOAD-quality shell integration.

- [X] Create `src/tools/types.ts` - ToolDefinition, ToolContext, ToolResult interfaces
- [X] Create `src/tools/registry.ts` - Registration, discovery, execution
- [X] Implement `bash` tool - Leverage existing TerminalHandler
- [X] **True shell integration (from TOAD):**
  - [X] Persistent shell state (cd, env vars survive between commands)
  - [X] Interactive app support (htop, vim, etc.) with full color + mouse
  - [X] Shell tab completion (Tab to complete, Tab again to cycle)
  - [X] Auto-detect shell commands (configurable command list triggers shell mode without `!`)
- [X] Implement `read` tool - File reading with line range support
- [X] Implement `write` tool - File creation with permission checks
- [X] Implement `edit` tool - String replacement with exact match
- [X] Implement `grep` tool - Leverage existing SearchService (ripgrep)
- [X] Implement `glob` tool - File pattern matching
- [X] Implement `list` tool - Directory listing with ignore patterns
- [X] Implement `todowrite` / `todoread` tools
- [X] Implement `webfetch` tool
- [X] Implement `question` tool
- [X] Wire tools to ACP agent port for tool execution
- [X] Add tool permission enforcement per agent
- [X] **Background tasks (from Claude Code):**
  - [X] Ctrl+B to background running commands
  - [X] TaskOutput tool to retrieve background results
  - [X] Status indicator for running background tasks
- [ ] Tests: unit + integration for each tool

### Phase 6: Agent Execution Engine (2-3 weeks)

**Goal:** Full agent system with build/plan/subagents.

- [X] Create agent-manager.ts - Agent lifecycle (create, switch, destroy)
- [X] Implement Build agent - Full tool access
- [X] Implement Plan agent - Read-only, asks permission for edits/bash
- [X] Add Tab key agent switching in TUI (via `useKeyboard()`)
- [X] Create Markdown agent config loader (`.opencode/agents/*.md`)
- [X] Implement per-agent tool/permission overrides
- [X] Implement per-agent model/temperature config
- [X] Add hidden agents: Compaction, Title, Summary
- [X] Implement subagent runner for @mention invocation
- [X] Implement child session navigation (Leader+Left/Right)
- [X] Add `@agent` mention syntax in input
- [ ] Tests: unit + integration

### Phase 7: Slash Commands & UX Polish (2 weeks)

**Goal:** Feature parity with OpenCode + Claude Code commands, plus TOAD UX touches.

- [X] Implement `/connect` - Provider setup flow
- [X] Implement `/compact` - Context compaction trigger
- [X] Implement `/details` - Toggle tool execution details
- [X] Implement `/editor` - Open `$EDITOR` for composing messages
- [X] Implement `/models` - List and switch models
- [X] Implement `/new` - New session (enhance `/clear`)
- [X] Implement `/sessions` - List and switch sessions
- [X] Implement `/themes` - Theme selection
- [X] Implement `/thinking` - Toggle thinking block display
- [ ] Implement `!` prefix for bash command execution
- [ ] Add Tab autocomplete for slash commands
- [X] **From Claude Code:**
  - [X] Implement `/doctor` - Health check (validate config, providers, tools)
  - [X] Implement `/debug` - Read session debug log, troubleshoot
  - [X] Implement `/context` - Colored grid visualization of context usage
  - [X] Implement `/stats` - Daily usage, session history, streaks, model preferences
  - [X] Implement `/cost` - Token usage tracking per session
  - [X] Implement `/memory` - Edit AGENTS.md/CLAUDE.md from TUI
  - [X] Implement `/rename` - Rename current session
  - [X] Implement `/copy` - Copy last response to clipboard
  - [X] Implement `/rewind` - Rewind code, conversation, or both (with summarize option)
- [ ] **From TOAD:**
  - [ ] Simple settings TUI (not just JSON editing)
  - [ ] SVG export of conversations
- [ ] **From Claude Code (additional parity):**
  - [ ] Implement `/review` - AI code review command
  - [ ] Implement `/security-review` - Security review command
  - [ ] Implement `/add-dir` - Add directories to session context
  - [ ] Implement `/permissions` - Manage tool permissions
  - [ ] Implement `/status` - System health/status
  - [ ] Implement `/login` - Auth flow entrypoint
  - [ ] Implement `/config` - Open config panel
- [ ] **Input UX parity (OpenTUI + TOAD):**
  - [ ] Mouse-based text selection in input/textarea
  - [ ] Word selection and double-click selection
  - [ ] Clipboard copy/paste hooks
  - [ ] Modern shortcuts (word jump, line select, kill/yank)
  - [ ] Selection highlight + visible cursor/selection state
- [ ] Update command definitions constant

### Phase 8: Checkpointing & Undo/Redo (1-2 weeks)

**Goal:** Hybrid checkpoint system combining Claude Code's per-prompt checkpoints with git-based undo.

- [X] **Checkpointing system (from Claude Code):**
  - [X] Automatic per-prompt snapshots (independent of git)
  - [X] Track all file changes made by agent tools
  - [X] Checkpoint persistence across sessions
  - [ ] Auto-cleanup of old checkpoints (configurable, default 30 days)
- [X] **Rewind UI (from Claude Code):**
  - [X] `/rewind` command with 4 options:
    - Restore code and conversation
    - Restore conversation only
    - Restore code only
    - Summarize from selected point
  - [X] `Esc+Esc` shortcut to open rewind menu
- [X] **Git integration (from OpenCode):**
  - [X] `/undo` - Revert last message and file changes
  - [X] `/redo` - Restore undone changes
  - [ ] Git stash/apply mechanism for clean undo/redo
- [ ] Handle edge cases: uncommitted changes, merge conflicts
- [X] Show checkpoint/undo state in status footer
- [ ] Tests: unit + integration + e2e

### Phase 9: Configuration & Keybind System (1-2 weeks)

**Goal:** Full configuration with leader key keybinds, hooks, and themes.

- [ ] Create config schema (compatible with OpenCode + Claude Code patterns)
- [X] Implement multi-source config loading (global, project, env)
- [ ] Implement config merging with precedence order
- [X] Add variable substitution: `{env:VAR}`, `{file:path}`
- [ ] Add per-project `toadstool.json` support
- [ ] Create Zod schema for validation
- [ ] **Leader key keybinds (from OpenCode):**
  - [ ] Configurable leader key (default: `Ctrl+X`)
  - [ ] 80+ configurable keybind actions
  - [X] Keybind editor in settings TUI
- [ ] **Vim editor mode (from Claude Code):**
  - [X] Full vim keybindings in input (h/j/k/l, w/e/b, d/c/y, text objects)
  - [ ] Toggle via `/vim` command or config
- [ ] **Permission modes (from Claude Code):**
  - [ ] Auto-Accept, Plan, Normal modes
  - [X] `Shift+Tab` to cycle between modes
  - [ ] Per-tool permission rules with glob patterns
- [X] **Hooks system (from Claude Code):**
  - [X] SessionStart, PreToolUse, PostToolUse, PermissionRequest, Stop hooks
  - [X] Command hooks (shell scripts), Prompt hooks (LLM evaluation)
  - [X] Matcher patterns (regex on tool names, event types)
  - [X] `/hooks` management menu
- [ ] Add theme files with SyntaxStyle definitions (from OpenCode)
- [ ] Add custom commands (`.opencode/commands/` equivalent)
- [ ] Tests for config, keybinds, hooks, permissions

### Phase 10: Compaction & Context Management (1-2 weeks)

**Goal:** Prevent context overflow in long conversations.

- [ ] Implement context window tracking (token counting)
- [X] Create compaction agent (hidden, summarizes old messages)
- [ ] Implement auto-compaction when context approaches limit
- [X] Implement manual compaction via `/compact`
- [ ] Add pruning of old tool outputs to save tokens
- [X] Show context usage in status footer
- [ ] Config options: `compaction.auto`, `compaction.prune`

### Phase 11: Session Management, Sharing & Export (1-2 weeks)

**Goal:** Full session management from all three inspirations.

- [X] **Session sharing (from OpenCode):**
  - [X] `/share` - Generate shareable URL
  - [X] `/unshare` - Remove shared session
  - [ ] Browser-viewable shared sessions
- [X] **Session export (combined):**
  - [X] `/export` - Export to Markdown file
  - [ ] SVG export (from TOAD) - Beautiful conversation SVGs
- [ ] **Extended session features (from Claude Code):**
  - [ ] Session forking (`--fork-session` from any point)
  - [X] Session naming (`/rename`)
  - [ ] Session resume by name or ID
  - [ ] `--from-pr` flag (resume sessions linked to PRs)
  - [ ] Auto-title generation (via hidden title agent)
- [ ] **Workspace management (multi-repo):**
  - [ ] Add/remove workspace roots
  - [ ] Switch active workspace in TUI
  - [ ] Persist per-workspace settings + recent list
  - [ ] Workspace indicator in status/footer
  - [ ] Context attachments scoped per workspace
- [ ] **Block navigation (from TOAD):**
  - [ ] Cursor through conversation blocks like Jupyter cells
  - [ ] Per-block actions: copy, re-send, export
- [ ] **Session diff (from OpenCode):**
  - [ ] View all file changes made in a session
  - [ ] Per-message diff view
- [ ] Add share state tracking per session
- [ ] Config options: `share: "manual" | "auto" | "disabled"`
- [ ] **Session storage & retention (parity + reliability):**
  - [ ] Define storage contract (port) for sessions/messages/parts
  - [ ] Implement SQLite adapter (primary)
  - [ ] Implement JSON adapter (fallback)
  - [ ] Add adapter selection + migration path
  - [ ] Add retention policy (TTL + max sessions/bytes)
  - [ ] Background cleanup job (scheduled + on-start)
  - [ ] Compaction policy for long sessions (summaries + pruning)
  - [ ] Indexing for fast session lookup and search
  - [ ] Integrity checks + orphan cleanup tooling
  - [ ] Config options: `retention.max_sessions`, `retention.max_bytes`, `retention.ttl_days`

### Phase 12: Provider Expansion (2 weeks)

**Goal:** Support more LLM providers beyond Claude CLI.

- [ ] Add Anthropic API adapter (direct API, not CLI)
- [ ] Add OpenAI API adapter (direct API, not CLI)
- [X] Add Google Gemini provider adapter
- [ ] Add Ollama/local model support via OpenAI-compatible API
- [X] Add `/connect` flow for provider API key management
- [ ] Implement `small_model` for lightweight tasks
- [ ] Implement provider-specific options (baseURL, timeout, headers)
- [ ] Add `enabled_providers` / `disabled_providers` config
- [ ] Add provider model catalog (load `/v1/models` from Anthropic/OpenAI)
- [ ] Store model IDs in `src/constants/provider-models.ts` with refresh task
- [ ] **Popular provider adapters:**
  - [ ] Azure OpenAI
  - [ ] AWS Bedrock (Anthropic/OpenAI-compatible)
  - [ ] Google Vertex AI (Anthropic/OpenAI-compatible)
  - [ ] Mistral
  - [ ] Cohere
  - [ ] Groq
  - [ ] Perplexity
  - [ ] xAI
  - [ ] Together
  - [ ] Fireworks
  - [ ] OpenRouter
- [ ] Tests for each provider

### Phase 13: Cross-Tool Compatibility & Rules System (2-3 weeks)

**Goal:** Universal config loader that reads from ALL tool folder conventions. Zero migration needed.

- [X] **Universal rules loader (TOADSTOOL.md / AGENTS.md / CLAUDE.md / GEMINI.md):**
  - [X] Traverse up from cwd to git root for all rule files
  - [X] Load from global locations (~/.config/toadstool/, ~/.claude/, ~/.gemini/)
  - [X] Combine all rules with precedence (TOADSTOOL > AGENTS > CLAUDE > GEMINI)
  - [X] Parse Gemini `@file.md` import syntax
- [ ] **Universal skills loader:**
  - [ ] Scan `.toadstool/skills/`, `.claude/skills/`, `.opencode/skills/`, `.cursor/skills/`
  - [ ] Scan global: `~/.config/toadstool/skills/`, `~/.claude/skills/`
  - [ ] SKILL.md frontmatter parsing and validation
  - [ ] `skill` tool for on-demand loading by agents
  - [ ] Skill permissions (allow/deny/ask with glob patterns)
- [ ] **Resources system (skills/resources/commands parity):**
  - [ ] Resource registry + loader (local + remote)
  - [ ] Resource picker UI in TUI
  - [ ] `resource` tool for on-demand loading
- [ ] **Universal commands loader:**
  - [ ] Scan `.toadstool/commands/`, `.claude/commands/`, `.cursor/commands/`, `.opencode/command/`
  - [ ] Parse command .md files, register as slash commands
- [ ] **Universal agents loader:**
  - [ ] Scan `.toadstool/agents/`, `.claude/agents/`, `.cursor/agents/`, `.opencode/agents/`
  - [ ] Parse YAML frontmatter + Markdown body
  - [ ] Register as selectable agents
- [ ] **Universal hooks loader:**
  - [ ] Scan `.toadstool/hooks/`, `.claude/hooks/`
  - [ ] Load hook config from `.toadstool/settings.json`, `.claude/settings.json`
  - [ ] Register and execute hooks at lifecycle events
- [ ] **Cursor .mdc rule format parser:**
  - [ ] Parse MDC frontmatter (description, globs, alwaysApply)
  - [ ] Map to internal rule types (always, auto_attached, agent_requested)
  - [ ] Load `.cursor/rules/*.mdc` files
- [ ] **MCP config merger:**
  - [ ] Load from `.cursor/mcp.json`, `.toadstool/mcp.json`
  - [ ] Merge MCP server configs with dedup
- [ ] **Config compatibility options:**
  - [ ] `compatibility.claude`, `compatibility.cursor`, `compatibility.gemini`, `compatibility.opencode`
  - [ ] `compatibility.disabled_tools` array to exclude specific tool folders
- [ ] **Custom tool files:**
  - [ ] Load `.opencode/tools/*.ts` and `.toadstool/tools/*.ts`
  - [ ] `tool()` helper with Zod schema args and context
  - [ ] Multi-export tool files (`<file>_<export>` naming)
- [ ] `/init` command (scan project, generate TOADSTOOL.md)
- [ ] `instructions` config array (files, globs, remote URLs)
- [ ] Tests for every loader (rules, skills, commands, agents, hooks, tools)

### Phase 14: Server Mode & Headless CLI (2-3 weeks)

**Goal:** HTTP server (from OpenCode) + headless SDK mode (from Claude Code).

- [ ] **Server mode (from OpenCode):**
  - [X] `toadstool serve` - Headless HTTP server
  - [ ] OpenAPI 3.1 spec generation
  - [ ] Session CRUD endpoints (list, create, delete, fork, abort)
  - [ ] Message endpoints (send sync/async, list, shell commands)
  - [ ] Config endpoints (get, update, providers)
  - [ ] File endpoints (search, find, read, status)
  - [ ] SSE event stream for real-time updates
  - [ ] TUI control API (append-prompt, submit, open dialogs)
  - [ ] Basic auth support (`TOADSTOOL_SERVER_PASSWORD`)
- [ ] **Headless/SDK mode (from Claude Code):**
  - [ ] `toadstool -p "prompt"` - Print mode (query, respond, exit)
  - [ ] `cat file | toadstool -p "query"` - Piped input
  - [ ] `--output-format json|stream-json|text` for structured output
  - [ ] `--json-schema` for validated JSON responses
  - [ ] `--max-budget-usd` spending limit
  - [ ] `--max-turns` turn limit
  - [ ] `--allowedTools` for auto-approval in CI
  - [ ] `--append-system-prompt` for custom instructions
  - [ ] `--fallback-model` for overloaded servers
- [ ] **Additional CLI subcommands:**
  - [ ] `toadstool agent create` - Agent creation wizard
  - [ ] `toadstool models` - List available models
  - [ ] `toadstool mcp` - MCP server management
  - [ ] `toadstool run` - Non-interactive execution (OpenCode parity)
  - [ ] `toadstool attach` - Attach to remote server session
  - [ ] `toadstool auth` - Provider credential management
- [ ] Tests for all API endpoints and CLI flags

### Phase 15: Advanced Features (2-3 weeks)

**Goal:** LSP, plugins, prompt suggestions, and advanced capabilities from all three tools.

- [ ] **LSP integration (from OpenCode):**
  - [ ] Auto-load language servers for detected languages
  - [ ] Go-to-definition, references, hover, symbols via agent tools
- [ ] **Plugin system (from Claude Code):**
  - [ ] Plugin bundles (`--plugin-dir`) with hooks + tools + UI
  - [ ] Plugin-scoped hooks that only activate when plugin is enabled
  - [ ] Plugin marketplace / discovery (future)
- [ ] **Code formatters (from OpenCode):**
  - [ ] Auto-format after file writes (configurable per language)
  - [ ] Integration with biome, prettier, rustfmt, gofmt, etc.
- [ ] **Prompt suggestions (from Claude Code):**
  - [ ] AI-generated next-step suggestions after each response
  - [ ] Based on conversation history + git history
  - [ ] Tab to accept, Enter to accept+submit
  - [ ] Reuse prompt cache for minimal cost
- [ ] **PR review status (from Claude Code):**
  - [ ] Clickable PR link in footer (requires `gh` CLI)
  - [ ] Colored underline: green=approved, yellow=pending, red=changes
  - [ ] Auto-refresh every 60 seconds
- [ ] **Image support (from Claude Code):**
  - [ ] Clipboard image paste (Ctrl+V) for vision models
  - [ ] `@image.png` file mention for image files
  - [ ] Image rendering in responses (ASCII art or external viewer)
- [ ] **Model variant cycling (from OpenCode):**
  - [ ] Ctrl+T for thinking/non-thinking toggle
  - [ ] F2 to cycle recent models
  - [ ] Shift+F2 to cycle reverse
- [ ] Multi-edit/patch tool (batch file modifications)
- [ ] Scroll acceleration (`<scrollbox scrollAcceleration={...}>`)
- [ ] OpenTUI animations for modals and transitions (`useTimeline()`)
- [ ] **Beads integration (bd):**
  - [ ] Add `bd` tool wrapper for task/memory workflows
  - [ ] Add hooks: SessionStart -> `bd prime`, PreCompact -> `bd sync`
  - [ ] Add `bd` task import/export for plan view

### Phase 16: Distribution & Polish (1-2 weeks)

**Goal:** Publishable, installable, production-ready. Daily-driver quality.

- [ ] npm publish setup (package.json files, bin, exports)
- [X] Install script (`curl -fsSL https://toadstool.dev/install | bash`)
- [X] Homebrew tap formula
- [ ] GitHub Actions CI pipeline (lint, typecheck, test, build, publish)
- [X] Auto-update check on startup (configurable)
- [ ] **Terminal setup command (from Claude Code):**
  - [ ] `/terminal-setup` to configure Shift+Enter, Alt keys, etc.
  - [ ] Auto-detect terminal and suggest config changes
- [ ] Terminal compatibility documentation (Shift+Enter, true color, etc.)
- [ ] Accessibility: Unicode fallback characters, color contrast verification
- [X] Performance benchmarks: startup time, streaming latency, memory usage
- [ ] README.md overhaul with screenshots, feature list, installation guide
- [ ] CONTRIBUTING.md for open-source contributors
- [X] **AI App Store / Agent Discovery (from TOAD):**
  - [X] Browse available ACP agents from TUI
  - [ ] One-command install of agents
  - [ ] Curated agent list with descriptions

---

## Phase Details

### Phase 4 Detail: OpenTUI Migration & Code Quality

#### 4A: Runtime & Dependency Changes

**Remove (Ink + rendering stack):**
```bash
bun remove ink @inkjs/ui ink-picture ink-tab shiki marked marked-terminal
```

**Add (OpenTUI):**
```bash
bun add @opentui/core @opentui/react
```

**tsconfig.json changes:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**Entry point rewrite (`src/cli.ts`):**
```typescript
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./ui/components/App";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
});

createRoot(renderer).render(<App />);
```

#### 4B: Key Component Rewrites

**DiffRenderer.tsx (493 lines -> ~40 lines):**
```typescript
import { useAppStore } from "@/store/app-store";
import { COLOR } from "@/constants/colors";

interface DiffViewerProps {
  diff: string;
  filetype?: string;
  view?: "unified" | "split";
}

export function DiffViewer({ diff, filetype, view = "unified" }: DiffViewerProps) {
  return (
    <diff
      diff={diff}
      filetype={filetype}
      view={view}
      showLineNumbers={true}
      addedBg={COLOR.DIFF_ADDED_BG}
      removedBg={COLOR.DIFF_REMOVED_BG}
      style={{ width: "100%" }}
    />
  );
}
```

**MarkdownRenderer.tsx -> (~25 lines):**
```typescript
import type { SyntaxStyle } from "@opentui/core";

interface MarkdownViewProps {
  content: string;
  streaming?: boolean;
  syntaxStyle: SyntaxStyle;
}

export function MarkdownView({ content, streaming = false, syntaxStyle }: MarkdownViewProps) {
  return (
    <markdown
      content={content}
      streaming={streaming}
      syntaxStyle={syntaxStyle}
      conceal={true}
      style={{ width: "100%" }}
    />
  );
}
```

**Chat ScrollArea -> scrollbox with sticky scroll:**
```typescript
<scrollbox
  stickyScroll={true}
  stickyStart="bottom"
  viewportCulling={true}
  style={{ flexGrow: 1 }}
>
  {messages.map(msg => <MessageItem key={msg.id} message={msg} />)}
</scrollbox>
```

**Prompt Editor (TOAD-quality input):**
The input component is the first thing users interact with. It must feel as polished as TOAD's:
- [ ] Live Markdown syntax highlighting in the input (code fences highlighted *before* closing)
- [ ] Mouse click to position cursor, drag to select
- [ ] Full readline keybindings (Ctrl+A/E/B/F/K/U/W/D)
- [ ] Kill ring (Ctrl+K/U stores, Ctrl+Y pastes, Alt+Y cycles)
- [ ] Text selection with Shift+Arrows
- [ ] Multi-line with Shift+Enter
- [ ] `@` fuzzy file picker with Tab to switch to tree view
- [ ] `/` slash command autocomplete
- [ ] `!` bash mode (auto-detect configurable commands)
- [ ] Reverse history search (Ctrl+R)
- [ ] Tab completion for shell commands

**File Picker (TOAD dual-mode):**
```typescript
// @ triggers fuzzy search mode
<fuzzy-picker
  items={projectFiles}
  onSelect={addFileToContext}
  onTabPress={switchToTreeMode}  // Tab switches to tree
/>

// Tab switches to interactive tree
<tree-view
  root={projectRoot}
  onSelect={addFileToContext}
  onTabPress={switchToFuzzyMode}  // Tab switches back
/>
```

#### 4C: Magic Number Extraction Plan

Add to `src/config/ui.ts`:
```typescript
export const UI = {
  // ... existing values
  SIDEBAR_WIDTH_RATIO: 0.15,
  SIDEBAR_FILES_RATIO: 0.55,
  SIDEBAR_TASKS_RATIO: 0.25,
  SIDEBAR_PADDING: 2,
  SCROLLBAR_WIDTH: 1,
  TERMINAL_DEFAULT_COLUMNS: 80,
  MODAL_HEIGHT: 20,
  MODAL_WIDTH: "80%",
  POPUP_HEIGHT: 20,
  POPUP_WIDTH: "80%",
  PROGRESS_BAR_WIDTH: 40,
  ICON_SIZE_SM: 16,
  ICON_SIZE_LG: 24,
  DIFF_COLUMN_WIDTH: "50%",
} as const;
```

Add to `src/config/limits.ts`:
```typescript
export const LIMIT = {
  // ... existing values
  FILE_TREE_PADDING: 10,
  FILE_TREE_SAFETY_MARGIN: 3,
  SIDEBAR_TRUNCATE_LENGTH: 60,
  MARKDOWN_COLLAPSE_AFTER: 120,
  COMMAND_PALETTE_MAX_RESULTS: 10,
  HELP_MAX_DESCRIPTION_WIDTH: 11,
  TOOL_NAME_TRUNCATE: 50,
  LINE_KEY_SLICE: 10,
  MIN_TERMINAL_ROWS: 10,
  MIN_TERMINAL_COLS: 50,
} as const;
```

Add to `src/config/timeouts.ts`:
```typescript
export const TIMEOUT = {
  // ... existing values
  STREAM_BUFFER_MS: 10,
  MENTION_DEBOUNCE_MS: 150,
} as const;
```

Add to `src/constants/colors.ts`:
```typescript
export const COLOR = {
  // ... existing values
  DIFF_ADDED_BG: "#1a3d1a",
  DIFF_REMOVED_BG: "#3d1a1a",
  DIFF_HUNK_BG: "#1a2a3a",
} as const;
```

Add `src/constants/ignore-patterns.ts`:
```typescript
export const IGNORE_PATTERN = {
  FILE_TREE: [".git", "node_modules"],
  PROJECT_FILES: [".git", "node_modules", "dist", ".next"],
  SEARCH: [".git", "node_modules", "dist", ".next", "coverage"],
} as const;
```

Add `src/constants/sidebar-tabs.ts`:
```typescript
export const SIDEBAR_TAB = {
  FILES: "files",
  TASKS: "tasks",
  AGENTS: "agents",
} as const;

export type SidebarTab = typeof SIDEBAR_TAB[keyof typeof SIDEBAR_TAB];
```

#### 4D: Component Split Plan

**ToolCallManager.tsx (575 lines) -> 4 files:**
```
src/ui/components/tool-calls/
├── ToolCallManager.tsx     # Orchestrator (100 lines)
├── ToolCallItem.tsx        # Single tool call display (150 lines)
├── ToolCallStatus.tsx      # Status badge/indicator (50 lines)
└── ToolCallResult.tsx      # Result rendering (100 lines)
```

**Chat.tsx (479 lines) -> 3 files:**
```
src/ui/components/chat/
├── Chat.tsx                # Main chat container (150 lines)
├── SlashCommandHandler.ts  # Command parsing/execution (100 lines)
└── MessageSender.ts        # Message submission logic (80 lines)
```

**MessageItem.tsx (476 lines) -> 3 files:**
```
src/ui/components/messages/
├── MessageItem.tsx          # Message wrapper (100 lines)
├── ContentBlockRenderer.tsx # Block type dispatch (150 lines)
└── ThinkingBlock.tsx        # Thinking content display (50 lines)
```

#### 4E: SyntaxStyle Theme System

OpenTUI uses `SyntaxStyle` objects for all syntax highlighting. Create a centralized
theme system that feeds both `<code>`, `<markdown>`, and `<diff>` components:

```typescript
// src/ui/syntax-theme.ts
import { SyntaxStyle, RGBA } from "@opentui/core";
import { COLOR } from "@/constants/colors";

export const defaultSyntaxStyle = SyntaxStyle.fromStyles({
  // Code tokens
  keyword: { fg: RGBA.fromHex("#FF7B72"), bold: true },
  string: { fg: RGBA.fromHex("#A5D6FF") },
  comment: { fg: RGBA.fromHex("#8B949E"), italic: true },
  number: { fg: RGBA.fromHex("#79C0FF") },
  function: { fg: RGBA.fromHex("#D2A8FF") },
  type: { fg: RGBA.fromHex("#FFA657") },
  variable: { fg: RGBA.fromHex("#E6EDF3") },
  operator: { fg: RGBA.fromHex("#FF7B72") },
  punctuation: { fg: RGBA.fromHex("#F0F6FC") },

  // Markdown tokens
  "markup.heading": { fg: RGBA.fromHex("#58A6FF"), bold: true },
  "markup.heading.1": { fg: RGBA.fromHex("#00FF88"), bold: true, underline: true },
  "markup.heading.2": { fg: RGBA.fromHex("#00D7FF"), bold: true },
  "markup.bold": { fg: RGBA.fromHex("#F0F6FC"), bold: true },
  "markup.italic": { fg: RGBA.fromHex("#F0F6FC"), italic: true },
  "markup.list": { fg: RGBA.fromHex("#FF7B72") },
  "markup.raw": { fg: RGBA.fromHex("#A5D6FF") },
  "markup.link": { fg: RGBA.fromHex("#58A6FF"), underline: true },

  default: { fg: RGBA.fromHex("#E6EDF3") },
});
```

This style is passed to `<markdown>`, `<code>`, and `<diff>` components,
giving consistent syntax highlighting everywhere. In Phase 9 (Configuration),
this becomes user-customizable via theme files.

---

## Success Criteria

### Phase 4 (OpenTUI Migration + Code Quality + Performance)
- [ ] App runs on Bun with `@opentui/react`
- [ ] All Ink dependencies removed
- [ ] `<markdown>`, `<diff>`, `<code>`, `<scrollbox>` intrinsics rendering correctly
- [ ] Streaming mode working for live LLM output at 60fps
- [ ] Zero magic numbers/strings in source code
- [ ] No file > 300 lines
- [ ] All `as` assertions reduced by 50%+, all `!` reduced by 70%+
- [ ] **Performance foundations:**
  - [ ] Resize debounce, viewport culling, streaming buffer
  - [ ] Worker thread for diffs, message virtualization
  - [ ] Startup < 200ms p50, stream frame < 16ms p50
- [ ] All tests pass, build succeeds, typecheck clean

### Phase 5-6 (Tools + Shell + Agents)
- [ ] All 13 built-in tools working end-to-end
- [ ] **True shell integration (TOAD):** persistent state, interactive apps, tab completion
- [ ] **Background tasks (Claude Code):** Ctrl+B to background, TaskOutput tool
- [ ] Build and Plan agents switchable via Tab
- [ ] Subagent invocation via @mention
- [ ] Tool permission system enforced per agent

### Phase 7-8 (Commands + Checkpointing)
- [ ] 25+ slash commands (combined OpenCode + Claude Code parity)
- [ ] **Hybrid checkpointing:** per-prompt snapshots + git-based undo/redo
- [ ] `/rewind` with 4 options (code, conversation, both, summarize)
- [ ] **Diagnostic commands:** `/doctor`, `/debug`, `/context`, `/stats`, `/cost`
- [ ] `!` prefix bash execution + auto-detect shell commands
- [ ] `$EDITOR` integration, SVG export, settings TUI

### Phase 9-10 (Config + Hooks + Compaction)
- [ ] Multi-source config with merging
- [ ] **Leader key keybinds (OpenCode):** Ctrl+X leader, 80+ configurable actions
- [ ] **Vim editor mode (Claude Code):** Full vim keybindings in input
- [ ] **Hooks system (Claude Code):** Pre/PostToolUse, PermissionRequest, SessionStart, etc.
- [ ] **Permission modes:** Auto-Accept, Plan, Normal with Shift+Tab cycling
- [ ] Auto-compaction prevents context overflow
- [ ] Theme customization via SyntaxStyle files

### Phase 11-12 (Sessions + Providers)
- [ ] **Block navigation (TOAD):** Cursor through conversation blocks
- [ ] Session sharing via URL, forking, rename, diff view
- [ ] 3+ LLM providers working (Anthropic, OpenAI, Google/Ollama)
- [ ] `/connect` and `/models` flows complete
- [ ] `small_model` for automated tasks (title, compaction, summary)

### Phase 13-14 (Cross-Tool Compat + Server)
- [ ] **Universal config loading:** All 5 tool folders discovered automatically
  - [ ] `.toadstool/`, `.claude/`, `.cursor/`, `.opencode/`, `.gemini/`
  - [ ] TOADSTOOL.md + AGENTS.md + CLAUDE.md + GEMINI.md + .cursorrules
  - [ ] Skills, commands, agents, hooks, rules from ALL tools merged
  - [ ] Cursor .mdc format parsed and converted
  - [ ] Gemini `@file.md` imports resolved
- [ ] Custom tool files (`.opencode/tools/*.ts`, `.toadstool/tools/*.ts`)
- [ ] `toadstool serve` HTTP API with OpenAPI spec
- [ ] `toadstool -p "prompt"` headless mode with --json-schema, --max-budget-usd
- [ ] TUI control API for IDE integration

### Phase 15-16 (Advanced + Distribution)
- [ ] LSP integration, plugin system, prompt suggestions, PR status
- [ ] Image paste, model variant cycling, code formatters
- [ ] npm publish, brew tap, install script, CI pipeline
- [ ] **Performance verified against budgets:**
  - [ ] Startup < 200ms, stream < 16ms, keyboard < 8ms
  - [ ] Large diffs (10k lines) render in < 200ms first viewport
  - [ ] 100+ message conversations scroll at 60fps
- [ ] AI App Store / agent discovery
- [ ] Accessibility verified

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OpenTUI breaking changes | MEDIUM | MEDIUM | Pin `@opentui/*` versions, monitor releases, contribute upstream |
| Bun compatibility issues | MEDIUM | LOW | Bun is Node-compatible; fallback: use Bun for runtime, npm for CI |
| OpenTUI React reconciler gaps | MEDIUM | LOW | React bindings used by OpenCode itself (100k+ stars) |
| ACP protocol changes | HIGH | LOW | Pin SDK version, test against multiple agents |
| Scope creep from OpenCode feature parity | HIGH | HIGH | Prioritize by user impact, defer low-priority items |
| Test coverage degradation during migration | MEDIUM | MEDIUM | Migrate tests alongside components, enforce 95% gate |
| Vitest + Bun compatibility | LOW | LOW | Vitest officially supports Bun runner |
| ink-testing-library replacement | MEDIUM | MEDIUM | Write custom test helpers for OpenTUI; or test at integration level |
| Performance regression during migration | LOW | LOW | OpenTUI uses native Zig renderer; likely faster than Ink |
| Server mode security | HIGH | MEDIUM | Basic auth by default, bind to localhost only, CORS restrictions |
| Custom tool sandbox escape | HIGH | LOW | Run custom tools in isolated subprocess, validate args with Zod |
| MCP server trust | MEDIUM | MEDIUM | Permission prompts for unknown MCP tools, deny-list for dangerous patterns |
| Keybind conflicts across terminals | LOW | HIGH | Leader key pattern avoids conflicts; document per-terminal config |
| AGENTS.md injection attacks | MEDIUM | LOW | Sanitize instructions, don't auto-execute code from rules files |
| npm publish credential leak | HIGH | LOW | CI-only publish via GitHub Actions OIDC tokens, no manual publish |
| Session data migration (SQLite schema) | MEDIUM | MEDIUM | Versioned migrations in `scripts/db/`, backward-compatible schemas |

---

## Dependencies & Prerequisites

### npm packages needed (future phases):
```
# Phase 4: OpenTUI Migration
@opentui/core         # Core TUI framework
@opentui/react        # React reconciler

# Phase 5: Tools
simple-git            # Git operations for undo/redo

# Phase 12: Providers
@ai-sdk/openai        # OpenAI provider
@ai-sdk/google        # Google provider
@ai-sdk/openai-compatible  # Local model support

# Phase 13: Rules & Skills
gray-matter           # YAML frontmatter parsing for SKILL.md
@opencode-ai/plugin   # Custom tool helper (or custom implementation)

# Phase 14: Server Mode
hono                  # Lightweight HTTP framework (or Elysia for Bun)
@hono/zod-openapi     # OpenAPI 3.1 generation from Zod schemas
eventsource           # SSE client for event streaming

# Phase 15: Advanced
vscode-languageclient # LSP client (if adding LSP)
```

### External tools required:
- [ ] `bun` - Runtime (replaces Node.js for app execution)
- [ ] `git` - For undo/redo feature
- [ ] `ripgrep` (`rg`) - Already a dependency via `@vscode/ripgrep`
- [ ] `$EDITOR` env var - For external editor integration
- [ ] `tree-sitter` - Built into OpenTUI (no separate install needed)

### Packages removed in Phase 4:
```
ink                   # Replaced by @opentui/react
@inkjs/ui             # Replaced by OpenTUI intrinsic <select>, <input>
ink-picture           # Replaced by <ascii-font> (partial)
ink-tab               # Replaced by <tab-select>
shiki                 # Replaced by tree-sitter (built into OpenTUI)
marked                # Replaced by <markdown> intrinsic
marked-terminal       # Replaced by <markdown> intrinsic
ink-testing-library   # Replace with custom OpenTUI test helpers
```

### Packages retained (not affected by migration):
```
react                 # Same React 18, different reconciler
zustand               # State management (untouched)
zod                   # Runtime validation (untouched)
nanoid                # ID generation (untouched)
commander             # CLI parsing (untouched, Phase 14 extends)
@agentclientprotocol/sdk  # ACP protocol (untouched)
sqlite3 / sequelize   # Persistence (untouched)
chokidar              # File watching (untouched)
diff                  # Diff generation (may be replaced by OpenTUI <diff>)
```

---

*Last Updated: 2026-02-10*
*Next Review: After Phase 4 completion*

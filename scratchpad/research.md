# Competitive Research: AI CLI Tools Analysis

**Date**: 2026-02-10
**Scope**: Claude Code, OpenCode, Codex CLI, Toad (Batrachian), Conductor
**Purpose**: Feature parity analysis, performance patterns, anti-patterns, and feature extraction for TOADSTOOL

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tool Profiles](#tool-profiles)
3. [Feature Parity Matrix](#feature-parity-matrix)
4. [Deep Dives](#deep-dives)
   - [A. Streaming & Large Output Handling](#a-streaming--large-output-handling)
   - [B. Sub-Agent Management & Orchestration](#b-sub-agent-management--orchestration)
   - [C. Onboarding & First-Run Experience](#c-onboarding--first-run-experience)
   - [D. Status Commands & Usage Metrics](#d-status-commands--usage-metrics)
   - [E. CPU & Performance Issues](#e-cpu--performance-issues)
   - [F. Anti-Patterns & Lessons Learned](#f-anti-patterns--lessons-learned)
5. [Community Sentiment & Issues](#community-sentiment--issues)
6. [Milestone/Task Breakdown](#milestonetask-breakdown)
7. [Sources](#sources)

---

## Executive Summary

Five major AI CLI tools were analyzed across feature sets, performance patterns, community sentiment, and architectural decisions. Key findings:

| Tool | Stars | Language | License | Key Strength |
|------|-------|----------|---------|--------------|
| Claude Code | 65.9k | TypeScript/Node | Proprietary | Agent teams, subagents, plugins, enterprise analytics |
| OpenCode | 102k | TypeScript/Go | MIT | Model-agnostic, LSP integration, client-server arch |
| Codex CLI | 59.9k | Rust | Apache 2.0 | OS-level sandboxing, Rust performance, CI/CD automation |
| Toad (Batrachian) | 1.8k | TypeScript (Textual) | AGPL-3.0 | Unified multi-agent frontend, ACP protocol, streaming UX |
| Conductor | N/A (commercial) | macOS native | Commercial | Visual multi-agent orchestration, git worktree isolation |

**Critical gaps identified for TOADSTOOL**:
- No agent teams / peer-to-peer messaging
- No `codex exec` style non-interactive automation mode (partially have headless)
- No built-in code review workflow (`/review` against branches)
- No background process management (`/ps`)
- No fork-and-compare workflow
- No image input support
- No web search tool integration
- No plugin marketplace / distribution system
- No CI/CD action/integration
- No OpenTelemetry metrics export

---

## Tool Profiles

### 1. Claude Code (anthropic/claude-code)

**GitHub**: https://github.com/anthropics/claude-code
**Stars**: 65,958 | **Forks**: 5,100 | **Contributors**: ~100+
**Language**: TypeScript (Node.js, Ink-based TUI)
**Install**: `curl -fsSL https://claude.ai/install.sh | bash` or Homebrew

**Architecture**:
- Single-agent event loop with hierarchical subagent spawning
- "Proactive" approach: scans repos upfront, maintains long-term project memory with context compression
- CLAUDE.md + Skills + Hooks + MCP + Plugins extension system
- Agent teams via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- Tasks system (v2.1.16+) with DAG dependency tracking, filesystem persistence, cross-session sharing
- OpenTelemetry for comprehensive usage metrics

**Key Features (not in TOADSTOOL)**:
- Agent Teams with peer-to-peer messaging (`TeammateTool`)
- Tasks system with DAG dependencies replacing TODO
- Plugin marketplace and distribution
- `/review` with branch-based diff review presets
- `/fork` to branch conversations
- Image inputs (paste/CLI)
- Web search tool (cached + live modes)
- `/ps` background terminal monitoring
- `/personality` communication style presets
- `/statusline` configurable footer
- Shell completions generator (`claude completion bash/zsh/fish`)
- Chrome extension (beta)
- GitHub Actions integration
- Slack integration
- Enterprise analytics dashboard with leaderboards

**Score**: 9.5/10 (feature completeness), 6/10 (performance stability)

---

### 2. OpenCode (anomalyco/opencode)

**GitHub**: https://github.com/anomalyco/opencode (formerly sst/opencode)
**Stars**: 102,017 | **Forks**: 9,800 | **Contributors**: 700+
**Language**: TypeScript (Bun) + Go (Bubble Tea TUI)
**Install**: `curl -fsSL https://opencode.ai/install | bash` or npm/brew

**Architecture**:
- Client-server architecture (HTTP on 8700, gRPC on 8600)
- Bubble Tea (Go) for TUI rendering, Bun for backend
- SQLite persistent storage
- LSP integration with 30+ built-in servers, auto-install
- Auto-compact at 95% context window
- Desktop app (beta) for macOS/Windows/Linux

**Key Features (not in TOADSTOOL)**:
- Client-server split (TUI is just one client; supports remote/mobile)
- LSP Intelligence Engine with 30+ built-in servers
- Desktop app distribution
- `opencode serve` for remote API access
- `opencode github` commands for repository automation
- Tab key agent switching (we have this)
- `@general` and `@explore` subagent invocation via mention
- Parallel agent sessions (PARALLELIZE/Fork mode)
- Session forking with `--fork` flag
- Community token tracking tools (ccusage, opencode-usage, tokenscope)
- i18n (17 languages for README)
- Custom commands via `.opencode/commands/` markdown files

**Score**: 8.5/10 (feature completeness), 5/10 (performance stability)

---

### 3. Codex CLI (openai/codex)

**GitHub**: https://github.com/openai/codex
**Stars**: 59,891 | **Forks**: 7,900
**Language**: Rust (95.8%) + TypeScript SDK
**Install**: `npm i -g @openai/codex` or `brew install --cask codex`

**Architecture**:
- Rust core for performance (sandboxing, process management)
- OS-level sandboxing: macOS Seatbelt, Linux Landlock/seccomp
- Policy-driven sandbox modes (read-only, workspace-write, danger-full-access)
- Non-interactive `codex exec` for CI/CD automation
- Feature flags system
- Worktrees for isolated workspaces

**Key Features (not in TOADSTOOL)**:
- Rust-based sandbox with OS-level isolation (Seatbelt, Landlock, seccomp)
- `codex exec` non-interactive mode with JSON Lines streaming output
- Three approval modes: Auto, Read-only, Full Access (switchable via `/permissions`)
- `/review` with branch/uncommitted/commit review presets
- `/diff` inline git diff viewer
- `/fork` conversation forking
- `/ps` background terminal monitoring
- `/status` with full session config, token usage, writable roots
- `/init` generates AGENTS.md scaffold
- `/personality` communication styles (friendly, pragmatic, none)
- `/statusline` configurable footer items
- Feature flags system (`codex features enable/disable`)
- Shell completions generator
- Codex SDK for TypeScript integration
- Codex Cloud (`codex cloud exec`) for remote execution
- GitHub Action (`openai/codex-action@v1`)
- Slack + Linear + GitHub integrations
- Image inputs via `--image` flag
- Web search tool (cached + live)
- `codex resume` conversation picker with session summaries
- Prompt editor via Ctrl+G (opens $VISUAL/$EDITOR)
- `/apps` for browsing MCP connectors
- Non-interactive JSON Lines event streaming

**Score**: 9/10 (feature completeness), 7/10 (performance stability)

---

### 4. Toad / Batrachian (batrachianai/toad)

**GitHub**: https://github.com/batrachianai/toad
**Stars**: 1,800 | **Forks**: 77
**Language**: TypeScript (Textual framework)
**Install**: `curl -fsSL batrachian.ai/install | sh` or UV tool
**License**: AGPL-3.0

**Architecture**:
- Built on Textual framework (Will McGugan's Rich/Textual ecosystem)
- ACP (Agent Communication Protocol) for standardized agent communication
- Universal frontend for 12+ agent CLIs
- Partial screen region updates (no flicker)

**Key Features (learn from)**:
- **Unified multi-agent frontend**: Single TUI for Claude Code, Gemini CLI, OpenHands, etc.
- **Streaming Markdown rendering**: Remains fast with large documents, handles tables and code fences mid-stream
- **Fuzzy file search**: "@" convention with .gitignore respect
- **Advanced prompt editor**: Keyboard/mouse nav, selection, cut/copy/paste, live Markdown syntax highlighting
- **Integrated shell**: "!" prefix for inline shell with full color/interactivity/mouse
- **No visual artifacts**: Partial screen region updates eliminate flickering
- **Notebook-style navigation**: Cursor through past conversation blocks like Jupyter cells
- **Tab completion**: Borrowed from shell conventions

**Score**: 7/10 (feature completeness), 8/10 (UX polish)

---

### 5. Conductor (conductor.build)

**GitHub**: Commercial (macOS app) + agent-conductor (open source, 5 stars)
**Type**: Native macOS app + open-source CLI toolkit
**Price**: Commercial (free tier unknown)

**Architecture**:
- **conductor.build**: Native macOS app, git worktree isolation, visual agent monitoring
- **agent-conductor**: Python CLI, tmux-based multi-terminal, supervisor/worker topology, REST API + SQLite

**Key Features (learn from)**:
- **Parallel agent orchestration**: Press Cmd+N for isolated workspaces
- **Git worktree isolation**: Each agent works on separate branch automatically
- **Diff-first review**: Changes presented as clean diffs, not full files
- **Visual monitoring**: See all agents' progress at a glance
- **Supervisor/Worker pattern**: Structured delegation with approval gates
- **Inter-agent messaging**: Inbox system for agent communication
- **Audit trails**: Logging to ~/.conductor/logs/terminal/
- **Multi-provider**: Claude Code + Codex CLI in parallel

**Score**: 8/10 (orchestration), 7/10 (accessibility - macOS only)

---

## Feature Parity Matrix

| Feature | TOADSTOOL | Claude Code | OpenCode | Codex CLI | Toad |
|---------|-----------|-------------|----------|-----------|------|
| **Core** | | | | | |
| Interactive TUI | YES | YES | YES | YES | YES |
| Slash commands (40+) | YES | YES | YES | YES | LIMITED |
| Multi-provider support | YES | NO (Anthropic) | YES | NO (OpenAI) | YES (ACP) |
| Session persistence | YES (SQLite) | YES (file) | YES (SQLite) | YES (file) | UNKNOWN |
| Context compaction | YES | YES | YES (auto@95%) | YES | UNKNOWN |
| **Agent System** | | | | | |
| Built-in agents (build/plan) | YES | YES | YES | YES | N/A (frontend) |
| Subagent spawning | YES | YES | YES | LIMITED | N/A |
| Agent teams (peer messaging) | NO | YES (experimental) | NO | NO | NO |
| Cross-session task coordination | NO | YES (Tasks+DAG) | NO | NO | NO |
| Agent mention (@syntax) | YES | NO | YES | NO | NO |
| **Session Management** | | | | | |
| Session forking | YES | YES (/fork) | YES (--fork) | YES (/fork) | NO |
| Session resume/continue | YES | YES (-c, -r) | YES (--continue) | YES (resume) | NO |
| Conversation export | YES | LIMITED | LIMITED | NO | NO |
| Session sharing | YES | NO | YES (/share) | NO | NO |
| **Review & Diff** | | | | | |
| /review (AI code review) | YES | YES (branch/commit/uncommitted) | NO | YES (branch/commit/uncommitted) | NO |
| /diff inline viewer | NO | YES | NO | YES | NO |
| Security review | YES | NO (via skills) | NO | NO | NO |
| **Diagnostics** | | | | | |
| /status system health | YES | YES | NO | YES | NO |
| /stats usage stats | YES | YES (analytics) | NO (community tools) | YES | NO |
| /cost usage cost | YES | YES | NO (community tools) | YES | NO |
| /doctor diagnostics | YES | NO | NO | NO | NO |
| OpenTelemetry export | NO | YES | NO | NO | NO |
| Enterprise analytics dashboard | NO | YES | NO | NO | NO |
| **Performance** | | | | | |
| OS-level sandboxing | NO | NO | NO | YES (Rust) | NO |
| Streaming backpressure | LIMITED | LIMITED | LIMITED | UNKNOWN | YES |
| Background process mgmt (/ps) | NO | LIMITED | NO | YES | NO |
| LSP integration | NO | NO | YES (30+ servers) | NO | NO |
| **Automation** | | | | | |
| Non-interactive exec mode | YES (headless) | YES (-p) | YES (opencode run) | YES (codex exec) | NO |
| JSON Lines output | NO | NO | NO | YES | NO |
| CI/CD GitHub Action | NO | YES | NO | YES | NO |
| SDK for programmatic use | NO | YES (Agent SDK) | NO | YES (Codex SDK) | NO |
| Slack/Linear integrations | NO | YES | NO | YES | NO |
| **UX** | | | | | |
| Image inputs | NO | YES | NO | YES | NO |
| Web search tool | NO | YES | NO | YES | NO |
| Shell completions | NO | YES | NO | YES | NO |
| Prompt editor (external) | YES (/editor) | YES (Ctrl+G) | NO | YES (Ctrl+G) | YES |
| Notebook-style navigation | NO | NO | NO | NO | YES |
| Theme system | YES | LIMITED | NO | NO | NO |
| Vim mode | YES | NO | NO | NO | NO |
| Plugin system | YES (discovery) | YES (marketplace) | NO | YES (skills) | NO |
| Hooks system | YES | YES | NO | YES | NO |
| **Configuration** | | | | | |
| Feature flags | NO | NO | YES | YES | NO |
| Configurable statusline | NO | NO | NO | YES | NO |
| Communication personality | NO | NO | NO | YES | NO |
| Desktop app | NO | YES | YES (beta) | YES | NO |

---

## Deep Dives

### A. Streaming & Large Output Handling

**Problem**: All tools struggle with large streaming outputs. This is the #1 performance issue across the ecosystem.

#### Claude Code
- **Anti-pattern**: Stores ALL bash output in memory permanently. Users report 90GB+ memory usage after running tests/builds with substantial output (Issue #11155).
- **Anti-pattern**: O(n) re-rendering on every token during streaming in long sessions.
- **Lesson**: Must implement output truncation/windowing for tool results. Never store unbounded command output.

#### OpenCode
- **Anti-pattern**: O(n) text buffer rendering in OpenTUI's Zig renderer recalculates virtual lines for ALL content on every update, not just viewport (Issue #6172).
- **Anti-pattern**: `mmap` allocates new memory for every calculation without reuse.
- **Anti-pattern**: Full LSP diagnostics attached to EACH message that performs edit/write, causing session files to grow to 1GB+ (Issue #6310).
- **Lesson**: Only render visible viewport. Use memory pooling. Limit diagnostic payload per message.

#### Toad (Best-in-class)
- **Pattern**: Partial screen region updates. Only repaints changed regions, eliminating flicker.
- **Pattern**: Markdown streaming designed to remain fast with large documents.
- **Lesson**: Adopt partial-update rendering strategy. Pre-allocate render buffers.

#### Codex CLI
- **Pattern**: Rust-based rendering with lower memory overhead.
- **Anti-pattern**: Background process leak - spawned processes continue after session interruption (Issue #7932).
- **Lesson**: Implement process group management. Kill child processes on exit.

**TOADSTOOL Action Items**:
1. Implement viewport-only rendering for message list (don't re-render off-screen content)
2. Add output truncation for tool results (configurable limit, e.g., 50KB default)
3. Implement streaming backpressure (pause if render queue > N chunks)
4. Use memory pooling for render buffers
5. Add process group management for spawned processes
6. Profile and benchmark streaming with 100KB+ outputs

---

### B. Sub-Agent Management & Orchestration

This is the **highest-impact feature gap** for TOADSTOOL.

#### Claude Code Agent Teams (State of the Art)
- **TeammateTool**: Peer-to-peer messaging between agents
  - `write` operation for direct messaging
  - Broadcast messaging to all teammates
  - Plan approval/rejection workflows
  - Graceful team shutdown coordination
- **Tasks System** (v2.1.16+):
  - DAG dependency tracking (A blocks B, B blocks C)
  - Filesystem persistence (`~/.claude/tasks`)
  - Cross-session sharing via `CLAUDE_CODE_TASK_LIST_ID` env var
  - Real-time synchronization across parallel sessions
- **Subagent Types**: Explore (fast/read-only), Plan (research), General Purpose (multi-step)
- **Directory Structure**: `~/.claude/teams/{team-name}/messages/{session-id}`

#### OpenCode Multi-Agent
- **Four operational modes**: including PARALLELIZE (Fork Mode)
- **@mention syntax**: `@general` and `@explore` for subagent invocation
- **Issue**: Sessions hang when subagents spawned via REST API (Issue #6573)
- **Lesson**: Test subagent spawning across all interfaces (TUI, API, headless)

#### Conductor Patterns
- **Git Worktree Isolation**: Each agent gets isolated branch automatically
- **Supervisor/Worker Topology**: Structured delegation
- **Approval Gates**: Dangerous commands require supervisor approval
- **Visual Monitoring**: Progress dashboard for all agents
- **Inter-Agent Inbox**: Message queue for communication

#### Agent-Conductor (OSS)
- **tmux-based**: Each agent runs in isolated tmux pane
- **REST API + SQLite**: State persistence across restarts
- **Audit Trails**: Full logging to `~/.conductor/logs/terminal/`

**TOADSTOOL Action Items**:
1. **M-AGENTS-1: Agent Teams Foundation**
   - Implement TeammateTool equivalent (send/receive/broadcast)
   - Message persistence to `~/.toadstool/teams/{name}/messages/`
   - Session-to-session communication channel
2. **M-AGENTS-2: Task Coordination System**
   - Replace TODO-style tracking with DAG-based task system
   - Cross-session task sharing via env var or config
   - Task dependency resolution and blocking
3. **M-AGENTS-3: Git Worktree Integration**
   - Auto-create worktrees for parallel agent sessions
   - Branch management per agent
   - Merge/review workflow after agent completion
4. **M-AGENTS-4: Supervisor/Worker Pattern**
   - Configurable orchestration topologies
   - Approval gates for dangerous operations
   - Progress aggregation from workers to supervisor
5. **M-AGENTS-5: Visual Agent Dashboard**
   - Split-pane or tabbed view of parallel agents
   - Real-time progress per agent
   - Agent health monitoring

---

### C. Onboarding & First-Run Experience

#### Claude Code
- `/init` is now part of Skills system. Doesn't auto-run on first launch.
- Setup docs cover auth for individuals and teams.
- No guided wizard or interactive onboarding.

#### OpenCode
- `/init` analyzes project and creates `AGENTS.md`
- `/connect` configures LLM provider API key
- Recommends "OpenCode Zen" curated model list
- No guided wizard but clear sequential steps in docs

#### Codex CLI
- **Best-in-class onboarding**:
  - `codex` auto-detects no auth and prompts for ChatGPT sign-in
  - `/init` generates `AGENTS.md` scaffold with project-specific conventions
  - Shell completions generator for immediate productivity
  - Feature flags let users incrementally enable advanced features
  - `/personality` lets users customize communication style immediately

#### Toad
- Simple `curl | sh` install
- Minimal onboarding - relies on underlying agent CLIs being configured
- No project-specific initialization

**TOADSTOOL Action Items**:
1. **M-ONBOARD-1: Interactive First-Run Wizard**
   - Detect first launch (no config file exists)
   - Step-by-step: provider selection -> API key -> model selection -> project init
   - Generate `TOADSTOOL.md` automatically on first run in a project
   - Run `/doctor` automatically and surface issues
2. **M-ONBOARD-2: Shell Completions**
   - Generate bash/zsh/fish completions for CLI subcommands
   - Include slash command completion hints
3. **M-ONBOARD-3: Feature Discovery**
   - Progressive feature disclosure (don't overwhelm new users)
   - Contextual tips (e.g., "Did you know you can use /review?")
   - Feature flags for experimental features

---

### D. Status Commands & Usage Metrics

#### Claude Code (Best-in-class)
- **OpenTelemetry export** with comprehensive metrics:
  - Token counter, lines of code, session counter, PR counter, commit counter
  - Cost counter, code edit tool decision counter, active time counter
  - Events: user prompt, tool result, API request/error, tool decision
- **Enterprise Analytics Dashboard** (claude.ai/analytics/claude-code):
  - Usage metrics, contribution metrics (GitHub integration)
  - Leaderboards, data export
- **API endpoint** for daily aggregated usage: `/v1/organizations/usage_report/claude_code`
- **`/status`** shows session config and token usage

#### OpenCode
- No built-in metrics (relies on community tools)
- **ccusage**: Daily/weekly/monthly aggregation with subagent hierarchy
- **opencode-usage**: Real-time TUI dashboard, budget tracking per provider
- **opencode-tokenscope**: Comprehensive token analysis

#### Codex CLI
- **`/status`** shows model, approval policy, writable roots, token usage, remaining context
- **`/statusline`** configurable footer (model, context, limits, git, tokens, session)
- **ccusage** for token tracking

#### Toad
- No usage metrics (frontend only)

**TOADSTOOL Action Items**:
1. **M-METRICS-1: Comprehensive /status Command**
   - Active model, approval mode, writable roots, token usage, context %
   - Provider connection health
   - Active subagents and their status
   - Git branch and working tree status
2. **M-METRICS-2: Usage Metrics Collection**
   - Token counters per session (input/output/cached/reasoning)
   - Cost calculation per model (integrate pricing data)
   - Lines of code changed, commits made, PRs created
   - Active time tracking per session
   - Persist metrics to SQLite
3. **M-METRICS-3: Configurable Status Footer**
   - User-configurable status line items
   - Options: model, context %, token count, cost, git branch, session ID
   - Persist configuration
4. **M-METRICS-4: OpenTelemetry Export**
   - Optional OTLP exporter for enterprise metrics
   - Prometheus-compatible endpoint via server mode
5. **M-METRICS-5: Analytics Dashboard**
   - `/stats` enhanced with daily/weekly/monthly views
   - Cost breakdown by model/provider
   - Session productivity metrics

---

### E. CPU & Performance Issues

#### Claude Code Issues (Critical Lessons)
1. **Busy-wait loop** (Issue #17148): `setImmediate()` re-scheduling creates 100%+ CPU when idle. 
   - **Lesson**: Use proper event loop sleeping. Never poll with setImmediate.
2. **Process accumulation** (Issue #11122): Multiple concurrent sessions don't auto-terminate. 270-370MB RAM per instance.
   - **Lesson**: Track process lifecycle. Auto-cleanup stale sessions.
3. **Memory leak during long sessions** (Issue #11377): 23GB RAM after 14 hours. Compaction operation hung.
   - **Lesson**: Implement memory budgets. Add timeout to compaction. Monitor RSS.
4. **Bash output stored in memory** (Issue #11155): 90GB+ memory from command output.
   - **Lesson**: Truncate/window command output. Don't store unbounded data.
5. **Performance degradation after compaction** (Issue #10881): Requests take minutes after several auto-compacts.
   - **Lesson**: Profile compaction. Ensure it actually frees memory, not just context.
6. **Metadata bloat** (Medium article): `~/.claude.json` grows unbounded for frequently-used projects.
   - **Lesson**: Implement metadata rotation/cleanup. Don't store all project history in one file.

#### OpenCode Issues
1. **O(n) render loop** (Issue #6172): CPU at 100%+ during streaming. Recalculates ALL content, not viewport.
   - **Lesson**: Virtual scrolling. Only render visible content.
2. **LSP diagnostics bloat** (Issue #6310): Full diagnostics on EVERY edit message. Sessions grow to 1GB+.
   - **Lesson**: Summarize diagnostics. Don't attach full workspace diagnostics per message.
3. **Token consumption spike** (Issue #6728): Context jumps to ~100k within 5-10 prompts with Opus 4.5.
   - **Lesson**: Monitor context growth rate. Alert when growth is abnormal.

#### Codex CLI Issues
1. **Sandbox timeouts** (Issue #3557): Commands timeout in sandboxed environment despite working outside it.
   - **Lesson**: Sandbox overhead must be measured. Provide generous timeout multipliers.
2. **Background process leak** (Issue #7932): Orphaned processes after Ctrl-C.
   - **Lesson**: Process group management. SIGTERM entire process group on exit.

**TOADSTOOL Action Items**:
1. **M-PERF-1: Streaming Performance Audit**
   - Profile rendering pipeline with 100KB+ outputs
   - Implement viewport-only rendering
   - Add backpressure mechanism (pause streaming if render queue > 10 chunks)
2. **M-PERF-2: Memory Management**
   - Implement output truncation (configurable, default 50KB per tool result)
   - Add RSS monitoring and alerting in /doctor
   - Memory budget enforcement for long sessions
   - Session data compaction should actually free memory (verify with heap snapshots)
3. **M-PERF-3: Process Lifecycle Management**
   - Track all spawned child processes
   - Process group management (kill entire group on session end)
   - Stale process detection and cleanup
   - Auto-terminate idle sessions after configurable timeout
4. **M-PERF-4: Event Loop Health**
   - Never use setImmediate/setTimeout(0) for polling
   - Proper event-driven architecture with real sleep/wait
   - Profile idle CPU usage (target: <1% when waiting for input)
5. **M-PERF-5: Data Growth Prevention**
   - Metadata rotation/cleanup for project history
   - LSP/diagnostic data summarization (don't store full dumps)
   - Session file size monitoring with alerts

---

### F. Anti-Patterns & Lessons Learned

#### Anti-Pattern 1: Unbounded In-Memory Storage
- **Seen in**: Claude Code (bash output), OpenCode (LSP diagnostics)
- **Impact**: 10-90GB memory usage, OOM crashes
- **Fix**: Configurable limits, streaming to disk, windowed buffers
- **TOADSTOOL risk**: Our checkpoint system or session persistence could hit this

#### Anti-Pattern 2: O(n) Full-Document Re-rendering
- **Seen in**: OpenCode (every token triggers full recalculation)
- **Impact**: 100%+ CPU during streaming, UI becomes unresponsive
- **Fix**: Virtual scrolling, dirty-region tracking, partial updates
- **TOADSTOOL risk**: Ink's reconciler may have similar issues with long message lists

#### Anti-Pattern 3: Busy-Wait Event Loops
- **Seen in**: Claude Code (setImmediate re-scheduling)
- **Impact**: 100% CPU when idle
- **Fix**: Proper async/await with real sleep, event-driven wake
- **TOADSTOOL risk**: Any polling-based code in our event handling

#### Anti-Pattern 4: Orphaned Child Processes
- **Seen in**: Codex CLI (background processes survive session end)
- **Impact**: Zombie processes accumulating, resource drain
- **Fix**: Process group tracking, SIGTERM on exit, PID file management
- **TOADSTOOL risk**: Our shell integration and tool execution

#### Anti-Pattern 5: Context Window Bloat
- **Seen in**: OpenCode (Opus 4.5), Claude Code (post-compaction degradation)
- **Impact**: Rapid context exhaustion, degraded model performance
- **Fix**: Context growth monitoring, smarter compaction, alert thresholds
- **TOADSTOOL risk**: Our compaction system may not be aggressive enough

#### Anti-Pattern 6: Single-File Metadata Growth
- **Seen in**: Claude Code (~/.claude.json grows unbounded)
- **Impact**: Startup slowdown (seconds to minutes)
- **Fix**: Sharded metadata, rotation, periodic cleanup
- **TOADSTOOL risk**: Our SQLite DB could grow large without maintenance

#### Anti-Pattern 7: Sandbox Performance Overhead
- **Seen in**: Codex CLI (commands timeout in sandbox)
- **Impact**: Tools fail silently or timeout unexpectedly
- **Fix**: Generous timeouts, sandbox overhead measurement, escape hatches
- **TOADSTOOL risk**: Any future sandboxing implementation

---

## Community Sentiment & Issues

### Claude Code
- **Positive**: Most mature feature set, enterprise-ready analytics, agent teams are ahead of competition
- **Negative**: Severe memory leaks, CPU issues when idle, vendor lock-in (Anthropic only), closed source core
- **Top complaints**: Performance degradation in long sessions, memory consumption, cost opacity
- **Community**: Active Discord, responsive issue handling, regular releases

### OpenCode
- **Positive**: Truly open source (MIT), model-agnostic, massive community (700+ contributors), LSP integration
- **Negative**: Performance issues with TUI rendering, session bloat from LSP diagnostics, context consumption issues
- **Top complaints**: High CPU during streaming, LSP diagnostics causing session corruption, token consumption spikes
- **Community**: Very active (102k stars), strong contributor base, Discord community

### Codex CLI
- **Positive**: Rust performance baseline, excellent sandboxing, CI/CD integration, non-interactive mode
- **Negative**: Limited to OpenAI models, sandbox timeout issues, background process leaks
- **Top complaints**: Sandbox reliability, process management, Windows support
- **Community**: Active but more corporate-driven (OpenAI), regular releases

### Toad (Batrachian)
- **Positive**: Best-in-class streaming UX, creator has deep terminal expertise (Rich/Textual), novel notebook navigation
- **Negative**: Small community (1.8k stars), AGPL license limits adoption, limited to frontend role
- **Top complaints**: Early stage, limited features compared to full agents
- **Community**: Small but growing, backed by OpenHands sponsorship

### Conductor
- **Positive**: Best visual orchestration UX, used by major companies (Linear, Vercel, Notion, Stripe)
- **Negative**: macOS only, commercial/closed, depends on Claude Code / Codex CLI underneath
- **Top complaints**: Platform lock-in, pricing unclear
- **Community**: Enterprise-focused, not open-source community

---

## Milestone/Task Breakdown

### M-STREAM: Streaming & Large Output Handling
**Type**: Infrastructure / Performance
**Priority**: P0 (Critical)
**Effort**: Large

| Task | Description | Source |
|------|-------------|--------|
| M-STREAM-1 | Viewport-only rendering for message list | OpenCode Issue #6172 |
| M-STREAM-2 | Output truncation for tool results (configurable, default 50KB) | Claude Code Issue #11155 |
| M-STREAM-3 | Streaming backpressure (pause if render queue > N chunks) | Toad's partial-update approach |
| M-STREAM-4 | Memory pooling for render buffers | OpenCode's mmap anti-pattern |
| M-STREAM-5 | Profile streaming with 100KB+ outputs (benchmark suite) | All tools |

---

### M-AGENTS: Sub-Agent Management & Orchestration
**Type**: Feature / Core
**Priority**: P0 (High Impact)
**Effort**: XL

| Task | Description | Source |
|------|-------------|--------|
| M-AGENTS-1 | Agent Teams: peer-to-peer messaging between sessions | Claude Code TeammateTool |
| M-AGENTS-2 | Task coordination with DAG dependencies | Claude Code Tasks v2.1.16+ |
| M-AGENTS-3 | Git worktree isolation for parallel agents | Conductor, Codex Worktrees |
| M-AGENTS-4 | Supervisor/worker orchestration topology | Agent-Conductor |
| M-AGENTS-5 | Visual agent dashboard (split-pane/tabbed) | Conductor.build |
| M-AGENTS-6 | Cross-session task sharing via config/env var | Claude Code CLAUDE_CODE_TASK_LIST_ID |

---

### M-ONBOARD: Onboarding & First-Run Experience
**Type**: Feature / UX
**Priority**: P1
**Effort**: Medium

| Task | Description | Source |
|------|-------------|--------|
| M-ONBOARD-1 | Interactive first-run wizard (provider + model + project init) | Codex CLI auto-detect |
| M-ONBOARD-2 | Shell completions generator (bash/zsh/fish) | Codex CLI, Claude Code |
| M-ONBOARD-3 | Progressive feature discovery (contextual tips) | Codex feature flags |
| M-ONBOARD-4 | Auto-run /doctor on first launch, surface issues | TOADSTOOL /doctor |

---

### M-METRICS: Status & Usage Metrics
**Type**: Feature / Diagnostics
**Priority**: P1
**Effort**: Large

| Task | Description | Source |
|------|-------------|--------|
| M-METRICS-1 | Enhanced /status (model, mode, tokens, context %, git, agents) | Codex CLI /status |
| M-METRICS-2 | Token/cost tracking per session (input/output/cached/reasoning) | Claude Code OTel |
| M-METRICS-3 | Configurable status footer items | Codex CLI /statusline |
| M-METRICS-4 | OpenTelemetry metrics export (optional) | Claude Code monitoring |
| M-METRICS-5 | Daily/weekly/monthly analytics views in /stats | ccusage community tools |
| M-METRICS-6 | Lines of code changed, commits, PRs tracked | Claude Code analytics |

---

### M-PERF: CPU & Performance Optimization
**Type**: Infrastructure / Performance
**Priority**: P0 (Critical)
**Effort**: Large

| Task | Description | Source |
|------|-------------|--------|
| M-PERF-1 | Audit event loop for busy-wait patterns | Claude Code Issue #17148 |
| M-PERF-2 | Implement RSS monitoring in /doctor | Claude Code Issue #11377 |
| M-PERF-3 | Process group management (kill children on exit) | Codex CLI Issue #7932 |
| M-PERF-4 | Session data size monitoring with alerts | OpenCode Issue #6310 |
| M-PERF-5 | Idle CPU benchmark (target: <1% when waiting) | All tools |
| M-PERF-6 | Memory budget enforcement for long sessions | Claude Code Issue #11155 |

---

### M-REVIEW: Code Review & Diff Workflows
**Type**: Feature
**Priority**: P1
**Effort**: Medium

| Task | Description | Source |
|------|-------------|--------|
| M-REVIEW-1 | /review presets (branch diff, uncommitted, specific commit) | Codex CLI /review |
| M-REVIEW-2 | /diff inline git diff viewer | Codex CLI /diff |
| M-REVIEW-3 | Review model override (separate from chat model) | Codex CLI review_model |

---

### M-AUTOMATION: CI/CD & Non-Interactive Mode
**Type**: Feature / Infrastructure
**Priority**: P2
**Effort**: Large

| Task | Description | Source |
|------|-------------|--------|
| M-AUTOMATION-1 | JSON Lines event streaming for exec mode | Codex CLI codex exec --json |
| M-AUTOMATION-2 | GitHub Action for CI/CD integration | Codex CLI codex-action |
| M-AUTOMATION-3 | SDK for programmatic TypeScript integration | Codex SDK, Claude Agent SDK |
| M-AUTOMATION-4 | Slack/webhook integration for notifications | Claude Code Slack |

---

### M-UX: UX Enhancements
**Type**: Feature / UX
**Priority**: P2
**Effort**: Medium

| Task | Description | Source |
|------|-------------|--------|
| M-UX-1 | Image input support (paste + CLI flag) | Claude Code, Codex CLI |
| M-UX-2 | Web search tool integration | Claude Code, Codex CLI |
| M-UX-3 | /fork conversation branching | Claude Code, Codex CLI |
| M-UX-4 | /ps background process monitoring | Codex CLI |
| M-UX-5 | Notebook-style conversation navigation | Toad |
| M-UX-6 | /personality communication style presets | Codex CLI |
| M-UX-7 | Feature flags system for experimental features | Codex CLI |

---

### M-PLATFORM: Platform & Distribution
**Type**: Infrastructure
**Priority**: P3
**Effort**: XL

| Task | Description | Source |
|------|-------------|--------|
| M-PLATFORM-1 | Plugin marketplace (publish/install/namespace) | Claude Code Plugins |
| M-PLATFORM-2 | Client-server architecture split | OpenCode serve mode |
| M-PLATFORM-3 | Desktop app wrapper | OpenCode, Claude Code desktop |
| M-PLATFORM-4 | Chrome extension for browser integration | Claude Code Chrome |

---

## Sources

### GitHub Repositories
1. https://github.com/anthropics/claude-code (65.9k stars)
2. https://github.com/anomalyco/opencode (102k stars)
3. https://github.com/openai/codex (59.9k stars)
4. https://github.com/batrachianai/toad (1.8k stars)
5. https://github.com/gaurav-yadav/agent-conductor (5 stars)
6. https://github.com/reshashi/claude-orchestrator
7. https://github.com/jnorthrup/conductor2

### Documentation
8. https://code.claude.com/docs/en/features-overview
9. https://code.claude.com/docs/en/agent-teams
10. https://code.claude.com/docs/en/monitoring-usage
11. https://developers.openai.com/codex/cli/features
12. https://developers.openai.com/codex/cli/slash-commands
13. https://developers.openai.com/codex/security
14. https://opencode.ai/docs/
15. https://opencode.ai/docs/agents/
16. https://opencode.ai/docs/lsp/
17. https://conductor.build/
18. https://docs.conductor.build/

### Issue Trackers (Performance/Anti-patterns)
19. Claude Code #11155 - Bash output stored in memory (90GB+)
20. Claude Code #11377 - Memory leak: 23GB RAM, 143% CPU after 14 hours
21. Claude Code #10881 - Performance degradation over long sessions
22. Claude Code #11122 - Multiple processes accumulate causing high CPU
23. Claude Code #17148 - 100%+ CPU when idle (setImmediate busy-wait)
24. OpenCode #6172 - O(n) text buffer rendering causing 100%+ CPU
25. OpenCode #6310 - LSP diagnostics bloat causing 1GB+ sessions
26. OpenCode #6573 - Sessions hang when spawning subagents via REST API
27. OpenCode #6728 - High token consumption with Opus 4.5
28. Codex CLI #3557 - Command timeouts in sandboxed environment
29. Codex CLI #7932 - Background process leak + missing job control

### Community & Articles
30. https://www.infoq.com/news/2025/12/llm-agent-cli/ (Toad overview)
31. https://www.openhands.dev/blog/20251218-openhands-toad-collaboration
32. https://willmcgugan.github.io/toad-released/ (Will McGugan's blog)
33. https://medium.com/@j.y.weng/when-your-claude-code-becomes-terribly-slow-over-time
34. https://blog.ivan.digital/claude-code-vs-openai-codex-agentic-planner-vs-shell-first-surgeon
35. https://cefboud.com/posts/coding-agents-internals-opencode-deepdive/
36. https://faros.ai/blog/best-ai-coding-agents-2026

### Metrics & Tooling
37. https://ccusage.com/guide/opencode/ (Token tracking for OpenCode)
38. https://ccusage.com/guide/codex/ (Token tracking for Codex CLI)
39. https://github.com/xiello/opencode-usage (OpenCode usage tracker)
40. https://github.com/ramtinJ95/opencode-tokenscope (Token analysis)

---

## Appendix: TOADSTOOL Current Feature Inventory

For reference, TOADSTOOL currently has:
- 40+ slash commands across 10 categories
- Multi-provider support (Anthropic, OpenAI, Ollama, 8+ OpenAI-compatible)
- Session persistence (SQLite)
- Context compaction
- Built-in agents (build/plan) with @mention syntax
- Subagent spawning
- Session forking, resume, export/import
- /status, /stats, /cost, /doctor diagnostics
- Checkpointing with undo/redo/rewind
- Configuration system (12-section schema)
- Permissions system with mode cycling
- Hooks system
- Skills and commands discovery
- Theme system
- Vim input mode
- Server mode with REST API
- Headless CLI mode

**Completed Milestones**: M0-M16 (all complete)
**Test Coverage**: 113 test files, 0 failures

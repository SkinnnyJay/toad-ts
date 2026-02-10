# Scratchpad Plan

## Phase 4: OpenTUI Migration & Code Quality
- [ ] 4A: Runtime & Build Migration
  - [X] Update docs/commands for Bun scripts
- [X] 4B: Core Component Migration
- [X] 4C: Code Quality Cleanup
- [X] 4D: Performance Foundations
- [ ] 4E: Test Migration & Verification

## Phase 5: Tool System & Shell Integration
- [X] Phase 5 tasks (see PLAN.md)
  - [X] Tool registry + built-in tool implementations
  - [X] ACP tool host + permission handler wiring
  - [X] Shell background tasks + task output UX
  - [X] Shell auto-detect + tab completion
  - [X] Interactive shell apps + shell mode UX
  - [X] Per-harness tool permission overrides

## Phase 6: Agent Execution Engine
- [X] Phase 6 tasks (see PLAN.md)
  - [X] Agent manager + built-in build/plan agents
  - [X] Markdown agent config loader (.opencode/agents)
  - [X] Tab key agent switching in TUI
  - [X] Per-agent model/temperature config
  - [X] Hidden agents (compaction/title/summary)
  - [X] Subagent runner for @mention invocation
  - [X] @agent mention syntax in input
  - [X] Child session navigation (leader + arrows)
  - [X] Execution engine wiring + subagent task orchestration

## Phase 7: Slash Commands & UX Polish
- [X] Phase 7 tasks (see PLAN.md)
  - [X] Slash commands: /connect, /sessions, /new, /rename, /models
  - [X] Slash commands: /details + /thinking toggles
  - [X] Slash command: /editor (external editor)
  - [X] Slash command: /themes selector
  - [X] /models listing from agent capabilities
  - [X] Slash commands: /doctor, /debug, /context, /stats, /cost
  - [X] Slash command: /memory editing
  - [X] Slash command: /copy clipboard

## Phase 8: Checkpointing & Undo/Redo
- [X] Phase 8 tasks (see PLAN.md)
  - [X] Per-prompt checkpoint snapshots persisted to disk
  - [X] Track tool file changes in checkpoints (write/edit + ACP)
  - [X] /undo, /redo, /rewind wired to checkpoints
  - [X] /rewind list/delete support
  - [X] Rewind menu + status footer indicator
  - [X] Git-based undo/redo integration (patch apply fallback)

## Phase 9: Configuration & Keybind System
- [X] Phase 9 tasks (see PLAN.md)
  - [X] Config schema + multi-source loader (global/project/env)
  - [X] Variable substitution for env/file config values
  - [X] Leader-key keybind runtime + defaults
  - [X] Keybind editor UI + extended action map
  - [X] Permission mode cycling (Shift+Tab) using session modes
  - [X] Vim input mode (normal/insert + motions/operators)
  - [X] Hooks system (config + hooks manager + UI panel)

## Phase 10: Compaction & Context Management
- [X] Phase 10 tasks (see PLAN.md)
  - [X] /compact triggers compaction subagent
  - [X] Compaction summary stored on parent session
  - [X] Context budget indicator in status footer
  - [X] Context attachments modal (/context)

## Phase 11: Session Management, Sharing & Export
- [X] Phase 11 tasks (see PLAN.md)
  - [X] /share + /unshare export session markdown
  - [X] /export markdown/json/zip + /import
  - [X] Session history filter in sessions popup
  - [X] Export/import integrity tests

## Phase 12: Provider Expansion
- [X] Phase 12 tasks (see PLAN.md)
  - [X] Gemini/Codex harness adapters + defaults
  - [X] Provider health checks in /doctor

## Phase 13: Cross-Tool Compatibility & Rules System
- [X] Phase 13 tasks (see PLAN.md)
  - [X] Unified rules loader with precedence
  - [X] Permission rule ingestion + validation

## Phase 14: Server Mode & Headless CLI
- [X] Phase 14 tasks (see PLAN.md)
  - [X] Server-mode CLI flag + headless runtime
  - [X] WebSocket/HTTP control surface

## Phase 15: Advanced Features
- [X] Phase 15 tasks (see PLAN.md)
  - [X] Agent routing policy (configurable rules)
  - [X] Progress modal panel (/progress)

## Phase 16: Distribution & Polish
- [X] Phase 16 tasks (see PLAN.md)
  - [X] CI workflow + publish config
  - [X] Headless server documentation
  - [X] Install script + Homebrew formula
  - [X] Auto-update check
  - [X] Terminal setup + compatibility docs
  - [X] Accessibility improvements (ASCII/high-contrast)
  - [X] Performance benchmarks + docs
  - [X] Agent discovery modal

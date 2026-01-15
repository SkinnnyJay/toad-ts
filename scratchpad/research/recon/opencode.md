---
title: OpenCode Recon Brief
date: 2026-01-14
author: Agent
description: Recon reference for OpenCode patterns relevant to TOAD-TS
revision: v1.1.0
lastUpdated: 2026-01-14
status: active
---

# OpenCode Recon Brief

Document Role: Capture UX/architecture patterns from OpenCode to inform TOAD-TS.

## Purpose
- Borrow proven TUI layout and multi-panel interaction ideas.
- Identify pitfalls to avoid when adapting to Ink.

## Key Takeaways
- Multi-panel layout (chat/files/terminal) with command palette.
- Tool call surfacing: progress + outputs per pane.
- Provider abstraction (multi-model) via adapter layer.
- Keyboard navigation: pane focus, palette, history.

## Terminology
- Panels, Command Palette, Provider/Adapter, Task Runner, Output Pane.

## Risks / Quirks
- Over-cluttered layout if panes not virtualized; watch render perf.
- Focus management critical in Ink (use focus state + shortcuts).
- Streaming text + incremental tool updates need batching to avoid flicker.

## Run / Debug Notes (OpenCode)
- Uses multi-panel layout; map to Ink flex layout.
- Ensure resize handling; check for terminal size assumptions.

## Implementation Tips for TOAD-TS
- Implement pane router with focus ring + keyboard shortcuts.
- Stream output with diff-friendly updates (avoid full re-render).
- Use adapters for providers; keep ACP client isolated.
- Add palette for commands (new session, switch agent, run tool).

## References
- OpenCode repo: https://github.com/anomalyco/opencode

## Changelog
- v1.1.0 (2026-01-14): Initial recon brief created for OpenCode patterns.

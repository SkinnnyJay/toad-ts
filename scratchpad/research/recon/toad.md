---
title: TOAD Recon Brief
date: 2026-01-14
author: Agent
description: Recon reference for original TOAD patterns and gaps
revision: v1.1.0
lastUpdated: 2026-01-14
status: active
---

# TOAD Recon Brief

Document Role: Snapshot of the original TOAD (Python/Textual) patterns, gaps, and lessons relevant to TOAD-TS. Use alongside `scratchpad/spec.md`.

## Purpose
- Capture what worked in TOAD and what must change in TOAD-TS.
- Highlight gaps to close during reimplementation.

## Key Takeaways
- UI: Panel-based chat with tool viz; keyboard-first workflow.
- Transport: ACP over stdio; agent process lifecycle needs robust spawn/teardown.
- State: Session + message history; tool-call events interleave with streaming.
- Gaps: Limited replay/determinism, thin error handling, design debt around tool UI.

## Terminology
- Session, Agent, Content Block (text/code/tool/thinking), Tool Call, Transport (stdio JSON-RPC).

## Risks / Quirks
- Streaming edge cases: partial blocks, out-of-order tool-call updates.
- Process management: orphaned subprocesses if not killed on exit.
- Missing persistence: no durable session storage in original.

## Run / Debug Notes (original)
- Launch: `toad` (Python/Textual); watch for stdio stalls.
- Tooling: File/terminal handlers surfaced as tool calls; ensure confirmation paths exist.

## Implementation Tips for TOAD-TS
- Build explicit state machines for connection + streaming.
- Normalize content blocks with Zod schemas; brand IDs.
- Implement graceful shutdown (SIGINT/SIGTERM) to kill agent processes.
- Add replay hooks (persist prompts + tool calls) early.

## References
- Original repo: https://github.com/batrachianai/toad
- ACP spec: https://agentclientprotocol.com

## Changelog
- v1.1.0 (2026-01-14): Initial recon brief created for TOAD → TOAD-TS.

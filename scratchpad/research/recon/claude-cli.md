---
title: Claude CLI Recon Brief
date: 2026-01-14
author: Agent
description: Recon reference for Claude CLI behaviors and ACP flags
revision: v1.1.0
lastUpdated: 2026-01-14
status: active
---

# Claude CLI Recon Brief

Document Role: Practical notes for integrating Claude CLI via ACP in TOAD-TS.

## Purpose
- Summarize handshake, flags, and quirks for Claude CLI ACP usage.
- Provide test/run guidance for agents.

## Key Takeaways
- Use `claude --experimental-acp` to enable ACP stdio transport.
- Streaming: emits partials; final chunk includes `done`/stop reasons.
- Tool calls: arrive interleaved; confirm/deny paths may be required.
- Rate limits: expect backoff; add retry with jitter for transient errors.

## Terminology
- ACP handshake, Capability negotiation, ToolCall, ContentBlock, Session.

## Risks / Quirks
- Process may hang on exit if stdio not drained; send SIGINT then SIGKILL fallback.
- Missing heartbeat: add reconnect/backoff if no packets within timeout.
- Tool call args may be partial; validate against Zod schemas.

## Run / Debug Notes
- Launch: `claude --experimental-acp` (ensure `$PATH` and API key are set).
- Logging: capture stderr for debugging; use JSON-RPC tracing in dev mode.
- Timeouts: set read timeout ~30s; reconnect with exponential backoff (max cap).

## Implementation Tips for TOAD-TS
- Encapsulate process spawn in ACPConnection with state machine (disconnected/connecting/connected/error).
- Validate all inbound messages with schemas; drop/flag malformed.
- Support tool-call confirmation hook in UI; show progress + result blocks.
- Persist session + tool-call transcript for replay/diagnostics.

## References
- Claude CLI docs: https://docs.anthropic.com/claude-code
- ACP spec: https://agentclientprotocol.com

## Changelog
- v1.1.0 (2026-01-14): Initial recon brief created for Claude CLI integration.

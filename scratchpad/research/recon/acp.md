---
title: ACP Recon Brief
date: 2026-01-14
author: Agent
description: Recon reference for Agent Client Protocol usage in TOAD-TS
revision: v1.1.0
lastUpdated: 2026-01-14
status: active
---

# ACP Recon Brief

Document Role: ACP protocol essentials for TOAD-TS clients.

## Purpose
- Summarize ACP message shapes, handshake, and behaviors relevant to TOAD-TS.

## Key Takeaways
- Transport: JSON-RPC 2.0 over stdio/streams; strict IDs per call.
- Messages: `session/create`, `session/update`, `session/close`, `model/request`, `tool/output`.
- Streaming: partial content blocks; final chunk signals completion.
- Tool calls: request/response; may need user confirmation paths.

## Terminology
- SessionId, AgentId, MessageId, ToolCallId, ContentBlock, Capability.

## Risks / Quirks
- Out-of-order updates possible; buffer by message/tool IDs.
- Large payloads: implement size guards; truncate/ellipsize for UI.
- Error handling: standard JSON-RPC errors plus ACP-specific codes; map to user-friendly messages.

## Run / Debug Notes
- Enable verbose logging for JSON-RPC frames in dev.
- Add heartbeat/timeout handling to detect dead transports.
- Validate all inbound/outbound with Zod schemas to avoid runtime surprises.

## Implementation Tips for TOAD-TS
- Build typed client with discriminated unions for updates.
- State machine per session: disconnected/connecting/connected/error.
- Normalize content blocks (text/code/tool/thinking) before passing to UI.
- Provide hooks for reconnection and replay.

## References
- ACP spec: https://agentclientprotocol.com

## Changelog
- v1.1.0 (2026-01-14): Initial recon brief created for ACP usage.

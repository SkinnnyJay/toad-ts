---
title: Ink Recon Brief
date: 2026-01-14
author: Agent
description: Recon reference for Ink patterns and pitfalls
revision: v1.1.0
lastUpdated: 2026-01-14
status: active
---

# Ink Recon Brief

Document Role: Ink-specific guidance for TOAD-TS UI implementation.

## Purpose
- Capture best practices for Ink components, layout, and performance.

## Key Takeaways
- Layout: Use `<Box>` flex; avoid excessive nested renders; memoize heavy children.
- Input: `useInput` for global shortcuts; manage focus manually for forms.
- Lists: For large message lists, batch updates and consider windowing (custom).
- Rendering: Avoid frequent state updates; coalesce streaming chunks before setState.

## Terminology
- Box, Text, useInput, Focus management, Reconciliation (Ink fiber), Yoga layout.

## Risks / Quirks
- Frequent rerenders cause flicker; throttle streaming updates.
- stdout width/height changes require handling `useStdout` resize events.
- Unhandled promise rejections can crash process; wrap async hooks.

## Run / Debug Notes
- Use `INK_DEBUG=true` for diagnostics; inspect render tree.
- Test in different terminals (macOS Terminal, iTerm) for width handling.
- Snapshot tests with `ink-testing-library` for components.

## Implementation Tips for TOAD-TS
- Centralize UI state in Zustand selectors; pass minimal props.
- Create message/item components that accept derived data (avoid heavy logic inside).
- For streaming text, buffer in state machine and flush at intervals.
- Use consistent theming tokens; align with tool-call status indicators.

## References
- Ink docs: https://github.com/vadimdemedes/ink
- ink-testing-library: https://github.com/vadimdemedes/ink-testing-library

## Changelog
- v1.1.0 (2026-01-14): Initial recon brief created for Ink usage in TOAD-TS.

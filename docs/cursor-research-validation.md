# Cursor Research Validation (M1)

This document records the practical validation checks for the Cursor CLI integration research phase.

## Validation Matrix

| Research Question | Validation Method | Evidence |
| --- | --- | --- |
| NDJSON stream and partial-output behavior | Fixture-based parser and translator integration tests | `__tests__/integration/core/cursor-channels.integration.test.ts` (NDJSON fixture translation), `__tests__/unit/core/cursor-stream-parser.unit.test.ts` |
| Hook IPC latency feasibility | End-to-end Node hook shim routing test + direct IPC p95 latency assertion | `__tests__/integration/core/cursor-channels.integration.test.ts` (`HOOK_SHIM_ROUNDTRIP_MAX_MS = 500`, `HOOK_DIRECT_P95_MAX_MS = 50`) |
| Prompt spawn overhead target | Cursor session flow integration measures per-turn prompt wall time and enforces threshold | `__tests__/integration/core/cursor-session-flow.integration.test.ts` (`PROMPT_OVERHEAD_MAX_MS = 500`) |
| CLI command output parsing reliability | Parser unit tests for auth/model/UUID/key-value output forms | `__tests__/unit/core/cli-output-parser.unit.test.ts` |
| Cloud API endpoint accessibility and shape handling | Client tests for list/get/launch/followup/stop/delete/models/repos/conversation + retry and cache behavior | `__tests__/unit/core/cursor-cloud-agent-client.unit.test.ts`, `__tests__/unit/types/cursor-cloud-types.unit.test.ts` |

## Summary

The research checks are now encoded as executable tests and continuously validated in local runs. This keeps
protocol and endpoint assumptions test-backed instead of doc-only.

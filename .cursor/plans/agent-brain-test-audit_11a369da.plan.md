---
name: agent-brain-test-audit
overview: Produce an executive summary plus a detailed, quantifiable test matrix for agent/brain behaviors across unit, integration, E2E, and load tests; identify root-cause risks and define milestones with concrete tasks to close coverage gaps in mock and real LLM environments.
todos:
  - id: coverage-map
    content: Map existing tests to brain behaviors
    status: pending
  - id: root-cause-risks
    content: Identify root-cause risks in core modules
    status: pending
  - id: test-matrix
    content: Define scenarios and expected results
    status: pending
  - id: metrics-instrumentation
    content: Define quant metrics and instrumentation
    status: pending
  - id: missing-tests-backlog
    content: Backlog missing tests by level
    status: pending
  - id: milestones-roadmap
    content: Milestones and task roadmap
    status: pending
isProject: false
---

# Agent Brain Test Audit Plan

## Executive summary

- Strong coverage: memory storage/retrieval, basic message interactions, core chat flows.
- Partial coverage: sentiment, group/squad flows, DM behaviors, autonomy beyond tools.
- High-risk root causes: duplicate run scheduling, cognitive loop concurrency, memory
persistence gaps, timeout cleanup, and dedupe key lifecycle on worker restarts.
- Immediate needs: deterministic metrics, E2E behavior proofs, and concurrency tests
across mock and real LLM environments.

## Scope mapping (features -> code areas)

- Orchestration, scheduling, and concurrency: `[lib/features/orchestration/](lib/features/orchestration/)` (notably `[lib/features/orchestration/kybernetes.ts](lib/features/orchestration/kybernetes.ts)`)
- Cognition and thinking loop: `[lib/features/cognition/](lib/features/cognition/)`
- Memory and learning: `[lib/features/memory/](lib/features/memory/)`, `[lib/features/tools/](lib/features/tools/)`, `[lib/features/services/](lib/features/services/)`
- Deliberation and reasoning strategies: `[lib/features/deliberation/](lib/features/deliberation/)`, `[lib/features/strategos/](lib/features/strategos/)`
- Social dynamics (sentiment, relationships): `[lib/features/social-dynamics/](lib/features/social-dynamics/)`
- Agents and chats APIs: `[app/api/](app/api/)`
- Tests: unit + integration under `[__tests__/](__tests__/)` and E2E under `[__tests__/playwright/specs/](__tests__/playwright/specs/)`

## Coverage findings (current tests)

### Memory and learning

- Unit: `[__tests__/unit/lib/features/memory/memory-service.test.ts](__tests__/unit/lib/features/memory/memory-service.test.ts)`, `[__tests__/unit/lib/features/memory/storage/hybrid-memory-storage.test.ts](__tests__/unit/lib/features/memory/storage/hybrid-memory-storage.test.ts)`, `[__tests__/unit/lib/features/memory/storage/redis-memory-storage.test.ts](__tests__/unit/lib/features/memory/storage/redis-memory-storage.test.ts)`, `[__tests__/unit/lib/features/memory/storage/json-memory-storage.test.ts](__tests__/unit/lib/features/memory/storage/json-memory-storage.test.ts)`, `[__tests__/unit/lib/features/memory/storage/db-memory-storage.test.ts](__tests__/unit/lib/features/memory/storage/db-memory-storage.test.ts)`, `[__tests__/unit/lib/features/memory/relevance-based-memory.test.ts](__tests__/unit/lib/features/memory/relevance-based-memory.test.ts)`, `[__tests__/unit/lib/features/memory/cross-channel/cross-channel-memory.test.ts](__tests__/unit/lib/features/memory/cross-channel/cross-channel-memory.test.ts)`, `[__tests__/unit/lib/features/tools/services/memory.service.test.ts](__tests__/unit/lib/features/tools/services/memory.service.test.ts)`, `[__tests__/unit/lib/features/graph/graph-memory.service.test.ts](__tests__/unit/lib/features/graph/graph-memory.service.test.ts)`
- Integration: `[__tests__/integration/api/agents/memory/route.integration.test.ts](__tests__/integration/api/agents/memory/route.integration.test.ts)`, `[__tests__/integration/api/agents/memory/key/route.integration.test.ts](__tests__/integration/api/agents/memory/key/route.integration.test.ts)`, `[__tests__/integration/api/agents/memory/stats/route.integration.test.ts](__tests__/integration/api/agents/memory/stats/route.integration.test.ts)`, `[__tests__/integration/redis/memory-storage.test.ts](__tests__/integration/redis/memory-storage.test.ts)`, `[__tests__/integration/redis/redis-backend-memory.test.ts](__tests__/integration/redis/redis-backend-memory.test.ts)`, `[__tests__/integration/api/admin/analytics/memory.test.ts](__tests__/integration/api/admin/analytics/memory.test.ts)`
- E2E: `[__tests__/playwright/specs/memory/memory-agents.spec.ts](__tests__/playwright/specs/memory/memory-agents.spec.ts)`, `[__tests__/playwright/specs/memory/memory-channels.spec.ts](__tests__/playwright/specs/memory/memory-channels.spec.ts)`, `[__tests__/playwright/specs/memory/memory-commands.spec.ts](__tests__/playwright/specs/memory/memory-commands.spec.ts)`, `[__tests__/playwright/specs/memory/memory-dms.spec.ts](__tests__/playwright/specs/memory/memory-dms.spec.ts)`, `[__tests__/playwright/specs/memory/memory-messaging.spec.ts](__tests__/playwright/specs/memory/memory-messaging.spec.ts)`, `[__tests__/playwright/specs/memory/memory-retrieval.spec.ts](__tests__/playwright/specs/memory/memory-retrieval.spec.ts)`, `[__tests__/playwright/specs/memory/memory-storage.spec.ts](__tests__/playwright/specs/memory/memory-storage.spec.ts)`, `[__tests__/playwright/specs/26-memory-commands.spec.ts](__tests__/playwright/specs/26-memory-commands.spec.ts)`
- Gaps: compression/expiration edge cases, conflict resolution, embedding failures, retrieval performance and recall quality under load.

### Autonomy

- Unit: `[__tests__/unit/lib/features/tools/autonomy-tools.test.ts](__tests__/unit/lib/features/tools/autonomy-tools.test.ts)`
- Gaps: no integration or E2E tests for proactive actions, goal pursuit, scheduled actions, or autonomy limits.

### Sentiment (“gets mad”)

- Unit: `[__tests__/unit/lib/features/social-dynamics/utils.test.ts](__tests__/unit/lib/features/social-dynamics/utils.test.ts)`, `[__tests__/unit/lib/features/social-dynamics/relationship.service.test.ts](__tests__/unit/lib/features/social-dynamics/relationship.service.test.ts)`, `[__tests__/unit/lib/features/orchestration/post-run-operations.service.test.ts](__tests__/unit/lib/features/orchestration/post-run-operations.service.test.ts)`, `[__tests__/unit/lib/features/orchestration/system-prompt-builder.service.test.ts](__tests__/unit/lib/features/orchestration/system-prompt-builder.service.test.ts)`, `[__tests__/unit/lib/features/orchestration/kybernetes.test.ts](__tests__/unit/lib/features/orchestration/kybernetes.test.ts)`, `[__tests__/unit/lib/core/types/api/message-metadata.test.ts](__tests__/unit/lib/core/types/api/message-metadata.test.ts)`
- Integration: `[__tests__/integration/api/chats/[id]/sentiment/route.test.ts](__tests__/integration/api/chats/[id]/sentiment/route.test.ts)`
- Gaps: no E2E validation of sentiment-driven behavior, no sentiment decay tests, and no admin UI validation.

### Group and squads

- Unit: `[__tests__/unit/lib/services/squad.service.test.ts](__tests__/unit/lib/services/squad.service.test.ts)`, `[__tests__/unit/lib/shared/validations/squad.schemas.test.ts](__tests__/unit/lib/shared/validations/squad.schemas.test.ts)`, `[__tests__/unit/lib/features/orchestration/squad-mentions.test.ts](__tests__/unit/lib/features/orchestration/squad-mentions.test.ts)`, `[__tests__/unit/lib/infrastructure/http/client-squads.test.ts](__tests__/unit/lib/infrastructure/http/client-squads.test.ts)`
- Integration: `[__tests__/integration/api/squads/route.test.ts](__tests__/integration/api/squads/route.test.ts)`, `[__tests__/integration/api/squads/[id]/route.test.ts](__tests__/integration/api/squads/[id]/route.test.ts)`, `[__tests__/integration/api/squads/[id]/agents/route.test.ts](__tests__/integration/api/squads/[id]/agents/route.test.ts)`, `[__tests__/integration/api/chats/[id]/squads/route.test.ts](__tests__/integration/api/chats/[id]/squads/route.test.ts)`
- E2E: `[__tests__/playwright/specs/36-agent-squads.spec.ts](__tests__/playwright/specs/36-agent-squads.spec.ts)`
- Gaps: coordination logic, consensus or voting behavior, shared memory policies, and conflict resolution.

### Direct messages (DMs)

- Unit: `[__tests__/unit/lib/services/social-dynamics.service.test.ts](__tests__/unit/lib/services/social-dynamics.service.test.ts)`, `[__tests__/unit/lib/services/analytics.service.test.ts](__tests__/unit/lib/services/analytics.service.test.ts)`
- Integration: `[__tests__/integration/api/admin/social-dynamics/dms/route.test.ts](__tests__/integration/api/admin/social-dynamics/dms/route.test.ts)`, `[__tests__/integration/api/admin/social-dynamics/config.integration.test.ts](__tests__/integration/api/admin/social-dynamics/config.integration.test.ts)`
- E2E: `[__tests__/playwright/specs/memory/memory-dms.spec.ts](__tests__/playwright/specs/memory/memory-dms.spec.ts)` (API flows; UI coverage limited or skipped)
- Gaps: DM UI flows, agent-to-agent DM routing, DM isolation, notification/badge behavior.

### Interactions, reactions, and conversation flow

- Unit: `[__tests__/unit/lib/services/message.service.test.ts](__tests__/unit/lib/services/message.service.test.ts)`, `[__tests__/unit/lib/features/tools/react-to-message-tool.test.ts](__tests__/unit/lib/features/tools/react-to-message-tool.test.ts)`, `[__tests__/unit/lib/features/services/feedback-learning.test.ts](__tests__/unit/lib/features/services/feedback-learning.test.ts)`, `[__tests__/unit/lib/features/orchestration/database-context.service.test.ts](__tests__/unit/lib/features/orchestration/database-context.service.test.ts)`, `[__tests__/unit/lib/shared/validations/primitives.test.ts](__tests__/unit/lib/shared/validations/primitives.test.ts)`, `[__tests__/unit/hooks/page/useMessageActions.test.ts](__tests__/unit/hooks/page/useMessageActions.test.ts)`, `[__tests__/unit/components/chat/message-list.test.tsx](__tests__/unit/components/chat/message-list.test.tsx)`
- Integration: `[__tests__/integration/api/messages/interactions/route.test.ts](__tests__/integration/api/messages/interactions/route.test.ts)`
- E2E: `[__tests__/playwright/specs/13-messaging.spec.ts](__tests__/playwright/specs/13-messaging.spec.ts)`, `[__tests__/playwright/specs/messaging/message-interactions.spec.ts](__tests__/playwright/specs/messaging/message-interactions.spec.ts)`
- Gaps: interaction analytics, undo/redo, rate limits, learning impact verification.

### Thinking, exploration, deliberation, strategos

- Coverage found is minimal or non-dedicated in E2E; requires targeted integration tests around thinking routes and deliberation workflows.
- Gaps: no explicit proof of multi-phase deliberation outcomes, strategic fallback behavior, or exploration tool behaviors end-to-end.

## Root-cause risks (priority and file anchors)

### High priority

- Duplicate run scheduling: check-then-enqueue gap in `[lib/features/orchestration/kybernetes.ts](lib/features/orchestration/kybernetes.ts)` can allow duplicates under concurrency.
- Cognitive loop overlap: in-memory guard in `[lib/features/cognition/cognitive-pipeline.ts](lib/features/cognition/cognitive-pipeline.ts)` does not protect multi-instance concurrency.
- Memory limit enforcement race: concurrent `storeMemory()` in `[lib/features/memory/memory-service.ts](lib/features/memory/memory-service.ts)` can over-evict or miscount.
- Turn counter drift: lock fallback in `[lib/features/orchestration/kybernetes.ts](lib/features/orchestration/kybernetes.ts)` risks stale adaptive delays.

### Medium priority

- Memory persistence gap: Redis write succeeds but DB write fails in `[lib/features/memory/storage/index.ts](lib/features/memory/storage/index.ts)` leading to data loss on eviction.
- Dedupe lifecycle leakage: dedupe keys in `[lib/features/orchestration/BullMQAgentRunQueue.ts](lib/features/orchestration/BullMQAgentRunQueue.ts)` risk stale state after worker restart.
- Deliberation audit volatility: in-memory chain-of-custody in `[lib/features/deliberation/orchestrator.ts](lib/features/deliberation/orchestrator.ts)` can be lost on restart.
- Run timeout cleanup: timers stored in Map in `[lib/features/orchestration/run-timeout.service.ts](lib/features/orchestration/run-timeout.service.ts)` may leak on crash.

### Low priority

- Thought lifecycle growth: unbounded in-memory Map in `[lib/features/cognition/thought-lifecycle.service.ts](lib/features/cognition/thought-lifecycle.service.ts)`.
- Post-run error visibility: errors in `[lib/features/orchestration/post-run-operations.service.ts](lib/features/orchestration/post-run-operations.service.ts)` are swallowed after logging, risking silent regressions.

## Test matrix (scenarios, parameters, results, metrics)

### Memory and learning


| Scenario                | Parameters / variations          | Expected result                               | Metrics                                      | Test level         | Env         |
| ----------------------- | -------------------------------- | --------------------------------------------- | -------------------------------------------- | ------------------ | ----------- |
| Long-term recall        | 7, 30, 90-day memory windows     | Recall correct fact without user re-prompt    | Recall precision >= 0.8; false recall <= 0.1 | Integration + E2E  | Mock + real |
| Cross-channel recall    | Same user, different chat        | Memory retrieved with channel isolation rules | Cross-channel recall precision >= 0.8        | Integration + E2E  | Mock + real |
| DM memory isolation     | DM vs public chat                | DM memories never leak to public chat         | Leakage rate = 0                             | Integration + E2E  | Mock + real |
| Memory overwrite        | Same key, conflicting value      | Latest memory wins with audit trail           | Correct overwrite rate = 1.0                 | Unit + Integration | Mock        |
| Compression under limit | Memory cap triggered             | Summary produced, key facts retained          | Retention score >= 0.7                       | Unit + Integration | Mock        |
| Embedding failures      | Forced embedding error           | Fallback path returns stable behavior         | Error rate handled = 100%                    | Unit + Integration | Mock        |
| Retrieval under load    | 1k memories, 10 concurrent reads | Low latency, stable ranking                   | P95 retrieval < 300ms                        | Load + Integration | Mock + real |


### Sentiment and “gets mad”


| Scenario                 | Parameters / variations  | Expected result                               | Metrics                             | Test level        | Env         |
| ------------------------ | ------------------------ | --------------------------------------------- | ----------------------------------- | ----------------- | ----------- |
| Negative sentiment spike | User uses hostile prompt | Sentiment score shifts negative and is logged | Sentiment delta <= -0.5             | Integration + E2E | Mock + real |
| De-escalation            | Follow-up polite prompt  | Sentiment improves over 3 turns               | Delta recovery >= +0.3              | Integration + E2E | Mock + real |
| Behavior coupling        | Negative sentiment       | Agent response tone changes within policy     | Policy compliance = 100%            | E2E               | Real        |
| Sentiment decay          | No input for 24h         | Sentiment decays toward neutral               | Decay rate within configured bounds | Integration       | Mock        |


### Autonomy


| Scenario          | Parameters / variations    | Expected result                 | Metrics                     | Test level         | Env         |
| ----------------- | -------------------------- | ------------------------------- | --------------------------- | ------------------ | ----------- |
| Scheduled action  | Autonomy scheduler enabled | Agent runs without user input   | Action success rate >= 0.95 | Integration + E2E  | Mock + real |
| Goal pursuit      | Multi-step objective       | Agent completes objective steps | Completion rate >= 0.8      | Integration        | Real        |
| Autonomy limits   | Hard cap on runs           | Agent stops after cap           | Cap compliance = 100%       | Unit + Integration | Mock        |
| Proactive message | Idle chat threshold        | Agent sends proactive message   | P95 trigger latency < 60s   | E2E                | Real        |


### Group, squads, and prompted in a group


| Scenario             | Parameters / variations | Expected result                  | Metrics                  | Test level        | Env         |
| -------------------- | ----------------------- | -------------------------------- | ------------------------ | ----------------- | ----------- |
| Squad prompt fan-out | @squad mention          | All agents in squad respond      | Response coverage >= 0.9 | Integration + E2E | Mock + real |
| Conflict resolution  | Agents disagree         | Final response resolves conflict | Consensus rate >= 0.7    | Integration       | Real        |
| Shared memory policy | Shared vs isolated      | Memory access follows policy     | Policy compliance = 100% | Integration       | Mock        |
| Group latency        | 5-10 agents             | Responses within SLA             | P95 group response < 10s | Load + E2E        | Mock + real |


### Conversation quality and interaction


| Scenario               | Parameters / variations    | Expected result                   | Metrics                                | Test level               | Env  |
| ---------------------- | -------------------------- | --------------------------------- | -------------------------------------- | ------------------------ | ---- |
| Multi-turn coherence   | 10+ turns                  | Agent keeps context without drift | Coherence score >= 0.75                | E2E                      | Real |
| Reaction tool usage    | Upvote/downvote            | Reaction stored and reflected     | Reaction success rate = 1.0            | Unit + Integration + E2E | Mock |
| Feedback learning      | Repeated negative feedback | Agent reduces similar mistakes    | Negative feedback rate improves >= 10% | Integration              | Real |
| Interaction rate limit | Burst reactions            | Rate limits enforce consistently  | Block rate = expected                  | Integration              | Mock |


### DM flows


| Scenario       | Parameters / variations | Expected result                   | Metrics                    | Test level        | Env         |
| -------------- | ----------------------- | --------------------------------- | -------------------------- | ----------------- | ----------- |
| DM creation UI | User starts DM          | DM thread created and visible     | Flow success = 1.0         | E2E               | Mock + real |
| DM routing     | Agent-to-agent DM       | Messages routed to correct thread | Routing accuracy = 1.0     | Integration + E2E | Mock        |
| DM isolation   | DM and group chat       | No cross-thread leakage           | Leakage rate = 0           | Integration + E2E | Mock + real |
| DM memory      | DM recall               | DM-only memories retrievable      | DM recall precision >= 0.8 | Integration + E2E | Mock + real |


### Thinking, exploration, deliberation, strategos


| Scenario              | Parameters / variations      | Expected result                      | Metrics                      | Test level         | Env         |
| --------------------- | ---------------------------- | ------------------------------------ | ---------------------------- | ------------------ | ----------- |
| Thinking session      | `/thinking` start + continue | Session persisted and resumed        | Session success rate >= 0.95 | Integration + E2E  | Mock + real |
| Deliberation workflow | Collect → review → judge     | All phases complete with audit trail | Phase success = 1.0          | Integration        | Mock        |
| Strategos fallback    | Advanced strategy fails      | Falls back to Standard               | Fallback rate = 1.0          | Unit + Integration | Mock        |
| Exploration tool      | Tool invoked from prompt     | Tool output stored and referenced    | Tool success rate >= 0.95    | Integration + E2E  | Mock + real |


## Quantification and instrumentation

- Define standard metrics contract for all agent runs: `runId`, `agentId`, `latencyMs`, `tokensIn`, `tokensOut`, `memoryReads`, `memoryWrites`, `sentimentDelta`, `strategyUsed`, `autonomyTrigger`.
- Aggregate by environment: mock vs real LLM. Track drift between mock and real with delta thresholds.
- Record pass/fail criteria in test outputs and log summaries to enable dashboarding.

## Missing tests backlog (by level)

### Unit

- Memory compression retention scoring and expiration edge cases.
- Strategos fallback and error handling coverage for each strategy.
- Cognition pipeline guard behavior under concurrent ticks.

### Integration

- Concurrency race tests for scheduling dedupe, turn counters, memory limits.
- Sentiment decay and behavior coupling.
- DM routing and isolation rules.
- Deliberation phase integrity and chain-of-custody behavior.

### E2E

- DM UI flows and DM memory retrieval.
- Sentiment-driven behavior changes in chat.
- Autonomy proactive messages and scheduled tasks.
- Group chat with multiple agents responding to @mentions.

### Load

- Run scheduling under burst load with dedupe validation.
- Memory retrieval latency under large memory sets.
- Group response latency with 5-10 agents.

## Milestones and tasks

### Milestone 1: Coverage proof and metrics baseline

- Produce a coverage matrix and gap summary for all brain behaviors.
- Define pass/fail thresholds for each metric and scenario.
- Create instrumentation for run metrics and sentiment/memory deltas.

### Milestone 2: Behavior fidelity proofs (mock + real LLM)

- Add E2E tests for DM UI flows, sentiment response changes, and autonomy triggers.
- Add integration tests for group coordination and strategic fallback behavior.
- Validate memory retention and cross-channel isolation at 7/30/90-day windows.

### Milestone 3: Concurrency and resilience

- Add race-condition tests for scheduling, turn counters, and cognitive pipeline.
- Add timeout and retry resilience tests for LLM provider failures.
- Validate dedupe behavior across worker restarts and queue backpressure.

### Milestone 4: Performance and stability

- Load tests for scheduling throughput and memory retrieval latency.
- Group response time SLAs and stability under multi-agent load.
- Drift monitoring between mock and real LLM behavior with thresholds.

## Plan of work

1. Inventory existing tests and map them to behaviors.
  - Catalog current coverage by scanning `[__tests__/](__tests__/)` and `[__tests__/playwright/specs/](__tests__/playwright/specs/)`, grouping by behavior and test level.
  - Output: coverage matrix showing which behaviors are already tested and at what depth.
2. Audit critical code paths for behavior guarantees and failure modes.
  - Review orchestration, cognition, memory, deliberation, strategos, and social-dynamics modules for concurrency, persistence, and fallback risks.
  - Output: root-cause risk list with file anchors for each risk.
3. Define quantifiable metrics per behavior and scenario.
  - Example metrics: sentiment delta thresholds for “mad”, memory retention window accuracy, recall precision/recall, autonomy action rates, group coordination latency, DM isolation guarantees, interaction learning impact.
  - Output: metrics table that is testable in mock and real LLM modes.
4. Design missing tests by level and environment.
  - Draft new tests where coverage is partial or missing (notably autonomy, DM UI flows, group coordination, sentiment E2E, concurrency races).
  - Output: test backlog with file targets and expected assertions.
5. Produce milestones and tasks.
  - Milestones align to foundational correctness, behavior fidelity, and production readiness.
  - Output: milestone roadmap with ordered tasks and estimates.

## Initial gap hotspots (from current scan)

- Autonomy: largely unit-level only; missing E2E and decision logic validation.
- DMs: mostly analytics/API coverage; missing UI flows and agent-to-agent DM behavior.
- Group/squad: CRUD and mention handling; missing coordination/consensus tests.
- Sentiment: API-level only; missing behavior impact and UI validation.
- Concurrency risks: scheduling dedupe, turn counters, cognitive loop overlap.

## Milestones

1. **Baseline coverage report**: complete test inventory + mapping + executive summary.
2. **Behavior fidelity**: add/plan tests for autonomy, DM UI, group coordination, sentiment E2E.
3. **Concurrency + reliability**: race-condition tests for scheduling, memory storage, cognitive loop, timeouts.
4. **Quantifiable metrics**: finalize metrics and thresholds for mock + real LLM validation.


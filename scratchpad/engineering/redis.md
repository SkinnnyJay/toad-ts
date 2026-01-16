# Redis Fronting SQLite – Caching Strategy Notes

## Context
- Primary persistence: SQLite (worker-thread backed, FTS5 enabled) for chat/session storage.
- Ask: Should we put Redis in front of SQLite for memory chat persistence?
- Current use case: terminal-first, mostly single-user sessions; harness + ACP stack.

## Option A: SQLite Only (Recommended for now)
- Pros: simplest ops, zero extra service, WAL-mode already fast, FTS5 built-in, no cache coherency issues.
- Cons: single-node file; multi-process coordination via file locks; disk-bound reads/writes (but fine for chat scale).

## Option B: Redis Cache in Front of SQLite
- Pros: 
  - Hot-path speedups (in-memory, ~100k ops/sec). 
  - Shared cache across multiple app instances/terminal windows. 
  - Pub/Sub for live updates; TTL and eviction controls.
- Cons: 
  - Extra infra/service + monitoring; network latency. 
  - Cache invalidation complexity, stale data risk. 
  - More config surface (auth, TLS, eviction policy, persistence).

## When Redis Makes Sense
- Multi-instance / collaborative sessions that must share state in real time.
- Very high read/write throughput beyond SQLite + WAL. 
- Need for pub/sub signals to multiple UIs.

## Hybrid Path (Optional, Future)
- Keep `PersistenceProvider` interface and add optional cache decorator:
  - `withCache(redisConfig): CachedPersistenceProvider` wrapping SQLite provider.
  - Cache: session snapshot, recent messages, search results; TTL + version/etag to avoid staleness.
- Keep Redis optional behind config flag (`PERSISTENCE_CACHE=redis`).

## Recommendation (Now)
- Ship SQLite-only; it meets current terminal chat needs with lowest complexity.
- Defer Redis until a concrete multi-instance/collaboration or perf requirement appears.
- If needed later: add opt-in Redis cache decorator, not mandatory dependency.

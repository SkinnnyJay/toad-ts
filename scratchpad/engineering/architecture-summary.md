# TOADSTOOL Architecture Summary

## Current State

✅ **Implemented**:
- Token optimizer system (well-architected with DI, strategies, telemetry)
- Environment utilities
- Logging infrastructure

❌ **Missing**:
- CLI entry point (`src/cli.ts`)
- UI layer (Ink components)
- State management (Zustand store)
- Provider abstractions (ACP-compatible agents)
- Session persistence

## Key Architectural Decisions

1. **Provider Abstraction**: TypeScript interfaces (ports) for multi-provider support
2. **State Management**: Zustand (minimal, TypeScript-first)
3. **Session Storage**: File-based JSON (`~/.config/toad/sessions/`)
4. **Token Optimization**: Opt-in middleware (not always-on)
5. **Streaming**: Real-time chunk rendering (no buffering)
6. **DI Pattern**: Factory functions (no container library)

## Performance Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| App Startup | < 200ms | < 500ms | < 1s |
| Session Load | < 100ms | < 300ms | < 500ms |
| Stream Chunk Render | < 16ms | < 50ms | < 100ms |
| Token Optimization | < 50ms | < 200ms | < 500ms |

## Critical Interfaces

### Provider Interface
```typescript
interface Provider {
  sendMessage(options: SendMessageOptions): Promise<ProviderResponse>;
  streamMessage(options: SendMessageOptions, onChunk: (chunk: StreamChunk) => void): Promise<ProviderResponse>;
  cancelRequest(requestId: string): Promise<void>;
}
```

### Session Storage
```typescript
interface SessionStorage {
  save(session: Session): Promise<void>;
  load(sessionId: string): Promise<Session | null>;
  list(): Promise<readonly Session[]>;
}
```

## Implementation Phases

1. **Phase 1** (Week 1-2): ACP connection + provider abstraction
2. **Phase 2** (Week 2-3): Zustand store + session persistence + session modes
3. **Phase 3** (Week 3-4): UI layer (Ink components + content blocks)
4. **Phase 4** (Week 4-5): Tool system + approvals, slash commands, MCP integration
5. **Phase 5** (Week 5-6): Search & indexing (rg JSON + file index)
6. **Phase 6** (Week 7): Multi-agent features, rich content, documentation, release

## Next Steps

1. Define `AgentConnection` interface for ACP + future direct providers
2. Implement `src/core/acp-connection.ts` JSON-RPC stdio client
3. Add session mode handling + tool approval model
4. Wire content block rendering (code/resource/resource_link)
5. Add MCP server configuration path

See `docs/architecture.md` for full details.

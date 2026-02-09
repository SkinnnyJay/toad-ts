# TOADSTOOL Architecture Patterns

## Core Architecture

### ACP Protocol Layer (`src/core/`)

- `acp-client.ts` -- ACP protocol client for agent communication
- `acp-connection.ts` -- Connection lifecycle (connect, disconnect, reconnect)
- `acp-agent-port.ts` / `agent-port.ts` -- Agent port abstraction
- `session-stream.ts` -- Real-time streaming message handler
- `message-handler.ts` -- Message processing pipeline
- `session-manager.ts` -- Session CRUD operations

### Harness System (`src/harness/`)

- `harnessRegistry.ts` -- Registry of available agent harnesses
- `harnessAdapter.ts` -- Adapter pattern for different CLI agents
- `claude-cli-harness.ts` -- Claude CLI process management
- `mock-harness.ts` -- Mock harness for testing

### State Management (`src/store/`)

- **Zustand** for all state management (not Redux or Context API)
- `app-store.ts` -- Single global store (sessions, messages, connection, UI)
- `session-persistence.ts` -- Session save/restore lifecycle
- `persistence/` -- SQLite (primary) + JSON (fallback) providers
- `settings/` -- User preferences with schema validation

### UI Layer (`src/ui/`)

- **Ink** (React for CLIs) for terminal UI rendering
- `components/` -- 30+ components (App, Chat, MessageList, Sidebar, etc.)
- `hooks/` -- Custom hooks (keyboard shortcuts, sessions, scroll state, tools)
- `theme.ts` -- Centralized design tokens and color palette
- `status-colors.ts` -- Status-to-color mapping functions

### Constants System (`src/constants/`)

- 40+ typed constant modules for all domain values
- Pattern: `as const` objects with derived `typeof` types
- Used in Zod schemas, switch statements, and type definitions
- Never use string literals for status/state values in control flow

## Data Flow

```
User Input -> App (Ink) -> Store (Zustand) -> ACP Client -> Agent Harness -> CLI Process
                                                    |
Agent Response <- Session Stream <- ACP Connection <-+
       |
UI Update <- Store Update <- Message Handler
```

## Persistence Flow

```
Store State -> Session Persistence -> Persistence Manager
                                        |
                              SQLite Provider (primary)
                              JSON Provider (fallback)
```

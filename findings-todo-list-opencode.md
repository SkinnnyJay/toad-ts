# OpenCode Todo Feature Analysis

## Overview
This document contains findings from analyzing the Todo feature implementation in the OpenCode reference codebase located at `./ref/opencode/`. The analysis was conducted to understand the architecture and implementation patterns for potential adaptation to the TOADSTOOL project.

## Architecture Components

### 1. Core Data Model
**Location:** `packages/opencode/src/session/todo.ts`

The Todo system uses a namespace pattern with Zod schemas for validation:

```typescript
export namespace Todo {
  export const Info = z.object({
    content: z.string().describe("Brief description of the task"),
    status: z.string().describe("Current status of the task: pending, in_progress, completed, cancelled"),
    priority: z.string().describe("Priority level of the task: high, medium, low"),
    id: z.string().describe("Unique identifier for the todo item"),
  });
  export type Info = z.infer<typeof Info>;
}
```

**Key Features:**
- Four status states: `pending`, `in_progress`, `completed`, `cancelled`
- Three priority levels: `high`, `medium`, `low`
- Each todo has a unique ID for tracking
- Content field for task description

### 2. Storage Layer
**Location:** `packages/opencode/src/storage/storage.ts`

The storage system provides persistent file-based storage with these characteristics:

- **File Format:** JSON files stored at `~/.opencode/todo/{sessionID}.json`
- **Locking Mechanism:** Uses file locks for concurrent access safety
- **Error Handling:** Custom `NotFoundError` for missing resources
- **Key-Value Structure:** Todos stored with composite keys `["todo", sessionID]`

**Storage Methods:**
```typescript
export async function write<T>(key: string[], content: T)
export async function read<T>(key: string[])
export async function update<T>(key: string[], fn: (draft: T) => void)
```

### 3. Event System
**Location:** `packages/opencode/src/bus/` and `packages/opencode/src/session/todo.ts`

The event system enables real-time updates across the application:

```typescript
export const Event = {
  Updated: BusEvent.define(
    "todo.updated",
    z.object({
      sessionID: z.string(),
      todos: z.array(Info),
    })
  ),
};
```

**Event Flow:**
1. Todo changes trigger `Storage.write()`
2. After storage, `Bus.publish(Event.Updated, data)` is called
3. UI components subscribe to events for real-time updates

### 4. Tool Integration
**Location:** `packages/opencode/src/tool/todo.ts`

Two tools are exposed for AI agent interaction:

#### TodoWriteTool
- **Purpose:** Create or update the entire todo list
- **Parameters:** Array of todo objects
- **Permissions:** Requires `todowrite` permission
- **Returns:** Updated todo count and full list

#### TodoReadTool
- **Purpose:** Query current todo list
- **Parameters:** None (uses session context)
- **Permissions:** Requires `todoread` permission
- **Returns:** Current todo list and active count

**Tool Registration:**
Tools are registered in `packages/opencode/src/tool/registry.ts` and made available to AI agents through the provider abstraction layer.

### 5. UI Components
**Location:** `packages/opencode/src/cli/cmd/tui/component/todo-item.tsx`

The terminal UI component renders todos with visual indicators:

```typescript
export function TodoItem(props: TodoItemProps) {
  // Status indicators:
  // ✓ for completed
  // • for in_progress
  // blank for pending

  // Color coding:
  // - in_progress: warning color (yellow)
  // - other states: muted text color
}
```

**UI Integration Points:**
- Sidebar panel: `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx`
- Session view: `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`
- Web share view: `packages/web/src/components/share/part.tsx`

### 6. Tool Descriptions
**Location:** `packages/opencode/src/tool/todowrite.txt`

The TodoWrite tool includes comprehensive usage instructions for AI agents:

- **When to use:** Complex multi-step tasks, non-trivial operations, user-provided task lists
- **When NOT to use:** Single trivial tasks, conversational requests
- **Task states:** `pending`, `in_progress`, `completed`, `cancelled`
- **Management rules:** Only one task `in_progress` at a time, immediate status updates

## Data Flow Patterns

### Create/Update Flow
```
AI Agent → TodoWriteTool → Todo.update() → Storage.write() → Bus.publish() → UI Update
```

### Read Flow
```
AI Agent → TodoReadTool → Todo.get() → Storage.read() → Return Data
```

### UI Subscription Flow
```
Bus Event → UI Component Listener → Re-render → Display Update
```

## Key Design Patterns

### 1. Namespace Pattern
The code uses TypeScript namespaces to group related functionality:
```typescript
export namespace Todo {
  export const Info = z.object({...});
  export const Event = {...};
  export async function update() {...}
  export async function get() {...}
}
```

### 2. Tool Definition Pattern
Tools follow a consistent definition pattern:
```typescript
Tool.define("toolname", {
  description: string | imported_text,
  parameters: zod_schema,
  async execute(params, context) {...}
})
```

### 3. Permission System
Every tool operation requires permission checks:
```typescript
await ctx.ask({
  permission: "todowrite",
  patterns: ["*"],
  always: ["*"],
  metadata: {},
});
```

### 4. Event-Driven Architecture
Loose coupling between storage and UI through events:
- Storage layer publishes events after changes
- UI components subscribe to relevant events
- No direct dependencies between layers

## Implementation Insights

### Strengths
1. **Clean Separation of Concerns:** Clear boundaries between tools, business logic, storage, and UI
2. **Type Safety:** Extensive use of Zod for runtime validation
3. **Event-Driven Updates:** Real-time UI synchronization without polling
4. **Session Isolation:** Each session has its own todo list
5. **AI-Friendly:** Detailed tool descriptions guide AI behavior

### Considerations for TOADSTOOL Implementation
1. **Storage Choice:** Consider SQLite (already in dependencies) for better query capabilities
2. **State Management:** Leverage Zustand for client-side state management
3. **UI Framework:** Adapt to Ink components for terminal rendering
4. **Session Management:** Integrate with existing TOADSTOOL session system
5. **Provider Compatibility:** Ensure tools work with multiple AI providers (Claude, OpenAI, etc.)

## File Structure Summary

```
packages/opencode/
├── src/
│   ├── tool/
│   │   ├── todo.ts          # Tool definitions
│   │   ├── todowrite.txt    # AI instructions
│   │   └── todoread.txt     # Read tool description
│   ├── session/
│   │   └── todo.ts          # Business logic & data model
│   ├── storage/
│   │   └── storage.ts       # Persistence layer
│   ├── bus/
│   │   └── bus-event.ts     # Event system
│   └── cli/cmd/tui/
│       └── component/
│           └── todo-item.tsx # UI component
```

## Recommended Implementation Approach for TOADSTOOL

### Phase 1: Core Infrastructure
- Implement Todo model with Zod schemas
- Create storage service (SQLite or file-based)
- Set up event bus for real-time updates

### Phase 2: Business Logic
- Implement CRUD operations
- Add session-scoped todo management
- Handle status transitions and validation

### Phase 3: Tool Integration
- Create TodoWrite and TodoRead tools
- Register with ACP provider system
- Add comprehensive tool descriptions

### Phase 4: UI Components
- Build Ink-based todo components
- Integrate with existing TUI layout
- Add keyboard shortcuts for quick updates

### Phase 5: State Management
- Implement Zustand store for todos
- Handle optimistic updates
- Subscribe to event bus for sync

### Phase 6: Testing & Polish
- Unit tests for all layers
- Integration tests for tool usage
- E2E tests for complete workflows
- Performance optimization for large lists

## Conclusion

The OpenCode todo implementation provides a solid architectural foundation with clean separation of concerns, type safety, and event-driven updates. The patterns can be adapted to TOADSTOOL's TypeScript/Ink/Zustand stack while maintaining the core benefits of the design.
# TOADSTOOL Test Plan

This document outlines the test implementation plan based on user stories documented in `USER_STORIES.md`.

---

## Test Coverage Goals

- **Unit Tests**: 95%+ coverage for all UI components and utilities
- **Integration Tests**: All user workflows covered
- **E2E Tests**: Critical user journeys validated

---

## Test Implementation Status

### ✅ Completed Tests

| Test File | Coverage | Status |
|-----------|----------|--------|
| `__tests__/unit/ui/chat-components.unit.test.ts` | Slash commands, read-only mode | ✅ Complete |
| `__tests__/unit/ui/agent-select.unit.test.ts` | Agent selection UI | ✅ Complete |
| `__tests__/integration/core/session-stream.integration.test.ts` | Streaming responses | ✅ Complete |
| `__tests__/integration/store/session-persistence.integration.test.ts` | Session persistence | ✅ Complete |
| `__tests__/integration/ui/app-session-flow.integration.test.ts` | Session creation | ✅ Complete |

### 🚧 In Progress

| Test File | Coverage | Status |
|-----------|----------|--------|
| `__tests__/integration/ui/agent-switching.integration.test.ts` | Agent switching (Ctrl+P) | 🚧 Created |
| `__tests__/integration/ui/messaging.integration.test.ts` | Message sending and streaming | 🚧 Created |
| `__tests__/e2e/cli-launch.e2e.test.ts` | CLI launch scenarios | 🚧 Placeholder |

### 📋 To Be Created

#### High Priority (Core Functionality)

1. **Message History** (`__tests__/unit/ui/message-list.unit.test.ts`)
   - US-009: View message history
   - Test message ordering, scrolling, visual distinction

2. **Input History** (`__tests__/unit/ui/input-history.unit.test.ts`)
   - US-011: Navigate input history (↑/↓)
   - Test history navigation, wrapping, preservation

3. **Multi-line Input** (`__tests__/unit/ui/multi-line-input.unit.test.ts`)
   - US-010: Multi-line message input
   - Test Shift+Enter behavior, multi-line preservation

4. **Session Management** (`__tests__/integration/ui/session-management.integration.test.ts`)
   - US-016: Create new session (Ctrl+N)
   - US-017: Switch between sessions
   - Test session creation, switching, state preservation

5. **Keyboard Shortcuts** (`__tests__/unit/ui/keyboard-shortcuts.unit.test.ts`)
   - US-019: Clear screen (Ctrl+L)
   - US-020: Cancel request (Escape)
   - Test all keyboard shortcuts

#### Medium Priority (User Experience)

6. **Markdown Rendering** (`__tests__/unit/ui/markdown-rendering.unit.test.ts`)
   - US-022: View markdown-formatted responses
   - Test markdown parsing, formatting, lists

7. **Code Blocks** (`__tests__/unit/ui/code-block.unit.test.ts`)
   - US-023: View code blocks with syntax highlighting
   - Test code block detection, highlighting, language labels

8. **Message Timestamps** (`__tests__/unit/ui/message-timestamps.unit.test.ts`)
   - US-024: View timestamps on messages
   - Test timestamp display, formatting, accuracy

9. **Connection Status** (`__tests__/unit/ui/status-line.unit.test.ts`)
   - US-006: View agent connection status
   - Test status display, real-time updates, visual indicators

10. **Request Cancellation** (`__tests__/integration/ui/request-cancellation.integration.test.ts`)
    - US-020: Cancel request (Escape)
    - Test cancellation flow, state cleanup

#### Lower Priority (Polish)

11. **CLI Exit** (`__tests__/e2e/cli-exit.e2e.test.ts`)
    - US-021: Exit application (Ctrl+C)
    - Test clean shutdown, session saving

12. **Session Modes** (`__tests__/integration/ui/session-modes.integration.test.ts`)
    - US-025: Read-only mode
    - US-026: Auto mode
    - US-027: Full-access mode
    - Test mode enforcement (when tool system is ready)

---

## Test Utilities

### Available Utilities (`__tests__/utils/ink-test-helpers.ts`)

- `renderInk()` - Render Ink components with test terminal dimensions
- `setupSession()` - Set up test sessions in app store
- `waitFor()` - Wait for conditions with timeout
- `waitForText()` - Wait for text to appear in rendered output
- `flush()` - Flush async operations
- `cleanup()` - Reset app store state
- `createMockAgent()` - Create mock agent objects

### Usage Example

```typescript
import {
  cleanup,
  createMockAgent,
  renderInk,
  setupSession,
  waitFor,
} from "../../utils/ink-test-helpers";
import { Chat } from "@/ui/components/Chat";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

describe("MyFeature", () => {
  it("does something", () => {
    const sessionId = setupSession();
    const { lastFrame } = renderInk(
      <Chat sessionId={sessionId} agent={createMockAgent()} />
    );
    expect(lastFrame()).toContain("Expected text");
  });
});
```

---

## Test Execution

### Run All Tests
```bash
bun run test
```

### Run by Type
```bash
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only
bun run test:e2e           # E2E tests only
```

### Run Specific Test File
```bash
bun run test -- __tests__/unit/ui/chat-components.unit.test.ts
```

### Watch Mode
```bash
bun run test:watch
```

### Coverage Report
```bash
bun run test:coverage
```

---

## Test Data & Fixtures

### Creating Test Sessions

```typescript
import { setupSession } from "../../utils/ink-test-helpers";
import { SESSION_MODE } from "@/constants/session-modes";

const sessionId = setupSession({
  sessionId: "test-session-1",
  mode: SESSION_MODE.AUTO,
  agentId: "agent-1",
});
```

### Creating Mock Agents

```typescript
import { createMockAgent } from "../../utils/ink-test-helpers";

const agent = createMockAgent("agent-1", "Test Agent", "Description");
```

### Creating Test Messages

```typescript
import { useAppStore } from "@/store/app-store";
import { MessageIdSchema } from "@/types/domain";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";

const store = useAppStore.getState();
store.appendMessage({
  id: MessageIdSchema.parse("msg-1"),
  sessionId,
  role: "user",
  content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Hello" }],
  createdAt: Date.now(),
  isStreaming: false,
});
```

---

## Best Practices

1. **Always cleanup**: Use `afterEach(() => cleanup())` to prevent test pollution
2. **Use waitFor for async**: Don't use `setTimeout` - use `waitFor` instead
3. **Use setupSession**: Don't manually manipulate the store - use `setupSession` for consistency
4. **Use renderInk**: Use `renderInk` instead of raw `render` for consistent terminal dimensions
5. **Test behavior, not implementation**: Focus on what the component does, not how
6. **Mock external dependencies**: Mock ACP agents, file system, etc. for reliable tests
7. **Use descriptive test names**: Test names should clearly describe what they test
8. **Keep tests focused**: One test should verify one behavior

---

## Next Steps

1. ✅ Set up OpenTUI test renderer utilities
2. ✅ Document user stories
3. ✅ Create test plan
4. 🚧 Implement high-priority tests (message history, input history, session management)
5. 📋 Implement medium-priority tests (markdown, code blocks, timestamps)
6. 📋 Implement lower-priority tests (CLI exit, session modes)
7. 📋 Add E2E tests for full user journeys (when terminal automation is available)

---

*Last Updated: 2026-01-14*  
*Status: Active*

# Test Utilities

This directory contains shared test utilities for the TOADSTOOL test suite.

## OpenTUI Test Utilities

The `ink-test-helpers.ts` file provides utilities for testing OpenTUI components using a lightweight
React test renderer.

### Basic Usage

```typescript
import { renderInk, setupSession, waitFor, cleanup } from "../../utils/ink-test-helpers";
import { Chat } from "@/ui/components/Chat";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup(); // Clean up test state
});

describe("MyComponent", () => {
  it("renders correctly", () => {
    const { lastFrame } = renderInk(<MyComponent />);
    expect(lastFrame()).toContain("Expected text");
  });
});
```

### Available Utilities

#### `renderInk(element, options?)`

Renders an OpenTUI component with default test terminal dimensions.

```typescript
const { lastFrame, stdin, rerender, unmount } = renderInk(
  <MyComponent />,
  { width: 100, height: 30 } // optional
);
```

#### `setupSession(options?)`

Sets up a test session in the app store. Resets the store and creates a new session.

```typescript
const sessionId = setupSession({
  sessionId: "my-session", // optional, auto-generated if not provided
  mode: SESSION_MODE.AUTO, // optional, defaults to AUTO
  agentId: "agent-1", // optional, defaults to "agent-1"
});
```

#### `waitFor(condition, timeoutMs?, intervalMs?)`

Waits for a condition to become true.

```typescript
await waitFor(() => store.getMessages().length > 0, 500);
```

#### `waitForText(renderResult, text, timeoutMs?)`

Waits for text to appear in the last frame.

```typescript
const { lastFrame } = renderInk(<MyComponent />);
await waitForText({ lastFrame }, "Expected text");
```

#### `flush()`

Flushes pending async operations (useful for state updates).

```typescript
await flush(); // Wait for next tick
```

#### `cleanup()`

Resets the app store to clean state. Call in `afterEach` hooks.

```typescript
afterEach(() => {
  cleanup();
});
```

#### `createMockAgent(id?, name?, description?)`

Creates a mock agent object for testing.

```typescript
const agent = createMockAgent("agent-1", "Test Agent", "Description");
```

### Example: Testing User Input

```typescript
it("handles user input", () => {
  const sessionId = setupSession();
  const promptSpy = vi.fn();

  const { stdin, lastFrame } = renderInk(
    <Chat
      sessionId={sessionId}
      agent={createMockAgent()}
      client={{ prompt: promptSpy } as any}
    />
  );

  stdin.write("hello");
  stdin.write("\r");

  expect(promptSpy).toHaveBeenCalledWith("hello");
});
```

### Example: Testing Async State Updates

```typescript
it("updates state asynchronously", async () => {
  const sessionId = setupSession();
  const store = useAppStore.getState();

  // Trigger async action
  store.someAsyncAction();

  // Wait for state to update
  await waitFor(() => store.getState().someProperty === "expected");

  expect(store.getState().someProperty).toBe("expected");
});
```

### Best Practices

1. **Always cleanup**: Use `afterEach(() => cleanup())` to prevent test pollution
2. **Use waitFor for async**: Don't use `setTimeout` or `sleep` - use `waitFor` instead
3. **Use setupSession**: Don't manually manipulate the store - use `setupSession` for consistent test setup
4. **Use renderInk**: Use `renderInk` instead of raw `render` for consistent terminal dimensions
5. **Test behavior, not implementation**: Focus on what the component does, not how it does it

## References

- [React Test Renderer Documentation](https://react.dev/reference/react-test-renderer)
- [Vitest Documentation](https://vitest.dev)

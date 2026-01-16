import { SESSION_MODE } from "@/constants/session-modes";
import { type RenderResult, render } from "ink-testing-library";
import type React from "react";
import { useAppStore } from "../../src/store/app-store";
import {
  AgentIdSchema,
  MessageIdSchema,
  type SessionId,
  SessionIdSchema,
} from "../../src/types/domain";

/**
 * Test utilities for Ink component testing with ink-testing-library.
 * Provides common helpers for rendering, waiting, and setup/teardown.
 */

/**
 * Options for rendering Ink components in tests.
 */
export interface RenderOptions {
  /**
   * Terminal width (default: 80)
   */
  width?: number;
  /**
   * Terminal height (default: 24)
   */
  height?: number;
}

/**
 * Renders an Ink component with default test terminal dimensions.
 *
 * @example
 * ```ts
 * const { lastFrame, stdin } = renderInk(<MyComponent />);
 * expect(lastFrame()).toContain("Expected text");
 * ```
 */
export function renderInk(element: React.ReactElement, options: RenderOptions = {}): RenderResult {
  const { width = 80, height = 24 } = options;
  return render(element, { stdout: { columns: width, rows: height } });
}

/**
 * Waits for a condition to become true, with timeout.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 200)
 * @param intervalMs - Polling interval in milliseconds (default: 10)
 * @throws Error if timeout is reached
 *
 * @example
 * ```ts
 * await waitFor(() => store.getMessages().length > 0);
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs = 200,
  intervalMs = 10
): Promise<void> {
  const start = Date.now();
  while (true) {
    if (condition()) {
      return;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms. Condition never became true.`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Waits for text to appear in the last frame.
 *
 * @param renderResult - Result from renderInk()
 * @param text - Text to wait for
 * @param timeoutMs - Maximum time to wait (default: 200)
 *
 * @example
 * ```ts
 * const { lastFrame } = renderInk(<MyComponent />);
 * await waitForText({ lastFrame }, "Expected text");
 * ```
 */
export async function waitForText(
  renderResult: Pick<RenderResult, "lastFrame">,
  text: string,
  timeoutMs = 200
): Promise<void> {
  await waitFor(() => renderResult.lastFrame().includes(text), timeoutMs);
}

/**
 * Flushes pending async operations (useful for state updates).
 * Equivalent to `await new Promise(resolve => setTimeout(resolve, 0))`.
 */
export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Options for setting up a test session.
 */
export interface SetupSessionOptions {
  /**
   * Session ID (default: auto-generated)
   */
  sessionId?: string;
  /**
   * Session mode (default: SESSION_MODE.AUTO)
   */
  mode?: typeof SESSION_MODE.AUTO | typeof SESSION_MODE.READ_ONLY;
  /**
   * Agent ID (default: "agent-1")
   */
  agentId?: string;
}

/**
 * Sets up a test session in the app store.
 * Resets the store and creates a new session with the specified options.
 *
 * @param options - Session setup options
 * @returns The parsed SessionId
 *
 * @example
 * ```ts
 * const sessionId = setupSession({ mode: SESSION_MODE.READ_ONLY });
 * ```
 */
export function setupSession(options: SetupSessionOptions = {}): SessionId {
  const {
    sessionId = `test-session-${Date.now()}`,
    mode = SESSION_MODE.AUTO,
    agentId = "agent-1",
  } = options;

  const parsedSessionId = SessionIdSchema.parse(sessionId);
  const store = useAppStore.getState();

  // Reset store to clean state
  store.reset();

  // Set current session
  store.setCurrentSession(parsedSessionId);

  // Create session
  store.upsertSession({
    session: {
      id: parsedSessionId,
      agentId: AgentIdSchema.parse(agentId),
      messageIds: [],
      createdAt: 0,
      updatedAt: 0,
      mode,
    },
  });

  return parsedSessionId;
}

/**
 * Cleans up test state by resetting the app store.
 * Call this in afterEach hooks to prevent test pollution.
 *
 * @example
 * ```ts
 * afterEach(() => {
 *   cleanup();
 * });
 * ```
 */
export function cleanup(): void {
  const store = useAppStore.getState();
  store.reset();
}

/**
 * Creates a mock agent object for testing.
 *
 * @param id - Agent ID (default: "agent-1")
 * @param name - Agent name (default: "Test Agent")
 * @param description - Optional description
 * @returns Mock agent object
 */
export function createMockAgent(
  id = "agent-1",
  name = "Test Agent",
  description?: string
): { id: ReturnType<typeof AgentIdSchema.parse>; name: string; description?: string } {
  return {
    id: AgentIdSchema.parse(id),
    name,
    description,
  };
}

/**
 * Type guard to check if a value is a RenderResult from ink-testing-library.
 */
export function isRenderResult(value: unknown): value is RenderResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "lastFrame" in value &&
    "stdin" in value &&
    "rerender" in value &&
    "unmount" in value
  );
}

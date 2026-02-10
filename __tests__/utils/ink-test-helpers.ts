import { SESSION_MODE } from "@/constants/session-modes";
import type React from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { useAppStore } from "../../src/store/app-store";
import {
  AgentIdSchema,
  MessageIdSchema,
  type SessionId,
  SessionIdSchema,
} from "../../src/types/domain";
import { keyboardRuntime, terminalRuntime } from "./opentui-test-runtime";

/**
 * Test utilities for OpenTUI component testing.
 * Provides common helpers for rendering, waiting, and setup/teardown.
 */

const activeRenderers = new Set<ReactTestRenderer>();

/**
 * Options for rendering OpenTUI components in tests.
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
 * Renders a component with default test terminal dimensions.
 *
 * @example
 * ```ts
 * const { lastFrame, stdin } = renderInk(<MyComponent />);
 * expect(lastFrame()).toContain("Expected text");
 * ```
 */
export interface RenderResult {
  lastFrame: () => string;
  stdin: { write: (input: string) => void };
  rerender: (element: React.ReactElement) => void;
  unmount: () => void;
}

const extractText = (node: unknown): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("\n");
  if (typeof node === "object" && node) {
    const typedNode = node as {
      type?: string;
      props?: Record<string, unknown>;
      children?: unknown[];
    };

    const props = typedNode.props ?? {};
    switch (typedNode.type) {
      case "markdown":
      case "code":
        return typeof props.content === "string" ? props.content : "";
      case "diff":
        return typeof props.diff === "string" ? props.diff : "";
      case "input":
        if (typeof props.value === "string" && props.value.length > 0) {
          return props.value;
        }
        return typeof props.placeholder === "string" ? props.placeholder : "";
      case "textarea":
        if (typeof props.initialValue === "string" && props.initialValue.length > 0) {
          return props.initialValue;
        }
        return typeof props.placeholder === "string" ? props.placeholder : "";
      case "ascii-font":
        return typeof props.text === "string" ? props.text : "";
      case "select":
        return Array.isArray(props.options)
          ? props.options
              .map((option) => {
                if (!option || typeof option !== "object") return "";
                const label = (option as { label?: string }).label;
                const value = (option as { value?: string }).value;
                return label ?? value ?? "";
              })
              .filter((value) => value.length > 0)
              .join("\n")
          : "";
      default:
        break;
    }

    if (typedNode.children) {
      const separator = typedNode.type === "text" || typedNode.type === "span" ? "" : "\n";
      return typedNode.children.map(extractText).join(separator);
    }
  }
  return "";
};

const parseInput = (input: string): string[] => {
  const specialKeys: Record<string, string> = {
    "\r": "return",
    "\n": "linefeed",
    "\t": "tab",
    " ": "space",
    "\x1B": "escape",
    "\x1B[A": "up",
    "\x1B[B": "down",
    "\x1B[C": "right",
    "\x1B[D": "left",
  };

  if (specialKeys[input]) {
    return [specialKeys[input]];
  }

  return Array.from(input);
};

export function renderInk(element: React.ReactElement, options: RenderOptions = {}): RenderResult {
  const { width = 80, height = 24 } = options;
  terminalRuntime.set(width, height);

  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  activeRenderers.add(renderer);

  const lastFrame = () => extractText(renderer.toJSON());

  const stdin = {
    write: (input: string) => {
      parseInput(input).forEach((name) => {
        act(() => {
          keyboardRuntime.emit(name);
        });
      });
    },
  };

  const rerender = (nextElement: React.ReactElement) => {
    act(() => {
      renderer.update(nextElement);
    });
  };

  const unmount = () => {
    act(() => {
      renderer.unmount();
    });
    activeRenderers.delete(renderer);
  };

  return { lastFrame, stdin, rerender, unmount };
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
  activeRenderers.forEach((renderer) => {
    act(() => {
      renderer.unmount();
    });
  });
  activeRenderers.clear();
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
 * Type guard to check if a value is a renderInk result.
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

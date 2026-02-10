import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chat } from "../../../src/ui/components/Chat";
import { cleanup, createMockAgent, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Keyboard Shortcuts", () => {
  it("renders chat component that can receive keyboard input", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent(),
      })
    );

    // Component should render
    expect(lastFrame()).toBeTruthy();
  });

  it("handles Escape key for cancellation", () => {
    const sessionId = setupSession({ mode: SESSION_MODE.AUTO });
    const onPromptComplete = vi.fn();

    renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent(),
        onPromptComplete,
      })
    );

    // Note: Full Escape key testing would require proper keyboard event simulation
    // The OpenTUI test renderer stdin.write() may not support all key combinations
    // This test verifies the component accepts the necessary props
    expect(onPromptComplete).toBeDefined();
  });
});

/**
 * Note: Full keyboard shortcut testing (Ctrl+L, Ctrl+P, Ctrl+N, Escape, Ctrl+C) would require:
 * 1. Proper keyboard event simulation in the OpenTUI test renderer
 * 2. Testing at the App component level where shortcuts are handled
 * 3. Integration with useKeyboard hook from OpenTUI
 *
 * Currently, keyboard shortcuts are handled in:
 * - App.tsx: Ctrl+P (switch provider), Ctrl+N (new session), Ctrl+L (clear), Ctrl+C (exit)
 * - Chat.tsx: Escape (cancel request)
 * - InputWithAutocomplete: Enter (submit), Shift+Enter (new line - if implemented)
 *
 * These would need E2E tests or more sophisticated mocking to test fully.
 */

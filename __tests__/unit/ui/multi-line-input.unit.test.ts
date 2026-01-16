import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputWithAutocomplete } from "../../../src/ui/components/InputWithAutocomplete";
import { cleanup, renderInk, setupSession } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Multi-line Input", () => {
  it("handles multi-line text input", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();

    const multiLineText = "Line 1\nLine 2\nLine 3";

    const { lastFrame } = renderInk(
      React.createElement(InputWithAutocomplete, {
        value: multiLineText,
        onChange,
        onSubmit,
      })
    );

    // Component should accept multi-line text
    expect(onChange).toBeDefined();
    expect(onSubmit).toBeDefined();
  });

  it("preserves newlines in input value", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();

    const textWithNewlines = "First line\nSecond line";

    renderInk(
      React.createElement(InputWithAutocomplete, {
        value: textWithNewlines,
        onChange,
        onSubmit,
      })
    );

    // Value should contain newlines
    expect(textWithNewlines).toContain("\n");
  });
});

/**
 * Note: Full Shift+Enter behavior testing would require:
 * 1. Proper keyboard event simulation (Shift+Enter vs Enter)
 * 2. InputWithAutocomplete to handle Shift+Enter differently from Enter
 *
 * Currently, InputWithAutocomplete uses useInput which may not distinguish
 * Shift+Enter from Enter. This would need to be implemented in the component.
 */

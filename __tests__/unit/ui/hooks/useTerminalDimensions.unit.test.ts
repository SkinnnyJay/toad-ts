import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import React, { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInk } from "../../../utils/ink-test-helpers";

/**
 * Tests for useTerminalDimensions hook logic.
 * Since the hook depends on OpenTUI runtime, we test the core logic patterns here.
 */

describe("useTerminalDimensions logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("dimension clamping", () => {
    const MIN_ROWS = 10;
    const MIN_COLUMNS = 50;

    const clampDimensions = (rows: number, columns: number) => ({
      rows: Math.max(MIN_ROWS, rows),
      columns: Math.max(MIN_COLUMNS, columns),
    });

    it("clamps rows to minimum value", () => {
      expect(clampDimensions(5, 80)).toEqual({ rows: 10, columns: 80 });
    });

    it("clamps columns to minimum value", () => {
      expect(clampDimensions(24, 30)).toEqual({ rows: 24, columns: 50 });
    });

    it("clamps both dimensions when below minimum", () => {
      expect(clampDimensions(5, 30)).toEqual({ rows: 10, columns: 50 });
    });

    it("preserves dimensions above minimum", () => {
      expect(clampDimensions(40, 120)).toEqual({ rows: 40, columns: 120 });
    });
  });

  describe("throttle behavior", () => {
    it("throttles rapid updates", async () => {
      let updateCount = 0;
      let resizeTimer: NodeJS.Timeout | null = null;

      const handleResize = () => {
        if (resizeTimer) return;
        resizeTimer = setTimeout(() => {
          resizeTimer = null;
          updateCount++;
        }, TIMEOUT.THROTTLE_MS);
      };

      // Simulate rapid resize events
      handleResize();
      handleResize();
      handleResize();

      // Before throttle completes
      expect(updateCount).toBe(0);

      // After throttle delay
      await vi.advanceTimersByTimeAsync(TIMEOUT.THROTTLE_MS);
      expect(updateCount).toBe(1);
    });

    it("allows subsequent updates after throttle period", async () => {
      let updateCount = 0;
      let resizeTimer: NodeJS.Timeout | null = null;

      const handleResize = () => {
        if (resizeTimer) return;
        resizeTimer = setTimeout(() => {
          resizeTimer = null;
          updateCount++;
        }, TIMEOUT.THROTTLE_MS);
      };

      // First resize
      handleResize();
      await vi.advanceTimersByTimeAsync(TIMEOUT.THROTTLE_MS);
      expect(updateCount).toBe(1);

      // Second resize after throttle period
      handleResize();
      await vi.advanceTimersByTimeAsync(TIMEOUT.THROTTLE_MS);
      expect(updateCount).toBe(2);
    });
  });

  describe("default values", () => {
    it("uses UI constants for defaults", () => {
      expect(UI.TERMINAL_DEFAULT_ROWS).toBe(24);
      expect(UI.TERMINAL_DEFAULT_COLUMNS).toBe(80);
    });

    it("uses TIMEOUT constant for throttle", () => {
      expect(TIMEOUT.THROTTLE_MS).toBe(100);
    });
  });

  describe("change detection", () => {
    it("detects dimension changes", () => {
      const lastRows = 24;
      const lastCols = 80;

      const hasChanged = (newRows: number, newCols: number) => {
        return newRows !== lastRows || newCols !== lastCols;
      };

      expect(hasChanged(24, 80)).toBe(false);
      expect(hasChanged(30, 80)).toBe(true);
      expect(hasChanged(24, 100)).toBe(true);
      expect(hasChanged(30, 100)).toBe(true);
    });
  });
});

describe("useTerminalDimensions integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // This tests the actual hook in a minimal runtime context
  it("exports the hook correctly", async () => {
    const { useTerminalDimensions } = await import("@/ui/hooks/useTerminalDimensions");
    expect(typeof useTerminalDimensions).toBe("function");
  });

  it("hook returns expected shape", async () => {
    const { useTerminalDimensions } = await import("@/ui/hooks/useTerminalDimensions");

    // Create a test component that captures the hook result
    let capturedResult: { rows: number; columns: number } | null = null;

    function TestComponent() {
      const dimensions = useTerminalDimensions();
      useEffect(() => {
        capturedResult = dimensions;
      }, [dimensions]);
      return React.createElement("text", null, "test");
    }

    const { unmount } = renderInk(React.createElement(TestComponent));

    // Give React time to render
    await vi.advanceTimersByTimeAsync(0);

    expect(capturedResult).not.toBeNull();
    expect(capturedResult).toHaveProperty("rows");
    expect(capturedResult).toHaveProperty("columns");
    expect(typeof capturedResult?.rows).toBe("number");
    expect(typeof capturedResult?.columns).toBe("number");

    unmount();
  });
});

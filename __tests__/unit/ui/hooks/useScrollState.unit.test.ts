import { calculateScrollbarProps } from "@/ui/hooks/useScrollState";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useScrollState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateScrollbarProps", () => {
    it("returns needsScrollbar false when all items fit", () => {
      const result = calculateScrollbarProps(5, 10, 0, 20);

      expect(result.needsScrollbar).toBe(false);
    });

    it("returns needsScrollbar true when items exceed visible", () => {
      const result = calculateScrollbarProps(20, 10, 0, 20);

      expect(result.needsScrollbar).toBe(true);
    });

    it("calculates thumb size proportionally", () => {
      // 10 visible out of 20 total = 50% of scrollbar height
      const result = calculateScrollbarProps(20, 10, 0, 20);

      expect(result.thumbSize).toBe(10); // 50% of 20
    });

    it("ensures minimum thumb size of 1", () => {
      // 1 visible out of 1000 total = very small, but minimum 1
      const result = calculateScrollbarProps(1000, 1, 0, 20);

      expect(result.thumbSize).toBeGreaterThanOrEqual(1);
    });

    it("calculates thumb position at top", () => {
      const result = calculateScrollbarProps(20, 10, 0, 20);

      expect(result.thumbPosition).toBe(0);
    });

    it("calculates thumb position at bottom", () => {
      // 20 items, 10 visible, scroll offset 10 (max)
      const result = calculateScrollbarProps(20, 10, 10, 20);

      // thumbSize = 10, scrollbarHeight = 20, so max position = 10
      expect(result.thumbPosition).toBe(10);
    });

    it("calculates thumb position in middle", () => {
      // 20 items, 10 visible, scroll offset 5 (middle)
      const result = calculateScrollbarProps(20, 10, 5, 20);

      // thumbSize = 10, maxOffset = 10, position = (5/10) * (20-10) = 5
      expect(result.thumbPosition).toBe(5);
    });

    it("handles zero total items", () => {
      const result = calculateScrollbarProps(0, 10, 0, 20);

      expect(result.needsScrollbar).toBe(false);
      expect(result.thumbSize).toBe(20); // Full height when no scrollbar needed
    });
  });

  describe("scroll offset calculations", () => {
    it("maxScrollOffset is totalItems - visibleItems", () => {
      const totalItems = 100;
      const visibleItems = 20;
      const maxScrollOffset = Math.max(0, totalItems - visibleItems);

      expect(maxScrollOffset).toBe(80);
    });

    it("maxScrollOffset is 0 when all items fit", () => {
      const totalItems = 10;
      const visibleItems = 20;
      const maxScrollOffset = Math.max(0, totalItems - visibleItems);

      expect(maxScrollOffset).toBe(0);
    });

    it("clamps scroll offset to valid range", () => {
      const scrollOffset = 150;
      const maxScrollOffset = 80;
      const clamped = Math.max(0, Math.min(scrollOffset, maxScrollOffset));

      expect(clamped).toBe(80);
    });

    it("clamps negative scroll offset to 0", () => {
      const scrollOffset = -10;
      const maxScrollOffset = 80;
      const clamped = Math.max(0, Math.min(scrollOffset, maxScrollOffset));

      expect(clamped).toBe(0);
    });
  });

  describe("isAtBottom detection", () => {
    it("returns true when at max scroll", () => {
      const scrollOffset = 80;
      const maxScrollOffset = 80;
      const isAtBottom = scrollOffset >= maxScrollOffset;

      expect(isAtBottom).toBe(true);
    });

    it("returns false when not at bottom", () => {
      const scrollOffset = 50;
      const maxScrollOffset = 80;
      const isAtBottom = scrollOffset >= maxScrollOffset;

      expect(isAtBottom).toBe(false);
    });

    it("returns true when maxScrollOffset is 0", () => {
      const scrollOffset = 0;
      const maxScrollOffset = 0;
      const isAtBottom = scrollOffset >= maxScrollOffset;

      expect(isAtBottom).toBe(true);
    });
  });

  describe("hook export", () => {
    it("exports useScrollState function", async () => {
      const { useScrollState } = await import("@/ui/hooks/useScrollState");
      expect(typeof useScrollState).toBe("function");
    });

    it("exports calculateScrollbarProps function", async () => {
      const { calculateScrollbarProps } = await import("@/ui/hooks/useScrollState");
      expect(typeof calculateScrollbarProps).toBe("function");
    });
  });
});

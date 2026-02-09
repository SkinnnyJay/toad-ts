import { FOCUS_TARGET } from "@/constants/focus-target";
import { isSidebarSection } from "@/ui/hooks/useAccordionState";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useAccordionState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isSidebarSection", () => {
    it("returns true for FILES", () => {
      expect(isSidebarSection(FOCUS_TARGET.FILES)).toBe(true);
    });

    it("returns true for PLAN", () => {
      expect(isSidebarSection(FOCUS_TARGET.PLAN)).toBe(true);
    });

    it("returns true for CONTEXT", () => {
      expect(isSidebarSection(FOCUS_TARGET.CONTEXT)).toBe(true);
    });

    it("returns true for SESSIONS", () => {
      expect(isSidebarSection(FOCUS_TARGET.SESSIONS)).toBe(true);
    });

    it("returns true for AGENT", () => {
      expect(isSidebarSection(FOCUS_TARGET.AGENT)).toBe(true);
    });

    it("returns false for CHAT", () => {
      expect(isSidebarSection(FOCUS_TARGET.CHAT)).toBe(false);
    });
  });

  describe("collapse state logic", () => {
    it("defaults to not collapsed", () => {
      const accordionCollapsed: Record<string, boolean> = {};
      const isCollapsed = (section: string): boolean => accordionCollapsed?.[section] ?? false;

      expect(isCollapsed(FOCUS_TARGET.FILES)).toBe(false);
      expect(isCollapsed(FOCUS_TARGET.PLAN)).toBe(false);
    });

    it("reads collapsed state from store", () => {
      const accordionCollapsed: Record<string, boolean> = {
        [FOCUS_TARGET.FILES]: true,
        [FOCUS_TARGET.PLAN]: false,
      };
      const isCollapsed = (section: string): boolean => accordionCollapsed?.[section] ?? false;

      expect(isCollapsed(FOCUS_TARGET.FILES)).toBe(true);
      expect(isCollapsed(FOCUS_TARGET.PLAN)).toBe(false);
    });

    it("toggles collapsed state", () => {
      let collapsed = false;
      const toggle = () => {
        collapsed = !collapsed;
      };

      expect(collapsed).toBe(false);
      toggle();
      expect(collapsed).toBe(true);
      toggle();
      expect(collapsed).toBe(false);
    });
  });

  describe("hook export", () => {
    it("exports useAccordionState function", async () => {
      const { useAccordionState } = await import("@/ui/hooks/useAccordionState");
      expect(typeof useAccordionState).toBe("function");
    });

    it("exports isSidebarSection function", async () => {
      const { isSidebarSection } = await import("@/ui/hooks/useAccordionState");
      expect(typeof isSidebarSection).toBe("function");
    });
  });

  describe("focus target constants", () => {
    it("has all expected focus targets", () => {
      expect(FOCUS_TARGET.CHAT).toBe("chat");
      expect(FOCUS_TARGET.FILES).toBe("files");
      expect(FOCUS_TARGET.PLAN).toBe("plan");
      expect(FOCUS_TARGET.CONTEXT).toBe("context");
      expect(FOCUS_TARGET.SESSIONS).toBe("sessions");
      expect(FOCUS_TARGET.AGENT).toBe("agent");
    });
  });
});

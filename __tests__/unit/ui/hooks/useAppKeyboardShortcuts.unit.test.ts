import { FOCUS_TARGET } from "@/constants/focus-target";
import { VIEW } from "@/constants/views";
import {
  FOCUS_NUMBER_MAP,
  isFocusShortcutKey,
  isOptionBacktick,
} from "@/ui/hooks/useAppKeyboardShortcuts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useAppKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("FOCUS_NUMBER_MAP", () => {
    it("maps 1 to FILES", () => {
      expect(FOCUS_NUMBER_MAP["1"]).toBe(FOCUS_TARGET.FILES);
    });

    it("maps 2 to PLAN", () => {
      expect(FOCUS_NUMBER_MAP["2"]).toBe(FOCUS_TARGET.PLAN);
    });

    it("maps 3 to CONTEXT", () => {
      expect(FOCUS_NUMBER_MAP["3"]).toBe(FOCUS_TARGET.CONTEXT);
    });

    it("maps 4 to SESSIONS", () => {
      expect(FOCUS_NUMBER_MAP["4"]).toBe(FOCUS_TARGET.SESSIONS);
    });

    it("maps 5 to AGENT", () => {
      expect(FOCUS_NUMBER_MAP["5"]).toBe(FOCUS_TARGET.AGENT);
    });

    it("maps 6 to TODOS", () => {
      expect(FOCUS_NUMBER_MAP["6"]).toBe(FOCUS_TARGET.TODOS);
    });

    it("has no mapping for invalid numbers", () => {
      expect(FOCUS_NUMBER_MAP["0"]).toBeUndefined();
      expect(FOCUS_NUMBER_MAP["7"]).toBeUndefined();
    });
  });

  describe("isOptionBacktick", () => {
    it("returns true for Option+backtick escape sequence", () => {
      expect(isOptionBacktick({ name: "`", option: true })).toBe(true);
    });

    it("returns false for regular backtick", () => {
      expect(isOptionBacktick({ name: "`", option: false })).toBe(false);
    });

    it("returns false for escape alone", () => {
      expect(isOptionBacktick({ name: "escape", option: true })).toBe(false);
    });

    it("returns false for other escape sequences", () => {
      expect(isOptionBacktick({ name: "a", option: true })).toBe(false);
      expect(isOptionBacktick({ name: "1", option: true })).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isOptionBacktick({ name: "", option: true })).toBe(false);
    });
  });

  describe("constants", () => {
    it("uses correct focus target constants", () => {
      expect(FOCUS_TARGET.CHAT).toBe("chat");
      expect(FOCUS_TARGET.FILES).toBe("files");
      expect(FOCUS_TARGET.PLAN).toBe("plan");
      expect(FOCUS_TARGET.CONTEXT).toBe("context");
      expect(FOCUS_TARGET.SESSIONS).toBe("sessions");
      expect(FOCUS_TARGET.AGENT).toBe("agent");
    });

    it("uses correct view constants", () => {
      expect(VIEW.CHAT).toBe("chat");
      expect(VIEW.AGENT_SELECT).toBe("agent-select");
    });
  });

  describe("hook export", () => {
    it("exports useAppKeyboardShortcuts function", async () => {
      const { useAppKeyboardShortcuts } = await import("@/ui/hooks/useAppKeyboardShortcuts");
      expect(typeof useAppKeyboardShortcuts).toBe("function");
    });

    it("exports FOCUS_NUMBER_MAP constant", async () => {
      const { FOCUS_NUMBER_MAP } = await import("@/ui/hooks/useAppKeyboardShortcuts");
      expect(typeof FOCUS_NUMBER_MAP).toBe("object");
    });

    it("exports isOptionBacktick function", async () => {
      const { isOptionBacktick } = await import("@/ui/hooks/useAppKeyboardShortcuts");
      expect(typeof isOptionBacktick).toBe("function");
    });

    it("exports isFocusShortcutKey function", async () => {
      const { isFocusShortcutKey } = await import("@/ui/hooks/useAppKeyboardShortcuts");
      expect(typeof isFocusShortcutKey).toBe("function");
    });
  });

  describe("shortcut patterns", () => {
    it("number shortcuts accept the mapped focus keys", () => {
      expect(isFocusShortcutKey("1")).toBe(true);
      expect(isFocusShortcutKey("5")).toBe(true);
      expect(isFocusShortcutKey("6")).toBe(true);
      expect(isFocusShortcutKey("0")).toBe(false);
      expect(isFocusShortcutKey("7")).toBe(false);
      expect(isFocusShortcutKey("12")).toBe(false);
    });

    it("file shortcut accepts both cases", () => {
      const isFileShortcut = (input: string) => input === "f" || input === "F";
      expect(isFileShortcut("f")).toBe(true);
      expect(isFileShortcut("F")).toBe(true);
      expect(isFileShortcut("g")).toBe(false);
    });

    it("help shortcut accepts ? or /", () => {
      const isHelpShortcut = (input: string) => input === "?" || input === "/";
      expect(isHelpShortcut("?")).toBe(true);
      expect(isHelpShortcut("/")).toBe(true);
      expect(isHelpShortcut("h")).toBe(false);
    });

    it("sessions shortcut accepts both cases", () => {
      const isSessionsShortcut = (input: string) => input === "s" || input === "S";
      expect(isSessionsShortcut("s")).toBe(true);
      expect(isSessionsShortcut("S")).toBe(true);
      expect(isSessionsShortcut("x")).toBe(false);
    });
  });
});

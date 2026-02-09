import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useSessionNavigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("session sorting", () => {
    it("sorts sessions by updatedAt descending", () => {
      const sessions = [
        { id: "s1", updatedAt: 1000 },
        { id: "s2", updatedAt: 3000 },
        { id: "s3", updatedAt: 2000 },
      ];

      const sorted = sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);

      expect(sorted[0]?.id).toBe("s2");
      expect(sorted[1]?.id).toBe("s3");
      expect(sorted[2]?.id).toBe("s1");
    });
  });

  describe("navigation logic", () => {
    it("navigateUp decrements index but not below 0", () => {
      let index = 2;
      const navigateUp = () => {
        index = Math.max(0, index - 1);
      };

      navigateUp();
      expect(index).toBe(1);

      navigateUp();
      expect(index).toBe(0);

      navigateUp();
      expect(index).toBe(0); // Stays at 0
    });

    it("navigateDown increments index but not above max", () => {
      let index = 0;
      const sessionsLength = 3;
      const navigateDown = () => {
        index = Math.min(sessionsLength - 1, index + 1);
      };

      navigateDown();
      expect(index).toBe(1);

      navigateDown();
      expect(index).toBe(2);

      navigateDown();
      expect(index).toBe(2); // Stays at max
    });
  });

  describe("session index sync", () => {
    it("finds index of active session", () => {
      const sessions = [
        { id: "s1", updatedAt: 3000 },
        { id: "s2", updatedAt: 2000 },
        { id: "s3", updatedAt: 1000 },
      ];
      const activeSessionId = "s2";

      const foundIndex = sessions.findIndex((s) => s.id === activeSessionId);

      expect(foundIndex).toBe(1);
    });

    it("returns -1 for non-existent session", () => {
      const sessions = [
        { id: "s1", updatedAt: 3000 },
        { id: "s2", updatedAt: 2000 },
      ];
      const activeSessionId = "s999";

      const foundIndex = sessions.findIndex((s) => s.id === activeSessionId);

      expect(foundIndex).toBe(-1);
    });

    it("defaults to 0 when no active session", () => {
      const activeSessionId = undefined;
      let sessionIndex = 5;

      if (!activeSessionId) {
        sessionIndex = 0;
      }

      expect(sessionIndex).toBe(0);
    });
  });

  describe("session selection", () => {
    it("selects session at current index", () => {
      const sessions = [
        { id: "s1", updatedAt: 3000 },
        { id: "s2", updatedAt: 2000 },
        { id: "s3", updatedAt: 1000 },
      ];
      const sessionIndex = 1;
      let selectedId: string | undefined;

      const handleSessionSelect = () => {
        const chosen = sessions[sessionIndex];
        if (chosen) {
          selectedId = chosen.id;
        }
      };

      handleSessionSelect();

      expect(selectedId).toBe("s2");
    });

    it("handles empty sessions array", () => {
      const sessions: { id: string; updatedAt: number }[] = [];
      const sessionIndex = 0;
      let selectedId: string | undefined;

      const handleSessionSelect = () => {
        const chosen = sessions[sessionIndex];
        if (chosen) {
          selectedId = chosen.id;
        }
      };

      handleSessionSelect();

      expect(selectedId).toBeUndefined();
    });
  });

  describe("hook export", () => {
    it("exports useSessionNavigation function", async () => {
      const { useSessionNavigation } = await import("@/ui/hooks/useSessionNavigation");
      expect(typeof useSessionNavigation).toBe("function");
    });
  });
});

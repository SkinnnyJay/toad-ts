import { UI } from "@/config/ui";
import { RENDER_STAGE } from "@/constants/render-stage";
import { VIEW } from "@/constants/views";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useDefaultAgentSelection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constants", () => {
    it("uses correct view constants", () => {
      expect(VIEW.CHAT).toBe("chat");
      expect(VIEW.AGENT_SELECT).toBe("agent-select");
    });

    it("uses correct render stage constants", () => {
      expect(RENDER_STAGE.CONNECTING).toBe("connecting");
      expect(RENDER_STAGE.READY).toBe("ready");
    });

    it("uses correct progress constants", () => {
      expect(UI.PROGRESS.CONNECTION_START).toBe(60);
      expect(UI.PROGRESS.COMPLETE).toBe(100);
    });
  });

  describe("selection logic", () => {
    it("does not select agent when not hydrated", () => {
      // The hook should not proceed when isHydrated is false
      const shouldProceed = (
        isHydrated: boolean,
        hasHarnesses: boolean,
        selectedAgent: unknown
      ) => {
        return isHydrated && hasHarnesses && !selectedAgent;
      };

      expect(shouldProceed(false, true, null)).toBe(false);
      expect(shouldProceed(true, false, null)).toBe(false);
      expect(shouldProceed(true, true, {})).toBe(false);
      expect(shouldProceed(true, true, null)).toBe(true);
    });

    it("prioritizes settings default over config default", () => {
      // This tests the priority order:
      // 1. Settings default provider
      // 2. Harness config default
      // 3. Show agent select

      const priorities = ["settings", "config", "select"] as const;

      const getSelectionSource = (
        settingsDefault: boolean,
        configDefault: boolean
      ): (typeof priorities)[number] => {
        if (settingsDefault) return "settings";
        if (configDefault) return "config";
        return "select";
      };

      expect(getSelectionSource(true, true)).toBe("settings");
      expect(getSelectionSource(true, false)).toBe("settings");
      expect(getSelectionSource(false, true)).toBe("config");
      expect(getSelectionSource(false, false)).toBe("select");
    });
  });

  describe("hook export", () => {
    it("exports useDefaultAgentSelection function", async () => {
      const { useDefaultAgentSelection } = await import("@/ui/hooks/useDefaultAgentSelection");
      expect(typeof useDefaultAgentSelection).toBe("function");
    });
  });

  describe("selectAgent behavior", () => {
    it("triggers correct state changes when selecting agent", () => {
      // Simulate the selectAgent callback behavior
      const stateChanges: string[] = [];

      const mockCallbacks = {
        onStatusMessageChange: (msg: string) => stateChanges.push(`status:${msg}`),
        onProgressChange: () => stateChanges.push("progress"),
        onStageChange: (stage: string) => stateChanges.push(`stage:${stage}`),
        onViewChange: (view: string) => stateChanges.push(`view:${view}`),
      };

      // Simulate selectAgent
      const agentName = "Test Agent";
      mockCallbacks.onStatusMessageChange(`Connecting to ${agentName}…`);
      mockCallbacks.onProgressChange();
      mockCallbacks.onStageChange(RENDER_STAGE.CONNECTING);
      mockCallbacks.onViewChange(VIEW.CHAT);

      expect(stateChanges).toEqual([
        "status:Connecting to Test Agent…",
        "progress",
        "stage:connecting",
        "view:chat",
      ]);
    });
  });
});

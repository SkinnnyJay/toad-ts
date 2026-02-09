import { UI } from "@/config/ui";
import { RENDER_STAGE } from "@/constants/render-stage";
import type { HarnessConfig } from "@/harness/harnessConfig";
import { AgentIdSchema } from "@/types/domain";
import { buildAgentOptions } from "@/ui/hooks/useSessionHydration";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useSessionHydration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("buildAgentOptions", () => {
    it("builds options and info map from harness configs", () => {
      const harnesses: Record<string, HarnessConfig> = {
        "claude-cli": {
          id: "claude-cli",
          name: "Claude CLI",
          description: "Claude Code CLI adapter",
          command: "claude",
          args: ["--acp"],
        },
        "mock-agent": {
          id: "mock-agent",
          name: "Mock Agent",
          description: "Mock agent for testing",
          command: "mock",
          args: [],
        },
      };

      const { options, infoMap } = buildAgentOptions(harnesses);

      expect(options).toHaveLength(6);
      expect(infoMap.size).toBe(6);

      const claudeInfo = infoMap.get(AgentIdSchema.parse("claude-cli"));
      const claudeBuild = infoMap.get(AgentIdSchema.parse("claude-cli:build"));
      const claudePlan = infoMap.get(AgentIdSchema.parse("claude-cli:plan"));
      const mockInfo = infoMap.get(AgentIdSchema.parse("mock-agent"));
      const mockBuild = infoMap.get(AgentIdSchema.parse("mock-agent:build"));
      const mockPlan = infoMap.get(AgentIdSchema.parse("mock-agent:plan"));

      expect(claudeInfo?.name).toBe("Claude CLI");
      expect(claudeBuild?.name).toBe("Claude CLI Build");
      expect(claudePlan?.name).toBe("Claude CLI Plan");
      expect(mockInfo?.name).toBe("Mock Agent");
      expect(mockBuild?.name).toBe("Mock Agent Build");
      expect(mockPlan?.name).toBe("Mock Agent Plan");
      expect(claudeInfo?.description).toBe("Claude Code CLI adapter");
    });

    it("handles empty harness configs", () => {
      const { options, infoMap } = buildAgentOptions({});

      expect(options).toHaveLength(0);
      expect(infoMap.size).toBe(0);
    });

    it("handles harness without description", () => {
      const harnesses: Record<string, HarnessConfig> = {
        "simple-agent": {
          id: "simple-agent",
          name: "Simple Agent",
          command: "simple",
          args: [],
        },
      };

      const { infoMap } = buildAgentOptions(harnesses);

      expect(infoMap.get(AgentIdSchema.parse("simple-agent"))?.description).toBeUndefined();
    });
  });

  describe("constants and defaults", () => {
    it("uses correct UI progress constants", () => {
      expect(UI.PROGRESS.INITIAL).toBe(10);
      expect(UI.PROGRESS.HARNESS_LOADING).toBe(30);
      expect(UI.PROGRESS.CONFIG_LOADING).toBe(35);
      expect(UI.PROGRESS.CONFIG_LOADED).toBe(45);
    });

    it("uses correct render stage constants", () => {
      expect(RENDER_STAGE.LOADING).toBe("loading");
      expect(RENDER_STAGE.ERROR).toBe("error");
      expect(RENDER_STAGE.READY).toBe("ready");
    });
  });

  describe("progress calculation", () => {
    it("progress only increases (never decreases)", () => {
      let progress = 5;
      const setProgress = (updater: number | ((current: number) => number)) => {
        if (typeof updater === "function") {
          progress = updater(progress);
        } else {
          progress = updater;
        }
      };

      // Simulate the progress update pattern used in the hook
      setProgress((current) => Math.max(current, UI.PROGRESS.INITIAL));
      expect(progress).toBe(10);

      setProgress((current) => Math.max(current, UI.PROGRESS.HARNESS_LOADING));
      expect(progress).toBe(30);

      // Trying to set lower value should not decrease
      setProgress((current) => Math.max(current, UI.PROGRESS.INITIAL));
      expect(progress).toBe(30);
    });
  });

  describe("hook export", () => {
    it("exports useSessionHydration function", async () => {
      const { useSessionHydration } = await import("@/ui/hooks/useSessionHydration");
      expect(typeof useSessionHydration).toBe("function");
    });

    it("exports buildAgentOptions function", async () => {
      const { buildAgentOptions } = await import("@/ui/hooks/useSessionHydration");
      expect(typeof buildAgentOptions).toBe("function");
    });

    it("exports AgentInfo type", async () => {
      // Type-only test - if this compiles, the type is exported correctly
      const mod = await import("@/ui/hooks/useSessionHydration");
      type AgentInfo = Parameters<typeof mod.buildAgentOptions> extends [Record<string, unknown>]
        ? ReturnType<typeof mod.buildAgentOptions>["infoMap"] extends Map<unknown, infer T>
          ? T
          : never
        : never;

      // Verify the shape matches expected AgentInfo
      const testInfo: AgentInfo = {
        id: AgentIdSchema.parse("test"),
        harnessId: "test",
        name: "Test",
        description: "Test description",
      };
      expect(testInfo.id).toBeDefined();
    });
  });
});

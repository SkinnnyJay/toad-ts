import {
  cycleModel,
  cycleModelReverse,
  isThinkingModel,
  toggleThinkingVariant,
} from "@/core/model-variant";
import { describe, expect, it } from "vitest";

describe("ModelVariant", () => {
  describe("isThinkingModel", () => {
    it("should identify thinking models", () => {
      expect(isThinkingModel("claude-sonnet-4-20250514")).toBe(true);
      expect(isThinkingModel("o3")).toBe(true);
    });

    it("should reject non-thinking models", () => {
      expect(isThinkingModel("gpt-4o")).toBe(false);
      expect(isThinkingModel("gpt-4o-mini")).toBe(false);
    });
  });

  describe("toggleThinkingVariant", () => {
    it("should toggle thinking for supported models", () => {
      const result = toggleThinkingVariant({
        modelId: "claude-sonnet-4-20250514",
        thinking: false,
      });
      expect(result).not.toBeNull();
      expect(result?.thinking).toBe(true);
    });

    it("should return null for non-thinking models", () => {
      const result = toggleThinkingVariant({ modelId: "gpt-4o", thinking: false });
      expect(result).toBeNull();
    });
  });

  describe("cycleModel", () => {
    it("should cycle through recent models", () => {
      const recent = ["model-a", "model-b", "model-c"];
      expect(cycleModel("model-a", recent)).toBe("model-b");
      expect(cycleModel("model-b", recent)).toBe("model-c");
      expect(cycleModel("model-c", recent)).toBe("model-a");
    });

    it("should return first model for unknown current", () => {
      expect(cycleModel("unknown", ["model-a"])).toBe("model-a");
    });

    it("should return null for empty list", () => {
      expect(cycleModel("any", [])).toBeNull();
    });
  });

  describe("cycleModelReverse", () => {
    it("should cycle backward", () => {
      const recent = ["model-a", "model-b", "model-c"];
      expect(cycleModelReverse("model-c", recent)).toBe("model-b");
      expect(cycleModelReverse("model-a", recent)).toBe("model-c");
    });
  });
});

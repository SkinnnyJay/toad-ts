import { LIMIT } from "@/config/limits";
import { describe, expect, it } from "vitest";

describe("useContextStats", () => {
  it("exports hook", async () => {
    const { useContextStats } = await import("@/ui/hooks/useContextStats");
    expect(typeof useContextStats).toBe("function");
  });

  it("defines context budget constants", () => {
    expect(LIMIT.CONTEXT_TOKEN_BUDGET).toBeGreaterThan(0);
    expect(LIMIT.CONTEXT_WARNING_RATIO).toBeGreaterThan(0);
  });
});

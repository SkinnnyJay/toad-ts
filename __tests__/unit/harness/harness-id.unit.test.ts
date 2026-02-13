import { isCanonicalHarnessId, normalizeHarnessId } from "@/harness/harness-id";
import { describe, expect, it } from "vitest";

describe("harness-id utilities", () => {
  it("normalizes harness ids by trimming surrounding whitespace", () => {
    expect(normalizeHarnessId(" cursor-cli ")).toBe("cursor-cli");
  });

  it("returns true for canonical harness ids", () => {
    expect(isCanonicalHarnessId("cursor-cli")).toBe(true);
  });

  it("returns false for padded or blank harness ids", () => {
    expect(isCanonicalHarnessId(" cursor-cli ")).toBe(false);
    expect(isCanonicalHarnessId("   ")).toBe(false);
  });
});

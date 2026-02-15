import { normalizeRoutePathname } from "@/server/pathname-normalization";
import { describe, expect, it } from "vitest";

describe("normalizeRoutePathname", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeRoutePathname(" /api/config ")).toBe("/api/config");
  });

  it("strips query suffix from pathname", () => {
    expect(normalizeRoutePathname("/api/config?view=compact")).toBe("/api/config");
  });

  it("strips hash suffix from pathname", () => {
    expect(normalizeRoutePathname("/api/config#summary")).toBe("/api/config");
  });

  it("strips suffix from the earliest query/hash delimiter", () => {
    expect(normalizeRoutePathname("/api/config#summary?view=compact")).toBe("/api/config");
  });
});
